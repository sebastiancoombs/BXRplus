import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import JSZip from "jszip";

type InsurancePayer = {
  id: string;
  name: string;
  documentation_style: string;
  compliance_language: string;
};

type CptTemplate = {
  id: string;
  insurance_id: string;
  cpt_code: string;
  service_name: string;
  template_title: string;
  default_setting_events: string;
  required_sections: string[];
  prompt_guidance: string;
  template_body: string;
  is_active: boolean;
};

const CPT_OPTIONS = [
  { code: "97155", label: "Supervision / protocol modification" },
  { code: "97156", label: "Parent / caregiver guidance" },
  { code: "97153", label: "Direct 1:1 treatment" },
  { code: "97151", label: "Assessment / reassessment / report writing" },
];

export default function NoteTemplatePage() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [payers, setPayers] = useState<InsurancePayer[]>([]);
  const [templates, setTemplates] = useState<CptTemplate[]>([]);
  const [selectedPayerId, setSelectedPayerId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [newPayerName, setNewPayerName] = useState("");
  const [cptCode, setCptCode] = useState("97155");
  const [serviceName, setServiceName] = useState(CPT_OPTIONS[0].label);
  const [templateBody, setTemplateBody] = useState("");
  const [templateSections, setTemplateSections] = useState<string[]>([]);
  const [newTemplateSection, setNewTemplateSection] = useState("");
  const [defaultSettingEvents, setDefaultSettingEvents] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  useEffect(() => { void loadPayers(); }, []);
  useEffect(() => { if (selectedPayerId) void loadTemplates(selectedPayerId); }, [selectedPayerId]);

  const selectedPayer = useMemo(() => payers.find((payer) => payer.id === selectedPayerId) ?? null, [payers, selectedPayerId]);
  const payerTemplates = useMemo(() => templates.filter((template) => template.insurance_id === selectedPayerId), [templates, selectedPayerId]);

  async function loadPayers() {
    const { data } = await supabase.from("insurance_payers").select("*").order("name");
    const rows = (data ?? []) as InsurancePayer[];
    setPayers(rows);
    setSelectedPayerId((prev) => prev || rows[0]?.id || "");
  }

  async function loadTemplates(insuranceId: string) {
    const { data } = await supabase
      .from("insurance_cpt_templates")
      .select("*")
      .eq("insurance_id", insuranceId)
      .eq("is_active", true)
      .order("cpt_code");
    const rows = (data ?? []) as CptTemplate[];
    setTemplates(rows);
    if (rows.length && !rows.some((row) => row.id === selectedTemplateId)) loadTemplate(rows[0]);
  }

  async function addPayer(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !newPayerName.trim()) return;
    const { data, error } = await supabase
      .from("insurance_payers")
      .insert({
        name: newPayerName.trim(),
        documentation_style: "Use this payer's uploaded CPT templates.",
        compliance_language: "Only use clinician-entered observations, selected goals, and documented outcomes. Do not invent data.",
        created_by: user.id,
      })
      .select("*")
      .single();
    if (error) { setStatus(error.message); return; }
    setPayers((prev) => [...prev, data as InsurancePayer].sort((a, b) => a.name.localeCompare(b.name)));
    setSelectedPayerId(data.id);
    await createStarterTemplates(data.id);
    await loadTemplates(data.id);
    setNewPayerName("");
    setStatus(`Added ${data.name}. Upload or paste each CPT template for this payer.`);
  }


  async function createStarterTemplates(insuranceId: string) {
    const starterTemplates = CPT_OPTIONS.map((option) => ({
      insurance_id: insuranceId,
      cpt_code: option.code,
      service_name: option.label,
      template_title: `${option.code} ${option.label}`,
      template_body: "",
      default_setting_events: "",
      required_sections: [],
      prompt_guidance: "Use the clinician-uploaded payer template as the source of truth. Do not invent payer requirements or clinical facts.",
      created_by: user?.id ?? null,
      is_active: true,
    }));
    await supabase.from("insurance_cpt_templates").upsert(starterTemplates, { onConflict: "insurance_id,cpt_code" });
  }

  function loadTemplate(template: CptTemplate) {
    setSelectedTemplateId(template.id);
    setCptCode(template.cpt_code);
    setServiceName(template.service_name);
    setTemplateBody(template.template_body || "");
    setTemplateSections((template.required_sections?.length ? template.required_sections : extractTemplateSections(template.template_body || "")));
    setDefaultSettingEvents(template.default_setting_events || "");
    setDirty(false);
    setLastSavedAt(null);
  }

  async function saveTemplate(e?: React.FormEvent) {
    e?.preventDefault();
    if (!user || !selectedPayerId || !cptCode.trim()) return;
    setSaving(true);
    const title = `${cptCode.trim()} ${serviceName.trim() || "ABA note"}`;
    const sections = templateSections.map((section) => section.trim()).filter(Boolean);
    const { data, error } = await supabase.from("insurance_cpt_templates").upsert({
      insurance_id: selectedPayerId,
      cpt_code: cptCode.trim(),
      service_name: serviceName.trim() || title,
      template_title: title,
      template_body: templateBody,
      default_setting_events: defaultSettingEvents,
      required_sections: sections,
      prompt_guidance: `Use the uploaded ${selectedPayer?.name ?? "payer"} ${cptCode.trim()} note template. Keep the same section order and payer-required wording.`,
      created_by: user.id,
      is_active: true,
    }, { onConflict: "insurance_id,cpt_code" }).select("*").single();
    setSaving(false);
    if (error) { setStatus(`Could not save template: ${error.message}`); return; }
    await loadTemplates(selectedPayerId);
    if (data) {
      setSelectedTemplateId(data.id);
      loadTemplate(data as CptTemplate);
    }
    setDirty(false);
    setLastSavedAt(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
    setStatus(`Saved ${selectedPayer?.name ?? "payer"} ${cptCode.trim()} template.`);
  }

  async function uploadTemplateFile(file: File | null) {
    if (!file) return;
    setStatus(`Reading ${file.name}...`);
    const lower = file.name.toLowerCase();
    let text = "";

    if (lower.endsWith(".pdf") || file.type === "application/pdf") {
      const base64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("extract-note-template-from-pdf", {
        body: { fileName: file.name, mimeType: file.type || "application/pdf", base64 },
      });
      if (error || data?.error) {
        setStatus(data?.error || error?.message || "Could not extract text from that PDF.");
        return;
      }
      text = data.text ?? "";
    } else if (lower.endsWith(".docx")) {
      text = await extractDocxText(file);
    } else if (lower.endsWith(".doc")) {
      text = await bestEffortText(file);
      if (!text.trim() || text.includes("�")) {
        setStatus("Older .doc files may not extract cleanly. If this looks wrong, save it as .docx or PDF and upload again.");
      }
    } else {
      text = await file.text();
    }

    const cleanText = text.trim();
    setTemplateBody(cleanText);
    setTemplateSections(extractTemplateSections(cleanText));
    setDirty(true);
    if (!serviceName.trim()) setServiceName(file.name.replace(/\.[^/.]+$/, ""));
    setStatus(`Loaded ${file.name}. Review it, then click Save template.`);
  }

  function addTemplateSection(e?: React.FormEvent) {
    e?.preventDefault();
    const section = newTemplateSection.trim();
    if (!section || templateSections.includes(section)) return;
    setTemplateSections((prev) => [...prev, section]);
    setNewTemplateSection("");
    setDirty(true);
  }

  function updateTemplateSection(index: number, value: string) {
    setTemplateSections((prev) => prev.map((section, i) => i === index ? value : section));
    setDirty(true);
  }

  function deleteTemplateSection(index: number) {
    setTemplateSections((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] p-5 md:p-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="rounded-[28px] border border-[#E2DED6] bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-widest text-[#8C8474]">BXR+ templates</p>
          <h1 className="mt-1 font-serif text-3xl text-[#2C2416]">Note Template</h1>
          <p className="mt-2 max-w-3xl text-sm text-[#6F6759]">
            Upload a PDF or Word doc template once, or paste the text manually. The app will use the matching insurance + CPT code automatically for every client assigned to that insurance.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-[28px] border border-[#E2DED6] bg-white p-4 shadow-sm space-y-4">
            <form onSubmit={addPayer} className="space-y-2">
              <p className="text-sm font-semibold">Insurance</p>
              <div className="flex gap-2">
                <Input value={newPayerName} onChange={(e) => setNewPayerName(e.target.value)} placeholder="Add Cigna, Tricare..." />
                <Button type="submit" variant="outline">Add</Button>
              </div>
            </form>

            <div className="space-y-2">
              {payers.map((payer) => (
                <button
                  key={payer.id}
                  onClick={() => setSelectedPayerId(payer.id)}
                  className={cn("w-full rounded-2xl border p-3 text-left text-sm", payer.id === selectedPayerId ? "border-[#2AA198] bg-[#2AA198]/10" : "hover:bg-[#FAF8F5]")}
                >
                  <span className="font-medium">{payer.name}</span>
                </button>
              ))}
            </div>
          </aside>

          <main className="rounded-[28px] border border-[#E2DED6] bg-white p-5 shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{selectedPayer?.name ?? "Select insurance"} templates</p>
                <p className="text-xs text-[#8C8474]">Same CPT code can have a different template for each insurance.</p>
              </div>
              <div className="flex gap-2">
                <input ref={fileInputRef} type="file" accept="application/pdf,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.txt,.md,.markdown,.csv,.html,.rtf" className="hidden" onChange={(e) => { const file = e.currentTarget.files?.[0] ?? null; e.currentTarget.value = ""; void uploadTemplateFile(file); }} />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>Upload PDF / Word doc</Button>
                <Button onClick={() => saveTemplate()} disabled={saving || !selectedPayerId || !dirty}>{saving ? "Saving..." : dirty ? "Save template" : "Saved"}</Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {payerTemplates.map((template) => (
                <button key={template.id} onClick={() => loadTemplate(template)} className={cn("rounded-full border px-3 py-1.5 text-sm", selectedTemplateId === template.id ? "border-[#2AA198] bg-[#2AA198]/10" : "hover:bg-[#FAF8F5]")}>{template.cpt_code} <span className="text-[#8C8474]">{template.template_body ? "saved" : "blank"}</span></button>
              ))}
            </div>

            <form onSubmit={saveTemplate} className="space-y-4">
              <div className="grid gap-3 md:grid-cols-[160px_1fr]">
                <select value={cptCode} onChange={(e) => { setCptCode(e.target.value); setServiceName(CPT_OPTIONS.find((option) => option.code === e.target.value)?.label ?? ""); setDirty(true); }} className="h-10 rounded-md border bg-white px-3 text-sm">
                  {CPT_OPTIONS.map((option) => <option key={option.code} value={option.code}>{option.code}</option>)}
                </select>
                <Input value={serviceName} onChange={(e) => { setServiceName(e.target.value); setDirty(true); }} placeholder="Template name / service type" />
              </div>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-widest text-[#8C8474]">Common default language</p>
                <Textarea value={defaultSettingEvents} onChange={(e) => { setDefaultSettingEvents(e.target.value); setDirty(true); }} className="min-h-[80px] rounded-2xl" placeholder="Optional. Only add default wording Bryn/your clinic actually wants clinicians to start from." />
              </div>

              <div className="rounded-2xl border bg-[#FAF8F5] p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-widest text-[#8C8474]">Template sections / zones</p>
                    <p className="text-xs text-[#8C8474]">These become editable zones inside Notes for this payer + CPT.</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setTemplateSections(extractTemplateSections(templateBody))}>Re-detect from text</Button>
                </div>
                <div className="space-y-2">
                  {templateSections.map((section, index) => (
                    <div key={`${section}-${index}`} className="flex gap-2">
                      <Input value={section} onChange={(e) => updateTemplateSection(index, e.target.value)} className="h-9 bg-white text-sm" />
                      <Button type="button" variant="ghost" size="sm" onClick={() => deleteTemplateSection(index)}>Delete</Button>
                    </div>
                  ))}
                  <form onSubmit={addTemplateSection} className="flex gap-2">
                    <Input value={newTemplateSection} onChange={(e) => setNewTemplateSection(e.target.value)} placeholder="Add section / zone..." className="h-9 bg-white text-sm" />
                    <Button type="submit" size="sm" disabled={!newTemplateSection.trim()}>Add</Button>
                  </form>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-widest text-[#8C8474]">Uploaded / pasted note template</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={dirty ? "destructive" : "secondary"}>{dirty ? "Unsaved changes" : lastSavedAt ? `Saved ${lastSavedAt}` : "Saved"}</Badge>
                    <Badge>{selectedPayer?.name ?? "Insurance"} · {cptCode}</Badge>
                  </div>
                </div>
                <Textarea value={templateBody} onChange={(e) => { setTemplateBody(e.target.value); setDirty(true); }} className="min-h-[420px] rounded-2xl font-serif text-base leading-7" placeholder="Paste the exact payer template here. Optional placeholders: {{client_name}}, {{date}}, {{cpt_code}}, {{setting_events}}." />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-[#FAF8F5] p-3">
                <p className="text-sm text-[#6F6759]">Edits here update the payer + CPT template used by Notes and AI draft generation.</p>
                <Button type="submit" disabled={saving || !selectedPayerId || !cptCode.trim()}>{saving ? "Saving..." : dirty ? "Save template changes" : "Save template"}</Button>
              </div>

              {status && <p className="rounded-2xl border bg-[#FAF8F5] p-3 text-sm text-[#6F6759]">{status}</p>}
            </form>
          </main>
        </div>
      </div>
    </div>
  );
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function extractDocxText(file: File) {
  const zip = await JSZip.loadAsync(file);
  const xml = await zip.file("word/document.xml")?.async("text");
  if (!xml) return "";
  return xml
    .replace(/<w:p[\s\S]*?>/g, "\n")
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function bestEffortText(file: File) {
  try {
    const text = await file.text();
    return text.replace(/[\x00-\x08\x0E-\x1F]/g, "").trim();
  } catch (_) {
    return "";
  }
}

function extractTemplateSections(template: string) {
  return template
    .split("\n")
    .map((line) => line.trim().replace(/:$/, ""))
    .filter((line) => line.length > 2 && line.length < 80 && /^[A-Z0-9][A-Za-z0-9 /&()–—-]+$/.test(line))
    .slice(0, 12);
}
