import { corsHeaders } from "../_shared/cors.ts";
import { userClient } from "../_shared/supabase.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const MODEL = Deno.env.get("OPENAI_GOALS_MODEL") ?? "gpt-4o-mini";

type Body = {
  clientId: string;
  fileName: string;
  mimeType?: string;
  base64: string;
};

type ExtractedGoal = {
  title: string;
  description?: string;
  domain?: string;
  target_text?: string;
  mastery_criteria?: string;
};

type ParsedPdf = {
  extracted_text?: string;
  goals: ExtractedGoal[];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!OPENAI_API_KEY) return json({ error: "OPENAI_API_KEY is not configured" }, 500);

    const supa = userClient(req);
    const { data: userData } = await supa.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "not authenticated" }, 401);

    const body = (await req.json()) as Body;
    if (!body.clientId || !body.fileName || !body.base64) {
      return json({ error: "clientId, fileName, and base64 are required" }, 400);
    }

    const { data: client, error: clientError } = await supa
      .from("clients")
      .select("id, full_name")
      .eq("id", body.clientId)
      .single();
    if (clientError || !client) return json({ error: "client not found" }, 404);

    const { data: document, error: documentError } = await supa
      .from("goal_documents")
      .insert({
        client_id: body.clientId,
        file_name: body.fileName,
        storage_path: null,
        created_by: user.id,
      })
      .select("*")
      .single();
    if (documentError || !document) return json({ error: documentError?.message ?? "could not create document record" }, 500);

    const pdfDataUrl = `data:${body.mimeType || "application/pdf"};base64,${body.base64}`;
    const aiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.1,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: "You extract readable text and ABA clinical treatment goals from PDFs for clinician review. Return strict JSON only. Do not invent facts. Preserve the source document text as completely as possible in extracted_text. If a goal field is missing, use an empty string. Split separate measurable objectives into separate goals when clinically appropriate.",
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `Extract the readable text and clinical goals/objectives for ${client.full_name}. Return JSON with shape {"extracted_text":"full readable document text here","goals":[{"title":"","description":"","domain":"","target_text":"","mastery_criteria":""}]}. Keep goal titles short and insurance/ABA appropriate.`,
              },
              {
                type: "input_file",
                filename: body.fileName,
                file_data: pdfDataUrl,
              },
            ],
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const detail = await aiRes.text();
      return json({ error: "AI PDF extraction failed", detail }, 502);
    }

    const payload = await aiRes.json();
    const text = extractResponseText(payload);
    const parsed = parseGoals(text);
    const goals = parsed.goals
      .filter((goal) => goal.title?.trim())
      .slice(0, 40)
      .map((goal) => ({
        client_id: body.clientId,
        title: goal.title.trim(),
        description: goal.description?.trim() ?? "",
        domain: goal.domain?.trim() || null,
        target_text: goal.target_text?.trim() || null,
        mastery_criteria: goal.mastery_criteria?.trim() || null,
        source: "pdf",
        source_document_id: document.id,
        created_by: user.id,
      }));

    if (goals.length === 0) return json({ document, goals: [], extractedText: parsed.extracted_text ?? "", warning: "No goals found in PDF." });

    const { data: insertedGoals, error: goalsError } = await supa
      .from("clinical_goals")
      .insert(goals)
      .select("*");
    if (goalsError) return json({ error: goalsError.message }, 500);

    return json({ document, goals: insertedGoals ?? [], extractedText: parsed.extracted_text ?? "" });
  } catch (err) {
    console.error("extract-goals-from-pdf error", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function extractResponseText(payload: any): string {
  if (typeof payload?.output_text === "string") return payload.output_text;
  const chunks: string[] = [];
  for (const item of payload?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (content?.type === "output_text" && content?.text) chunks.push(content.text);
      if (content?.type === "text" && content?.text) chunks.push(content.text);
    }
  }
  return chunks.join("\n").trim();
}

function parseGoals(text: string): ParsedPdf {
  const clean = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  try {
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed)) return { goals: parsed };
    if (Array.isArray(parsed.goals)) return { extracted_text: parsed.extracted_text ?? parsed.extractedText ?? "", goals: parsed.goals };
  } catch (_) {
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const parsed = JSON.parse(clean.slice(start, end + 1));
      if (Array.isArray(parsed.goals)) return { extracted_text: parsed.extracted_text ?? parsed.extractedText ?? "", goals: parsed.goals };
    }
  }
  return { goals: [] };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
