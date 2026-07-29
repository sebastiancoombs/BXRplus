import { corsHeaders } from "../_shared/cors.ts";
import { userClient } from "../_shared/supabase.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const MODEL = Deno.env.get("OPENAI_NOTES_MODEL") ?? "gpt-4o-mini";

type Body = {
  mode: "draft" | "edit";
  clientId: string;
  noteId?: string | null;
  quickNotes?: string;
  currentDraft?: string;
  instruction?: string;
  insuranceId?: string | null;
  cptTemplateId?: string | null;
  cptCode?: string | null;
  sections?: Record<string, string | undefined>;
  noteCards?: Array<{ id?: string; body: string; zone: string; sort_order?: number }>;
  classifyZones?: string[];
  classifyZoneOptions?: Array<{ id: string; label: string; source?: string; templateId?: string | null }>;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!OPENAI_API_KEY) return json({ error: "OPENAI_API_KEY is not configured" }, 500);

    const supa = userClient(req);
    const { data: userData } = await supa.auth.getUser();
    if (!userData?.user) return json({ error: "not authenticated" }, 401);

    const body = (await req.json()) as Body;
    if (!body.clientId) return json({ error: "clientId is required" }, 400);

    const { data: client, error: clientError } = await supa
      .from("clients")
      .select("id, full_name, balance, insurance_id")
      .eq("id", body.clientId)
      .single();
    if (clientError || !client) return json({ error: "client not found" }, 404);

    const templateId = body.cptTemplateId ?? null;
    const insuranceId = body.insuranceId ?? client.insurance_id ?? null;

    const [pastNotesRes, transactionsRes, linkedGoalsRes, insuranceRes, templateRes] = await Promise.all([
      supa
        .from("session_notes")
        .select("service_date, title, quick_notes, insurance_note, status")
        .eq("client_id", body.clientId)
        .neq("id", body.noteId ?? "00000000-0000-0000-0000-000000000000")
        .order("service_date", { ascending: false })
        .limit(5),
      supa
        .from("transactions")
        .select("type, amount, note, created_at, behavior:behaviors(name), reward:rewards(name)")
        .eq("client_id", body.clientId)
        .order("created_at", { ascending: false })
        .limit(25),
      body.noteId
        ? supa
          .from("session_note_clinical_goals")
          .select("goal:clinical_goals(title, description, domain, target_text, mastery_criteria)")
          .eq("note_id", body.noteId)
        : Promise.resolve({ data: [] }),
      insuranceId ? supa.from("insurance_payers").select("*").eq("id", insuranceId).maybeSingle() : Promise.resolve({ data: null }),
      templateId
        ? supa.from("insurance_cpt_templates").select("*").eq("id", templateId).maybeSingle()
        : body.cptCode && insuranceId
          ? supa.from("insurance_cpt_templates").select("*").eq("insurance_id", insuranceId).eq("cpt_code", body.cptCode).maybeSingle()
          : Promise.resolve({ data: null }),
    ]);

    const linkedGoals = (linkedGoalsRes.data ?? []).map((row: any) => row.goal).filter(Boolean);

    const prompt = body.mode === "edit"
      ? editPrompt(client, pastNotesRes.data ?? [], transactionsRes.data ?? [], linkedGoals, body, insuranceRes.data, templateRes.data)
      : draftPrompt(client, pastNotesRes.data ?? [], transactionsRes.data ?? [], linkedGoals, body, insuranceRes.data, templateRes.data);

    const zoneOptions = normalizeZoneOptions(body);
    const wantsClassification = body.mode === "draft" && Array.isArray(body.noteCards) && body.noteCards.some((card) => card.zone === "Quick notes") && zoneOptions.length > 0;

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: wantsClassification
              ? "You draft ABA session notes for clinician review and classify raw observation cards into provided template zones. Be clinically clear, payer-compliant, objective, and conservative. Follow the supplied insurance and CPT template rules exactly. Never invent events, diagnoses, times, goals, CPT codes, names, trends, percentages, or outcomes not present in the source data. Return valid JSON only."
              : "You draft ABA session notes for clinician review. Be clinically clear, payer-compliant, objective, and conservative. Follow the supplied insurance and CPT template rules exactly. Never invent events, diagnoses, times, goals, CPT codes, names, trends, percentages, or outcomes not present in the source data. If something is missing, write a concise placeholder like [add duration] or omit it.",
          },
          { role: "user", content: prompt },
        ],
        ...(wantsClassification ? {
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "bxrplus_note_generation",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                required: ["cardZones", "text"],
                properties: {
                  cardZones: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: ["id", "zoneId", "zone"],
                      properties: {
                        id: { type: "string" },
                        zoneId: { type: "string" },
                        zone: { type: "string" },
                      },
                    },
                  },
                  text: { type: "string" },
                },
              },
            },
          },
        } : {}),
      }),
    });

    if (!aiRes.ok) {
      const detail = await aiRes.text();
      return json({ error: "AI request failed", detail }, 502);
    }

    const payload = await aiRes.json();
    const rawText = payload?.choices?.[0]?.message?.content?.trim();
    if (!rawText) return json({ error: "AI returned an empty note" }, 502);

    if (wantsClassification) {
      const parsed = parseJsonObject(rawText);
      const text = typeof parsed?.text === "string" ? parsed.text.trim() : rawText;
      const allowedZoneIds = new Set(zoneOptions.map((zone) => zone.id));
      const allowedLabelsById = new Map(zoneOptions.map((zone) => [zone.id, zone.label]));
      const cardZones = Array.isArray(parsed?.cardZones)
        ? parsed.cardZones
          .filter((item: any) => typeof item?.id === "string" && typeof item?.zoneId === "string" && allowedZoneIds.has(item.zoneId))
          .map((item: any) => ({ id: item.id, zoneId: item.zoneId, zone: allowedLabelsById.get(item.zoneId) }))
        : [];
      return json({ text, cardZones, zoneOptions });
    }

    return json({ text: rawText });
  } catch (err) {
    console.error("generate-session-note error", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function draftPrompt(client: any, pastNotes: any[], transactions: any[], linkedGoals: any[], body: Body, insurance: any, template: any) {
  return `Create the first insurance-facing ABA session note draft for ${client.full_name}.

Insurance / payer rules:
${insurance ? JSON.stringify({ name: insurance.name, documentation_style: insurance.documentation_style, compliance_language: insurance.compliance_language }, null, 2) : "[none selected]"}

CPT template:
${template ? JSON.stringify({ cpt_code: template.cpt_code, service_name: template.service_name, template_body: template.template_body, required_sections: template.required_sections, prompt_guidance: template.prompt_guidance, default_setting_events: template.default_setting_events }, null, 2) : body.cptCode || "[none selected]"}

Structured section notes:
${JSON.stringify(body.sections ?? {}, null, 2)}

Current quick notes, grouped by clinician drag-and-drop zones. Treat these cards as the source observations; consolidate them into the final note using the payer/CPT template sections:
${JSON.stringify(body.noteCards ?? [], null, 2)}

Legacy quick-notes text, if any:
${body.quickNotes || "[none provided]"}

Clinical goals selected for this insurance-facing note. Tie the note to these goals when supported by the quick notes/session data; do not claim progress that is not evidenced:
${JSON.stringify(linkedGoals, null, 2)}

Recent point/reward events from this session/client ledger:
${JSON.stringify(transactions, null, 2)}

Recent past notes for continuity only. Use them to preserve style, known ongoing targets, and clinically consistent phrasing, but do not copy outdated details as if they happened today:
${JSON.stringify(pastNotes, null, 2)}

${normalizeZoneOptions(body).length ? `
Available visual zones for card classification. Use the stable zone id, not just the label, when assigning cards:
${JSON.stringify(normalizeZoneOptions(body), null, 2)}

If any note card has zone "Quick notes", choose the best available zone for it before drafting.` : ""}

${normalizeZoneOptions(body).length ? 'Return valid JSON only in this shape: {"cardZones":[{"id":"card id from noteCards","zoneId":"stable zone id from available zones","zone":"matching zone label"}],"text":"final note text"}.' : 'Return only the note text.'} Use the CPT template sections when provided. Consolidate the note cards into coherent payer-facing prose; do not merely list them unless the template calls for bullets. Keep facts grounded in the cards/source data.`;
}

function editPrompt(client: any, pastNotes: any[], transactions: any[], linkedGoals: any[], body: Body, insurance: any, template: any) {
  return `Revise this ABA session note for ${client.full_name} according to the clinician instruction.

Insurance / payer rules:
${insurance ? JSON.stringify({ name: insurance.name, documentation_style: insurance.documentation_style, compliance_language: insurance.compliance_language }, null, 2) : "[none selected]"}

CPT template:
${template ? JSON.stringify({ cpt_code: template.cpt_code, service_name: template.service_name, template_body: template.template_body, required_sections: template.required_sections, prompt_guidance: template.prompt_guidance }, null, 2) : body.cptCode || "[none selected]"}

Clinician instruction:
${body.instruction || "Improve clarity and insurance-facing tone."}

Current draft:
${body.currentDraft || "[empty]"}

Current quick notes, grouped by clinician drag-and-drop zones. Treat these cards as the source observations; consolidate them into the final note using the payer/CPT template sections:
${JSON.stringify(body.noteCards ?? [], null, 2)}

Legacy quick-notes text, if any:
${body.quickNotes || "[none provided]"}

Clinical goals selected for this insurance-facing note:
${JSON.stringify(linkedGoals, null, 2)}

Recent ledger events:
${JSON.stringify(transactions, null, 2)}

Recent past notes for continuity only:
${JSON.stringify(pastNotes, null, 2)}

Return only the revised note text. Keep facts grounded in the supplied source data. Do not invent missing clinical facts.`;
}

function normalizeZoneOptions(body: Body) {
  if (Array.isArray(body.classifyZoneOptions) && body.classifyZoneOptions.length) {
    return body.classifyZoneOptions
      .filter((zone) => zone?.id && zone?.label)
      .map((zone) => ({ id: String(zone.id), label: String(zone.label), source: zone.source ?? "template", templateId: zone.templateId ?? body.cptTemplateId ?? null }));
  }
  return (body.classifyZones ?? []).filter(Boolean).map((label) => ({
    id: `zone:${String(label).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
    label: String(label),
    source: "legacy",
    templateId: body.cptTemplateId ?? null,
  }));
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}


function parseJsonObject(text: string) {
  try { return JSON.parse(text); } catch (_) {}
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch (_) { return null; }
}
