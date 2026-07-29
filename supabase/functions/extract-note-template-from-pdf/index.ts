import { corsHeaders } from "../_shared/cors.ts";
import { userClient } from "../_shared/supabase.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const MODEL = Deno.env.get("OPENAI_TEMPLATE_MODEL") ?? "gpt-4o-mini";

type Body = {
  fileName: string;
  mimeType?: string;
  base64: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!OPENAI_API_KEY) return json({ error: "OPENAI_API_KEY is not configured" }, 500);

    const supa = userClient(req);
    const { data: userData } = await supa.auth.getUser();
    if (!userData?.user) return json({ error: "not authenticated" }, 401);

    const body = (await req.json()) as Body;
    if (!body.fileName || !body.base64) return json({ error: "fileName and base64 are required" }, 400);

    const pdfDataUrl = `data:${body.mimeType || "application/pdf"};base64,${body.base64}`;
    const aiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: "You extract payer note templates from PDF files. Preserve headings, required wording, labels, checkboxes, and section order as plain editable text. Do not invent payer requirements. Return only the extracted template text, no commentary.",
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: "Extract the note template text from this PDF so it can be pasted into a web template editor. Preserve the payer's section order and required language. Use placeholders only where the PDF visibly has blanks, such as [client name], [date], or [duration].",
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
      return json({ error: "AI PDF template extraction failed", detail }, 502);
    }

    const payload = await aiRes.json();
    const text = extractResponseText(payload);
    if (!text) return json({ error: "No readable template text was extracted" }, 422);
    return json({ text });
  } catch (err) {
    console.error("extract-note-template-from-pdf error", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function extractResponseText(payload: any): string {
  if (typeof payload?.output_text === "string") return payload.output_text.trim();
  const chunks: string[] = [];
  for (const item of payload?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (content?.type === "output_text" && content?.text) chunks.push(content.text);
      if (content?.type === "text" && content?.text) chunks.push(content.text);
    }
  }
  return chunks.join("\n").trim();
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
