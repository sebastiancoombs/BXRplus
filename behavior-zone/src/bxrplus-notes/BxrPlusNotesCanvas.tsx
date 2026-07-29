import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useClientContext } from "@/contexts/ClientContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import JSZip from "jszip";
import { NoteCard } from "@/bxrplus-notes/components/note-card";
import { toBxrPlusNote } from "@/bxrplus-notes/lib/supabase-bxrplus-adapter";

type SessionNote = {
  id: string;
  client_id: string;
  folder_id: string | null;
  service_date: string;
  title: string;
  content: string;
  quick_notes: string;
  insurance_note: string;
  status: "draft" | "ready" | "submitted";
  sync_mode?: "cloud" | "local";
  locked?: boolean;
  published?: boolean;
  published_at?: string | null;
  current_branch_id?: string | null;
  deleted_at?: string | null;
  color?: string | null;
  source_filename?: string | null;
  source_mime_type?: string | null;
  source_path?: string | null;
  insurance_id?: string | null;
  cpt_template_id?: string | null;
  cpt_code?: string | null;
  note_kind?: string;
  setting_events?: string;
  behavior_observations?: string;
  interventions?: string;
  client_response?: string;
  plan_next_steps?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

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

type NoteSuggestion = {
  id: string;
  client_id: string;
  target_note_id: string;
  source_note_id: string | null;
  goal_id: string | null;
  suggestion_text: string;
  rationale: string;
  status: "pending" | "accepted" | "dismissed";
};

type SessionNoteVersion = {
  id: string;
  note_id: string;
  branch_id: string | null;
  title: string;
  is_checkpoint: boolean;
  data: string;
  created_by: string | null;
  created_at: string;
};

type SessionNoteMedia = {
  id: string;
  client_id: string;
  note_id: string | null;
  type: "image" | "video" | "audio" | "pdf" | "file";
  filename: string;
  storage_path: string;
  mime_type: string;
  size: number;
  published: boolean;
  caption: string | null;
  created_at: string;
};

type SessionNoteCard = {
  id: string;
  note_id: string;
  client_id: string;
  body: string;
  zone: string;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type SessionNoteZone = {
  id: string;
  note_id: string;
  client_id: string;
  label: string;
  sort_order: number;
  source?: string;
  template_id?: string | null;
  deleted_at?: string | null;
  created_by: string;
  created_at: string;
};

type SessionNoteFolder = {
  id: string;
  client_id: string;
  name: string;
  color: string;
  description?: string;
  sort_order?: number;
  parent_id?: string | null;
  path?: string;
  source?: "manual" | "upload" | "zip" | "drive";
  created_by: string;
  created_at: string;
};

type ClinicalGoal = {
  id: string;
  client_id: string;
  title: string;
  description: string;
  domain: string | null;
  target_text: string | null;
  mastery_criteria: string | null;
  source: "manual" | "pdf" | "ai";
  is_active: boolean;
};

type ChatMessage = { role: "user" | "assistant"; text: string };

const QUICK_CARD_ZONE = "Quick notes";
const FALLBACK_TEMPLATE_ZONES = ["Setting events", "Goals targeted", "Behavior observations", "Interventions / changes", "Client response / progress", "Plan / next steps"];

const CLIENT_COLORS = ["#2AA198", "#8B5CF6", "#F59E0B", "#10B981", "#3B82F6", "#EC4899", "#F97316", "#06B6D4"];
const SUBFOLDER_COLORS = ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#F97316", "#06B6D4"];
const DEFAULT_SETTING_EVENTS = "Client had a positive affect coming into session and no setting events were reported.";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function clientColor(index: number) {
  return CLIENT_COLORS[index % CLIENT_COLORS.length];
}

export default function BxrPlusNotesCanvas() {
  const { user } = useAuth();
  const { clients, activeClient, setActiveClientId, loading: clientsLoading } = useClientContext();
  const [selectedClientId, setSelectedClientId] = useState<string | "all">(activeClient?.id ?? "all");
  const [selectedFolderId, setSelectedFolderId] = useState<string | "all" | "unfiled">("all");
  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [folders, setFolders] = useState<SessionNoteFolder[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "editor">("grid");
  const [showTrash, setShowTrash] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState(SUBFOLDER_COLORS[3]);
  const [goals, setGoals] = useState<ClinicalGoal[]>([]);
  const [linkedGoalIds, setLinkedGoalIds] = useState<Set<string>>(new Set());
  const [newClinicalGoalTitle, setNewClinicalGoalTitle] = useState("");
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editingGoalTitle, setEditingGoalTitle] = useState("");
  const [editingGoalCriteria, setEditingGoalCriteria] = useState("");
  const [insurancePayers, setInsurancePayers] = useState<InsurancePayer[]>([]);
  const [cptTemplates, setCptTemplates] = useState<CptTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [suggestions, setSuggestions] = useState<NoteSuggestion[]>([]);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [typewriterActive, setTypewriterActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [quickCardInput, setQuickCardInput] = useState("");
  const [newZoneLabel, setNewZoneLabel] = useState("");
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [editingZoneLabel, setEditingZoneLabel] = useState("");
  const [zoneCardInputs, setZoneCardInputs] = useState<Record<string, string>>({});
  const [lastAddedCard, setLastAddedCard] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: "I can draft and revise the insurance-facing note from quick notes, selected goals, prior notes, and session events." },
  ]);
  const [versions, setVersions] = useState<SessionNoteVersion[]>([]);
  const [media, setMedia] = useState<SessionNoteMedia[]>([]);
  const [noteCards, setNoteCards] = useState<SessionNoteCard[]>([]);
  const [noteZones, setNoteZones] = useState<SessionNoteZone[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const currentNoteUploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeClient?.id && selectedClientId === "all" && clients.length === 1) setSelectedClientId(activeClient.id);
  }, [activeClient?.id, clients.length, selectedClientId]);

  async function fetchTemplatesForInsurance(insuranceId: string | null, preferredCpt?: string | null, preferredTemplateId?: string | null) {
    let query = supabase
      .from("insurance_cpt_templates")
      .select("*")
      .eq("is_active", true)
      .order("cpt_code");
    if (insuranceId) query = query.eq("insurance_id", insuranceId);
    const { data: templates, error } = await query;
    if (error) {
      setMessages((prev) => [...prev, { role: "assistant", text: `Could not load CPT templates: ${error.message}` }]);
      setCptTemplates([]);
      setSelectedTemplateId("");
      return [] as CptTemplate[];
    }
    const rows = (templates ?? []) as CptTemplate[];
    setCptTemplates(rows);
    setSelectedTemplateId((prev) => {
      if (preferredTemplateId && rows.some((template) => template.id === preferredTemplateId)) return preferredTemplateId;
      if (preferredCpt) return rows.find((template) => template.cpt_code === preferredCpt)?.id ?? rows[0]?.id ?? "";
      if (prev && rows.some((template) => template.id === prev)) return prev;
      return rows[0]?.id ?? "";
    });
    return rows;
  }

  async function loadInsuranceConfig(clientId?: string | null) {
    const { data: payers } = await supabase.from("insurance_payers").select("*").order("name");
    const payerRows = (payers ?? []) as InsurancePayer[];
    setInsurancePayers(payerRows);
    if (!clientId) { await fetchTemplatesForInsurance(null); return; }
    const { data: client } = await supabase
      .from("clients")
      .select("insurance_id, default_cpt_template_id, default_cpt_code")
      .eq("id", clientId)
      .maybeSingle();
    await fetchTemplatesForInsurance(client?.insurance_id ?? null, client?.default_cpt_code ?? null, client?.default_cpt_template_id ?? null);
  }

  async function loadWorkspace() {
    setLoading(true);
    let notesQuery = supabase
      .from("session_notes")
      .select("*")
      .order("service_date", { ascending: false })
      .order("created_at", { ascending: false });

    let foldersQuery = supabase
      .from("session_note_folders")
      .select("*")
      .order("sort_order")
      .order("name");

    if (selectedClientId !== "all") {
      notesQuery = notesQuery.eq("client_id", selectedClientId);
      foldersQuery = foldersQuery.eq("client_id", selectedClientId);
    }
    notesQuery = showTrash ? notesQuery.not("deleted_at", "is", null) : notesQuery.is("deleted_at", null);

    if (selectedFolderId !== "all" && !showTrash) {
      notesQuery = selectedFolderId === "unfiled" ? notesQuery.is("folder_id", null) : notesQuery.eq("folder_id", selectedFolderId);
    }

    const [notesRes, foldersRes] = await Promise.all([notesQuery, foldersQuery]);
    const nextNotes = (notesRes.data ?? []) as SessionNote[];
    setNotes(nextNotes);
    setFolders((foldersRes.data ?? []) as SessionNoteFolder[]);
    setSelectedNoteId((prev) => (prev && nextNotes.some((note) => note.id === prev) ? prev : nextNotes[0]?.id ?? null));
    setLoading(false);
  }

  useEffect(() => { void loadWorkspace(); }, [selectedClientId, selectedFolderId, showTrash]);
  useEffect(() => {
    const clientId = selectedClientId !== "all" ? selectedClientId : activeClient?.id ?? clients[0]?.id ?? null;
    void loadInsuranceConfig(clientId);
  }, [selectedClientId, activeClient?.id, clients.length, clients.map((client: any) => `${client.id}:${client.insurance_id ?? ""}:${client.default_cpt_template_id ?? ""}:${client.default_cpt_code ?? ""}`).join("|")]);

  const selectedNote = useMemo(() => notes.find((note) => note.id === selectedNoteId) ?? null, [notes, selectedNoteId]);
  const selectedClient = useMemo(() => selectedClientId === "all" ? null : clients.find((client) => client.id === selectedClientId) ?? null, [clients, selectedClientId]);
  const selectedClientTemplates = useMemo(() => selectedClient ? cptTemplates : [], [cptTemplates, selectedClient]);
  const selectedTemplate = useMemo(() => cptTemplates.find((template) => template.id === selectedTemplateId) ?? null, [cptTemplates, selectedTemplateId]);
  const selectedNoteClient = useMemo(() => clients.find((client) => client.id === selectedNote?.client_id) as any, [clients, selectedNote?.client_id]);
  const selectedNoteEffectiveInsuranceId = selectedNote?.insurance_id ?? selectedNoteClient?.insurance_id ?? null;
  const selectedNoteTemplateOptions = useMemo(
    () => cptTemplates.filter((template) => !selectedNoteEffectiveInsuranceId || template.insurance_id === selectedNoteEffectiveInsuranceId),
    [cptTemplates, selectedNoteEffectiveInsuranceId],
  );
  const selectedNoteEffectiveTemplateId = selectedNote?.cpt_template_id
    ?? (selectedNoteClient?.default_cpt_template_id && selectedNoteTemplateOptions.some((template) => template.id === selectedNoteClient.default_cpt_template_id) ? selectedNoteClient.default_cpt_template_id : null)
    ?? selectedNoteTemplateOptions[0]?.id
    ?? "";
  const folderNameMap = useMemo(() => new Map(folders.map((folder) => [folder.id, folder.name])), [folders]);

  const visibleNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((note) => `${note.title} ${note.content ?? ""} ${note.quick_notes} ${note.insurance_note}`.toLowerCase().includes(q));
  }, [notes, search]);

  const noteCountsByClient = useMemo(() => {
    const counts = new Map<string, number>();
    notes.forEach((note) => counts.set(note.client_id, (counts.get(note.client_id) ?? 0) + 1));
    return counts;
  }, [notes]);

  const templateZones = useMemo(() => {
    const active = noteZones.map((zone) => zone.label).filter(Boolean);
    if (active.length) return active;
    return buildTemplateZones(selectedTemplate ?? cptTemplates.find((template) => template.id === selectedNote?.cpt_template_id));
  }, [selectedTemplate, cptTemplates, selectedNote?.cpt_template_id, noteZones]);
  const classifyZoneOptions = useMemo(() => templateZones.map((label) => {
    const persisted = noteZones.find((zone) => zone.label === label);
    return {
      id: persisted ? `note-zone:${persisted.id}` : `template-zone:${selectedNoteEffectiveTemplateId || selectedNote?.cpt_template_id || selectedTemplateId || "none"}:${slugifyZone(label)}`,
      label,
      source: persisted?.source ?? "template",
      templateId: persisted?.template_id ?? selectedNoteEffectiveTemplateId ?? selectedNote?.cpt_template_id ?? selectedTemplateId ?? null,
    };
  }), [templateZones, noteZones, selectedNoteEffectiveTemplateId, selectedNote?.cpt_template_id, selectedTemplateId]);
  const quickCards = useMemo(() => noteCards.filter((card) => card.zone === QUICK_CARD_ZONE), [noteCards]);

  function patchSelectedNote(patch: Partial<SessionNote>) {
    if (!selectedNote) return;
    setNotes((prev) => prev.map((note) => note.id === selectedNote.id ? { ...note, ...patch } : note));
  }

  async function saveNote(patch?: Partial<SessionNote>) {
    if (!selectedNote) return;
    const next = { ...selectedNote, ...patch };
    setSaving(true);
    const { data } = await supabase
      .from("session_notes")
      .update({
        folder_id: next.folder_id,
        service_date: next.service_date,
        title: next.title,
        quick_notes: next.quick_notes,
        content: next.content ?? next.insurance_note ?? next.quick_notes ?? "",
        insurance_note: next.insurance_note,
        status: next.status,
        sync_mode: next.sync_mode ?? "cloud",
        locked: next.locked ?? false,
        published: next.published ?? false,
        insurance_id: next.insurance_id ?? null,
        cpt_template_id: next.cpt_template_id ?? null,
        cpt_code: next.cpt_code ?? null,
        note_kind: next.note_kind ?? "general",
        setting_events: next.setting_events ?? "",
        behavior_observations: next.behavior_observations ?? "",
        interventions: next.interventions ?? "",
        client_response: next.client_response ?? "",
        plan_next_steps: next.plan_next_steps ?? "",
      })
      .eq("id", next.id)
      .select("*")
      .single();
    setSaving(false);
    if (data) setNotes((prev) => prev.map((note) => note.id === next.id ? data as SessionNote : note));
  }

  async function createNote() {
    const clientId = selectedClientId !== "all" ? selectedClientId : activeClient?.id ?? clients[0]?.id;
    if (!clientId || !user) return;
    const client = clients.find((row) => row.id === clientId) as any;
    const selectedTemplateFromState = cptTemplates.find((row) => row.id === selectedTemplateId);
    const insuranceId = client?.insurance_id ?? selectedTemplateFromState?.insurance_id ?? null;
    const payerTemplates = cptTemplates.some((row) => !insuranceId || row.insurance_id === insuranceId) ? cptTemplates : await fetchTemplatesForInsurance(insuranceId);
    const selectedCpt = selectedTemplateFromState?.cpt_code;
    const defaultTemplateId = client?.default_cpt_template_id;
    const defaultCpt = client?.default_cpt_code;
    const template = payerTemplates.find((row) => row.insurance_id === insuranceId && row.id === selectedTemplateId)
      ?? payerTemplates.find((row) => row.insurance_id === insuranceId && row.id === defaultTemplateId)
      ?? payerTemplates.find((row) => row.insurance_id === insuranceId && row.cpt_code === selectedCpt)
      ?? payerTemplates.find((row) => row.insurance_id === insuranceId && row.cpt_code === defaultCpt)
      ?? payerTemplates[0];
    const settingEvents = template?.default_setting_events || DEFAULT_SETTING_EVENTS;
    const draft = buildTemplateText(client?.full_name ?? "Client", template, settingEvents);

    const { data } = await supabase
      .from("session_notes")
      .insert({
        client_id: clientId,
        folder_id: selectedFolderId !== "all" && selectedFolderId !== "unfiled" ? selectedFolderId : null,
        service_date: todayISO(),
        title: template ? `${template.cpt_code} ${template.service_name}` : "Raw session note",
        content: draft,
        quick_notes: "",
        insurance_note: draft,
        status: "draft",
        note_kind: template?.cpt_code === "97156" ? "caregiver_guidance" : template?.cpt_code === "97151" ? "assessment" : template?.cpt_code === "97153" ? "direct_treatment" : template?.cpt_code === "97155" ? "protocol_modification" : "session_note",
        insurance_id: insuranceId,
        cpt_template_id: template?.id ?? null,
        cpt_code: template?.cpt_code ?? null,
        setting_events: settingEvents,
        behavior_observations: "",
        interventions: "",
        client_response: "",
        plan_next_steps: "",
        created_by: user.id,
      })
      .select("*")
      .single();
    if (!data) return;
    setSelectedClientId(clientId);
    setNotes((prev) => [data as SessionNote, ...prev]);
    setSelectedNoteId(data.id);
    setView("editor");
    await createSuggestionsForNote(data as SessionNote);
  }

  async function deleteNote(noteId: string) {
    const ok = window.confirm(showTrash ? "Permanently delete this note?" : "Move this note to trash?");
    if (!ok) return;
    if (showTrash) {
      await supabase.from("session_notes").delete().eq("id", noteId);
    } else {
      await supabase.from("session_notes").update({ deleted_at: new Date().toISOString() }).eq("id", noteId);
    }
    setNotes((prev) => prev.filter((note) => note.id !== noteId));
    setSelectedNoteId((prev) => prev === noteId ? notes.find((note) => note.id !== noteId)?.id ?? null : prev);
  }

  async function createFolder(e: React.FormEvent) {
    e.preventDefault();
    const clientId = selectedClientId !== "all" ? selectedClientId : activeClient?.id ?? clients[0]?.id;
    if (!clientId || !user || !newFolderName.trim()) return;
    const { data } = await supabase
.from("session_note_folders")
      .insert({ client_id: clientId, name: newFolderName.trim(), path: newFolderName.trim(), color: newFolderColor, sort_order: folders.length, created_by: user.id })
      .select("*")
      .single();
    if (!data) return;
    setFolders((prev) => [...prev, data as SessionNoteFolder]);
    setSelectedClientId(clientId);
    setSelectedFolderId(data.id);
    setNewFolderName("");
    setNewFolderColor(SUBFOLDER_COLORS[3]);
  }


  async function ensureFolderPath(clientId: string, path: string, source: "upload" | "zip" | "manual" = "upload") {
    if (!user) return null;
    const clean = path.split("/").map((part) => part.trim()).filter(Boolean).join("/");
    if (!clean) return null;

    const parts = clean.split("/");
    let parentId: string | null = null;
    let currentPath = "";
    let lastFolder: SessionNoteFolder | null = null;

    for (const [index, part] of parts.entries()) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const existing = folders.find((folder) => folder.client_id === clientId && (folder.path || folder.name) === currentPath);
      if (existing) {
        parentId = existing.id;
        lastFolder = existing;
        continue;
      }

      const { data, error } = await supabase
        .from("session_note_folders")
        .insert({
          client_id: clientId,
          parent_id: parentId,
          name: part,
          path: currentPath,
          color: SUBFOLDER_COLORS[index % SUBFOLDER_COLORS.length],
          sort_order: folders.length + index,
          source,
          created_by: user.id,
        })
        .select("*")
        .single();

      if (error || !data) continue;
      const folder = data as SessionNoteFolder;
      setFolders((prev) => [...prev, folder]);
      parentId = folder.id;
      lastFolder = folder;
    }

    return lastFolder;
  }

  async function createImportedNote(clientId: string, folderId: string | null, fileName: string, content: string, kind: "text" | "pdf" | "file", mimeType?: string, sourcePath?: string) {
    if (!user) return null;
    const title = fileName.replace(/\.[^/.]+$/, "") || fileName;
    const importedBody = content?.trim()
      ? content
      : kind === "pdf"
        ? `Imported PDF: ${fileName}\nNo readable text was extracted automatically. Upload or paste the source text here before generating an insurance-facing note.`
        : `Imported file: ${fileName}`;

    const { data } = await supabase
      .from("session_notes")
      .insert({
        client_id: clientId,
        folder_id: folderId,
        service_date: todayISO(),
        title,
        content: importedBody,
        quick_notes: importedBody,
        insurance_note: importedBody,
        source_filename: fileName,
        source_mime_type: mimeType || (kind === "pdf" ? "application/pdf" : undefined),
        source_path: sourcePath || fileName,
        status: "draft",
        created_by: user.id,
      })
      .select("*")
      .single();

    if (data) setNotes((prev) => [data as SessionNote, ...prev]);
    return data as SessionNote | null;
  }

  async function importOneFile(file: File, basePath = "", source: "upload" | "zip" = "upload") {
    const clientId = selectedClientId !== "all" ? selectedClientId : activeClient?.id ?? clients[0]?.id;
    if (!clientId) return;

    const relativePath = basePath || (file as any).webkitRelativePath || file.name;
    const parts = relativePath.split("/").filter(Boolean);
    const fileName = parts.pop() || file.name;
    const folderPath = parts.join("/");
    const folder = folderPath ? await ensureFolderPath(clientId, folderPath, source) : null;
    const folderId = folder?.id ?? (selectedFolderId !== "all" && selectedFolderId !== "unfiled" ? selectedFolderId : null);
    const lower = fileName.toLowerCase();

    if (lower.endsWith(".pdf") || file.type === "application/pdf") {
      const base64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("extract-goals-from-pdf", {
        body: { clientId, fileName, mimeType: file.type || "application/pdf", base64 },
      });
      if (!error && data?.goals?.length) setGoals((prev) => [...(data.goals as ClinicalGoal[]), ...prev]);
      const extractedText = typeof data?.extractedText === "string" ? data.extractedText : "";
      await createImportedNote(clientId, folderId, fileName, extractedText, "pdf", file.type || "application/pdf", relativePath);
      return;
    }

    if (lower.endsWith(".txt") || lower.endsWith(".md") || lower.endsWith(".markdown") || file.type.startsWith("text/")) {
      const text = await file.text();
      await createImportedNote(clientId, folderId, fileName, text, "text", file.type || guessMime(fileName), relativePath);
      return;
    }

    await createImportedNote(clientId, folderId, fileName, await bestEffortText(file), "file", file.type || guessMime(fileName), relativePath);
  }

  async function importFiles(files: FileList | File[] | null) {
    if (!files || files.length === 0) return;
    setLoading(true);
    for (const file of Array.from(files)) {
      if (file.name.toLowerCase().endsWith(".zip")) await importZip(file);
      else await importOneFile(file);
    }
    setLoading(false);
    setMessages((prev) => [...prev, { role: "assistant", text: `Imported ${files.length} file${files.length === 1 ? "" : "s"} into the client workspace.` }]);
  }

  async function importZip(file: File) {
    const zip = await JSZip.loadAsync(file);
    const entries = Object.values(zip.files).filter((entry) => !entry.dir);
    for (const entry of entries) {
      const blob = await entry.async("blob");
      const imported = new File([blob], entry.name.split("/").pop() || entry.name, { type: guessMime(entry.name) });
      await importOneFile(imported, entry.name, "zip");
    }
  }

  async function loadClinicalGoalsForClient(clientId: string | null, noteId?: string) {
    if (!clientId) { setGoals([]); setLinkedGoalIds(new Set()); return; }


    const goalsQuery = supabase
      .from("clinical_goals")
      .select("*")
      .eq("client_id", clientId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    const linksQuery = noteId
      ? supabase.from("session_note_clinical_goals").select("clinical_goal_id").eq("note_id", noteId)
      : Promise.resolve({ data: [] });

    const [goalsRes, linksRes] = await Promise.all([goalsQuery, linksQuery]);
    setGoals((goalsRes.data ?? []) as ClinicalGoal[]);
    setLinkedGoalIds(new Set(((linksRes as any).data ?? []).map((row: any) => row.clinical_goal_id)));
  }



  useEffect(() => {
    const clientId = selectedNote?.client_id ?? (selectedClientId !== "all" ? selectedClientId : activeClient?.id ?? null);
    void loadClinicalGoalsForClient(clientId, selectedNote?.id);
    void loadBxrPlusExtras(selectedNote);
  }, [selectedNote?.id, selectedNote?.client_id, selectedClientId, activeClient?.id]);

  useEffect(() => {
    if (!selectedNote || !selectedNoteEffectiveTemplateId) return;
    const template = selectedNoteTemplateOptions.find((row) => row.id === selectedNoteEffectiveTemplateId) ?? cptTemplates.find((row) => row.id === selectedNoteEffectiveTemplateId) ?? null;
    void materializeTemplateZones(selectedNote, template);
  }, [selectedNote?.id, selectedNoteEffectiveTemplateId, selectedNoteTemplateOptions.length, cptTemplates.length, user?.id]);

  async function createSuggestionsForNote(note: SessionNote) {
    if (!user) return;
    const { data: previous } = await supabase
      .from("session_notes")
      .select("id, service_date, title, quick_notes, insurance_note, behavior_observations, interventions, client_response, plan_next_steps")
      .eq("client_id", note.client_id)
      .neq("id", note.id)
      .is("deleted_at", null)
      .order("service_date", { ascending: false })
      .limit(1);
    const last = previous?.[0] as any;
    if (!last) return;
    const source = [last.quick_notes, last.behavior_observations, last.interventions, last.client_response, last.plan_next_steps, last.insurance_note].filter(Boolean).join("\n");
    if (!source.trim()) return;
    const text = `Review prior session: ${source.slice(0, 420)}${source.length > 420 ? "…" : ""} If this changed today's response or plan, click to add an accurate follow-up statement.`;
    const { data } = await supabase
      .from("session_note_suggestions")
      .insert({ client_id: note.client_id, source_note_id: last.id, target_note_id: note.id, suggestion_text: text, rationale: "Carry-forward clinical context from the previous session.", created_by: user.id })
      .select("*")
      .single();
    if (data) setSuggestions((prev) => [data as NoteSuggestion, ...prev]);
  }

  async function acceptSuggestion(suggestion: NoteSuggestion) {
    if (!selectedNote) return;
    const plan_next_steps = `${selectedNote.plan_next_steps ?? ""}\n${suggestion.suggestion_text}`.trim();
    const insurance_note = appendSection(selectedNote.insurance_note || selectedNote.content || "", "Plan / Next Steps", suggestion.suggestion_text);
    patchSelectedNote({ plan_next_steps, insurance_note, content: insurance_note });
    await saveNote({ plan_next_steps, insurance_note, content: insurance_note });
    await supabase.from("session_note_suggestions").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", suggestion.id);
    setSuggestions((prev) => prev.filter((row) => row.id !== suggestion.id));
  }

  async function dismissSuggestion(suggestionId: string) {
    await supabase.from("session_note_suggestions").update({ status: "dismissed" }).eq("id", suggestionId);
    setSuggestions((prev) => prev.filter((row) => row.id !== suggestionId));
  }

  async function createCardInZone(zone: string, body: string) {
    if (!selectedNote || !user || selectedNote.locked) return;
    const clean = body.trim();
    if (!clean) return;
    const { data, error } = await supabase
      .from("session_note_cards")
      .insert({
        note_id: selectedNote.id,
        client_id: selectedNote.client_id,
        body: clean,
        zone,
        sort_order: noteCards.filter((card) => card.zone === zone).length,
        created_by: user.id,
      })
      .select("*")
      .single();
    if (error || !data) {
      setMessages((prev) => [...prev, { role: "assistant", text: error?.message ?? "Could not add that note card." }]);
      return;
    }
    const nextCards = [...noteCards, data as SessionNoteCard];
    const quick_notes = nextCards.map((card) => `[${card.zone}] ${card.body}`).join("\n");
    setLastAddedCard(data.id);
    setNoteCards(nextCards);
    patchSelectedNote({ quick_notes });
    await saveNote({ quick_notes });
    window.setTimeout(() => setLastAddedCard((current) => current === data.id ? "" : current), 1400);
  }

  async function addQuickCard(e?: React.FormEvent) {
    e?.preventDefault();
    const body = quickCardInput.trim();
    if (!body) return;
    setQuickCardInput("");
    await createCardInZone(QUICK_CARD_ZONE, body);
  }

  async function addZoneCard(zone: string) {
    const body = (zoneCardInputs[zone] ?? "").trim();
    if (!body) return;
    setZoneCardInputs((prev) => ({ ...prev, [zone]: "" }));
    await createCardInZone(zone, body);
  }

  async function addCustomZone(e?: React.FormEvent) {
    e?.preventDefault();
    if (!selectedNote || !user) return;
    const label = newZoneLabel.trim();
    if (!label || templateZones.includes(label)) return;
    const { data, error } = await supabase
      .from("session_note_zones")
      .insert({ note_id: selectedNote.id, client_id: selectedNote.client_id, label, sort_order: noteZones.length, source: "custom", created_by: user.id })
      .select("*")
      .single();
    if (error || !data) {
      setMessages((prev) => [...prev, { role: "assistant", text: error?.message ?? "Could not add zone." }]);
      return;
    }
    setNewZoneLabel("");
    setNoteZones((prev) => [...prev, data as SessionNoteZone]);
  }

  async function materializeTemplateZones(note: SessionNote, template: CptTemplate | null) {
    if (!user || !template) return;
    const labels = buildTemplateZones(template);
    if (!labels.length) return;
    const { data: allZones } = await supabase.from("session_note_zones").select("label").eq("note_id", note.id);
    const existing = new Set((allZones ?? []).map((zone: any) => zone.label));
    const rows = labels
      .filter((label) => !existing.has(label))
      .map((label, index) => ({
        note_id: note.id,
        client_id: note.client_id,
        label,
        sort_order: noteZones.length + index,
        source: "template",
        template_id: template.id,
        created_by: user.id,
      }));
    if (!rows.length) return;
    const { data, error } = await supabase.from("session_note_zones").insert(rows).select("*");
    if (error || !data) return;
    setNoteZones((prev) => [...prev, ...(data as SessionNoteZone[])]);
  }

  function startEditingZone(zone: SessionNoteZone) {
    setEditingZoneId(zone.id);
    setEditingZoneLabel(zone.label);
  }

  async function saveEditingZone() {
    if (!editingZoneId || !editingZoneLabel.trim()) return;
    const oldZone = noteZones.find((zone) => zone.id === editingZoneId);
    if (!oldZone) return;
    const nextLabel = editingZoneLabel.trim();
    const { data, error } = await supabase.from("session_note_zones").update({ label: nextLabel }).eq("id", editingZoneId).select("*").single();
    if (error || !data) {
      setMessages((prev) => [...prev, { role: "assistant", text: error?.message ?? "Could not rename zone." }]);
      return;
    }
    setNoteZones((prev) => prev.map((zone) => zone.id === editingZoneId ? data as SessionNoteZone : zone));
    if (oldZone.label !== nextLabel) {
      const movedCards = noteCards.map((card) => card.zone === oldZone.label ? { ...card, zone: nextLabel } : card);
      setNoteCards(movedCards);
      await supabase.from("session_note_cards").update({ zone: nextLabel }).eq("note_id", oldZone.note_id).eq("zone", oldZone.label);
    }
    setEditingZoneId(null);
    setEditingZoneLabel("");
  }

  async function deleteZone(zone: SessionNoteZone) {
    if (!selectedNote) return;
    const ok = window.confirm(`Delete zone "${zone.label}"? Cards in it will move back to Quick notes.`);
    if (!ok) return;
    await supabase.from("session_note_zones").update({ deleted_at: new Date().toISOString() }).eq("id", zone.id);
    await supabase.from("session_note_cards").update({ zone: QUICK_CARD_ZONE }).eq("note_id", selectedNote.id).eq("zone", zone.label);
    setNoteZones((prev) => prev.filter((item) => item.id !== zone.id));
    setNoteCards((prev) => prev.map((card) => card.zone === zone.label ? { ...card, zone: QUICK_CARD_ZONE } : card));
  }

  async function addCardsFromText(text: string, sourceName: string) {
    if (!selectedNote || !user) return;
    const bodies = extractQuickCardBodies(text).slice(0, 80);
    if (!bodies.length) {
      setMessages((prev) => [...prev, { role: "assistant", text: `No readable note text found in ${sourceName}.` }]);
      return;
    }
    const rows = bodies.map((body, index) => ({
      note_id: selectedNote.id,
      client_id: selectedNote.client_id,
      body,
      zone: QUICK_CARD_ZONE,
      sort_order: noteCards.length + index,
      created_by: user.id,
    }));
    const { data, error } = await supabase.from("session_note_cards").insert(rows).select("*");
    if (error || !data) {
      setMessages((prev) => [...prev, { role: "assistant", text: error?.message ?? "Could not import note cards." }]);
      return;
    }
    const nextCards = [...noteCards, ...(data as SessionNoteCard[])];
    const quick_notes = nextCards.map((card) => `[${card.zone}] ${card.body}`).join("\n");
    setNoteCards(nextCards);
    patchSelectedNote({ quick_notes });
    await saveNote({ quick_notes });
    setMessages((prev) => [...prev, { role: "assistant", text: `Imported ${data.length} quick note card${data.length === 1 ? "" : "s"} from ${sourceName}.` }]);
  }

  async function uploadIntoCurrentNote(file: File | null) {
    if (!file || !selectedNote) return;
    const lower = file.name.toLowerCase();
    let text = "";
    if (lower.endsWith(".pdf") || file.type === "application/pdf") {
      const base64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("extract-note-template-from-pdf", {
        body: { fileName: file.name, mimeType: file.type || "application/pdf", base64 },
      });
      if (error || data?.error) {
        setMessages((prev) => [...prev, { role: "assistant", text: data?.error ?? error?.message ?? "Could not read that PDF note." }]);
        return;
      }
      text = data?.text ?? "";
    } else if (lower.endsWith(".docx")) text = await extractDocxText(file);
    else text = await bestEffortText(file);
    await addCardsFromText(text, file.name);
  }


  async function moveQuickCardToZone(cardId: string, zone: string) {
    if (!selectedNote || selectedNote.locked) return;
    const nextCards = noteCards.map((card) => card.id === cardId ? { ...card, zone } : card);
    setNoteCards(nextCards);
    const quick_notes = nextCards.map((card) => `[${card.zone}] ${card.body}`).join("\n");
    patchSelectedNote({ quick_notes });
    await Promise.all([
      supabase.from("session_note_cards").update({ zone }).eq("id", cardId),
      saveNote({ quick_notes }),
    ]);
  }


  async function toggleGoal(goalId: string) {
    if (!selectedNote || !user) return;
    const linked = linkedGoalIds.has(goalId);
    setLinkedGoalIds((prev) => {
      const next = new Set(prev);
      if (linked) next.delete(goalId); else next.add(goalId);
      return next;
    });
    if (linked) {
      await supabase.from("session_note_clinical_goals").delete().eq("note_id", selectedNote.id).eq("clinical_goal_id", goalId);
    } else {
      await supabase.from("session_note_clinical_goals").insert({ note_id: selectedNote.id, clinical_goal_id: goalId, created_by: user.id });
    }
  }

  async function addClinicalGoal(e?: React.FormEvent) {
    e?.preventDefault();
    const title = newClinicalGoalTitle.trim();
    const clientId = selectedNote?.client_id ?? (selectedClientId !== "all" ? selectedClientId : activeClient?.id);
    if (!user || !clientId || !title) return;
    const { data, error } = await supabase
      .from("clinical_goals")
      .insert({
        client_id: clientId,
        title,
        description: "",
        source: "manual",
        is_active: true,
        created_by: user.id,
      })
      .select("*")
      .single();
    if (error || !data) {
      setMessages((prev) => [...prev, { role: "assistant", text: error?.message ?? "Could not add clinical goal." }]);
      return;
    }
    setNewClinicalGoalTitle("");
    setGoals((prev) => [data as ClinicalGoal, ...prev]);
  }

  function startEditingGoal(goal: ClinicalGoal) {
    setEditingGoalId(goal.id);
    setEditingGoalTitle(goal.title);
    setEditingGoalCriteria(goal.mastery_criteria ?? "");
  }

  async function saveEditingGoal() {
    if (!editingGoalId || !editingGoalTitle.trim()) return;
    const patch = { title: editingGoalTitle.trim(), mastery_criteria: editingGoalCriteria.trim() || null };
    const { data, error } = await supabase
      .from("clinical_goals")
      .update(patch)
      .eq("id", editingGoalId)
      .select("*")
      .single();
    if (error || !data) {
      setMessages((prev) => [...prev, { role: "assistant", text: error?.message ?? "Could not save clinical goal." }]);
      return;
    }
    setGoals((prev) => prev.map((goal) => goal.id === editingGoalId ? data as ClinicalGoal : goal));
    setEditingGoalId(null);
    setEditingGoalTitle("");
    setEditingGoalCriteria("");
  }

  async function deleteClinicalGoal(goalId: string) {
    const ok = window.confirm("Delete this clinical goal from this client? Existing note links will be removed.");
    if (!ok) return;
    await supabase.from("clinical_goals").delete().eq("id", goalId);
    setGoals((prev) => prev.filter((goal) => goal.id !== goalId));
    setLinkedGoalIds((prev) => {
      const next = new Set(prev);
      next.delete(goalId);
      return next;
    });
    if (editingGoalId === goalId) setEditingGoalId(null);
  }



  async function createVersion(note: SessionNote, isCheckpoint = false) {
    if (!user) return;
    let branchId = note.current_branch_id ?? null;
    if (!branchId) {
      const { data: existing } = await supabase
        .from("session_note_branches")
        .select("*")
        .eq("note_id", note.id)
        .eq("name", "main")
        .maybeSingle();
      if (existing) branchId = existing.id;
      else {
        const { data: branch } = await supabase
          .from("session_note_branches")
          .insert({ note_id: note.id, name: "main", is_default: true, created_by: user.id })
          .select("*")
          .single();
        branchId = branch?.id ?? null;
      }
    }

    const { data: version } = await supabase
      .from("session_note_versions")
      .insert({
        note_id: note.id,
        branch_id: branchId,
        title: note.title,
        is_checkpoint: isCheckpoint,
        data: note.content || note.insurance_note || note.quick_notes || "",
        created_by: user.id,
      })
      .select("*")
      .single();

    if (version && branchId) {
      await supabase.from("session_note_branches").update({ head_version_id: version.id }).eq("id", branchId);
      await supabase.from("session_notes").update({ current_branch_id: branchId }).eq("id", note.id);
      setVersions((prev) => [version as SessionNoteVersion, ...prev]);
    }
  }

  async function loadBxrPlusExtras(note: SessionNote | null) {
    if (!note) { setVersions([]); setMedia([]); setSuggestions([]); setNoteCards([]); setNoteZones([]); return; }
    const [versionsRes, mediaRes, suggestionsRes, cardsRes, zonesRes] = await Promise.all([
      supabase.from("session_note_versions").select("*").eq("note_id", note.id).order("created_at", { ascending: false }).limit(25),
      supabase.from("session_note_media").select("*").eq("note_id", note.id).order("created_at", { ascending: false }),
      supabase.from("session_note_suggestions").select("*").eq("target_note_id", note.id).eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("session_note_cards").select("*").eq("note_id", note.id).order("sort_order").order("created_at"),
      supabase.from("session_note_zones").select("*").eq("note_id", note.id).is("deleted_at", null).order("sort_order").order("created_at"),
    ]);
    setVersions((versionsRes.data ?? []) as SessionNoteVersion[]);
    setMedia((mediaRes.data ?? []) as SessionNoteMedia[]);
    setSuggestions((suggestionsRes.data ?? []) as NoteSuggestion[]);
    setNoteCards((cardsRes.data ?? []) as SessionNoteCard[]);
    setNoteZones((zonesRes.data ?? []) as SessionNoteZone[]);
  }

  async function restoreVersion(version: SessionNoteVersion) {
    if (!selectedNote) return;
    patchSelectedNote({ content: version.data, insurance_note: version.data, title: version.title });
    await saveNote({ content: version.data, insurance_note: version.data, title: version.title });
    setMessages((prev) => [...prev, { role: "assistant", text: `Restored version from ${new Date(version.created_at).toLocaleString()}.` }]);
  }

  async function toggleLocked() {
    if (!selectedNote) return;
    const locked = !selectedNote.locked;
    patchSelectedNote({ locked });
    await supabase.from("session_notes").update({ locked }).eq("id", selectedNote.id);
  }

  async function togglePublished() {
    if (!selectedNote || selectedNote.locked) return;
    const published = !selectedNote.published;
    const published_at = published ? new Date().toISOString() : selectedNote.published_at ?? null;
    patchSelectedNote({ published, published_at });
    await supabase.from("session_notes").update({ published, published_at }).eq("id", selectedNote.id);
  }

  async function toggleSyncMode() {
    if (!selectedNote) return;
    const sync_mode = selectedNote.sync_mode === "local" ? "cloud" : "local";
    patchSelectedNote({ sync_mode });
    await saveNote({ sync_mode });
  }

  async function restoreNote(noteId: string) {
    await supabase.from("session_notes").update({ deleted_at: null }).eq("id", noteId);
    setNotes((prev) => prev.filter((note) => note.id !== noteId));
  }

  async function duplicateNote() {
    if (!selectedNote || !user) return;
    const { data } = await supabase
      .from("session_notes")
      .insert({
        client_id: selectedNote.client_id,
        folder_id: selectedNote.folder_id,
        service_date: selectedNote.service_date,
        title: `${selectedNote.title} copy`,
        content: selectedNote.content,
        quick_notes: selectedNote.quick_notes,
        insurance_note: selectedNote.insurance_note,
        status: "draft",
        sync_mode: selectedNote.sync_mode ?? "cloud",
        created_by: user.id,
      })
      .select("*")
      .single();
    if (!data) return;
    setNotes((prev) => [data as SessionNote, ...prev]);
    setSelectedNoteId(data.id);
    await createVersion(data as SessionNote, true);
  }

  async function moveSelectedNote(folderId: string | null) {
    if (!selectedNote) return;
    patchSelectedNote({ folder_id: folderId });
    await saveNote({ folder_id: folderId });
  }

  async function uploadMedia(files: FileList | null) {
    if (!files || !selectedNote || !user) return;
    for (const file of Array.from(files)) {
      const storagePath = `${selectedNote.client_id}/${selectedNote.id}/${crypto.randomUUID()}-${file.name}`;
      const { error } = await supabase.storage.from("session-note-media").upload(storagePath, file, { upsert: false, contentType: file.type || guessMime(file.name) });
      if (error) {
        setMessages((prev) => [...prev, { role: "assistant", text: `Media upload failed: ${error.message}` }]);
        continue;
      }
      const type = mediaKind(file);
      const { data } = await supabase
        .from("session_note_media")
        .insert({
          client_id: selectedNote.client_id,
          note_id: selectedNote.id,
          type,
          filename: file.name,
          storage_path: storagePath,
          mime_type: file.type || guessMime(file.name),
          size: file.size,
          created_by: user.id,
        })
        .select("*")
        .single();
      if (data) setMedia((prev) => [data as SessionNoteMedia, ...prev]);
    }
  }

  async function deleteMedia(item: SessionNoteMedia) {
    await supabase.storage.from("session-note-media").remove([item.storage_path]);
    await supabase.from("session_note_media").delete().eq("id", item.id);
    setMedia((prev) => prev.filter((row) => row.id !== item.id));
  }

  async function handleGoalPdfUpload(file: File | null) {
    if (!file || !selectedNote) return;
    setUploadingPdf(true);
    setMessages((prev) => [...prev, { role: "user", text: `Uploaded ${file.name} to extract goals.` }]);
    const base64 = await fileToBase64(file);
    const { data, error } = await supabase.functions.invoke("extract-goals-from-pdf", {
      body: { clientId: selectedNote.client_id, fileName: file.name, mimeType: file.type || "application/pdf", base64 },
    });
    setUploadingPdf(false);
    if (error || data?.error) {
      setMessages((prev) => [...prev, { role: "assistant", text: data?.error ?? error?.message ?? "PDF goal extraction failed." }]);
      return;
    }
    const extracted = (data?.goals ?? []) as ClinicalGoal[];
    setGoals((prev) => [...extracted, ...prev]);
    setMessages((prev) => [...prev, { role: "assistant", text: extracted.length ? `Extracted ${extracted.length} goals. Select the ones tied to this note.` : "I didn’t find goals in that PDF." }]);
  }

  async function typewriterDraft(text: string) {
    if (!selectedNote) return;
    setTypewriterActive(true);
    patchSelectedNote({ content: "", insurance_note: "" });
    const step = Math.max(8, Math.ceil(text.length / 90));
    for (let i = step; i <= text.length + step; i += step) {
      const partial = text.slice(0, Math.min(i, text.length));
      patchSelectedNote({ content: partial, insurance_note: partial });
      await new Promise((resolve) => window.setTimeout(resolve, 12));
    }
    patchSelectedNote({ content: text, insurance_note: text });
    setTypewriterActive(false);
  }

  async function generateDraft() {
    if (!selectedNote) return;
    setAiBusy(true);
    const { data, error } = await supabase.functions.invoke("generate-session-note", {
      body: {
        mode: "draft",
        clientId: selectedNote.client_id,
        noteId: selectedNote.id,
        quickNotes: selectedNote.quick_notes,
        noteCards: noteCards.map(({ id, body, zone, sort_order }) => ({ id, body, zone, sort_order })),
        classifyZones: templateZones,
        classifyZoneOptions,
        insuranceId: selectedNote.insurance_id,
        cptTemplateId: selectedNote.cpt_template_id,
        cptCode: selectedNote.cpt_code,
        sections: {
          settingEvents: selectedNote.setting_events,
          behaviorObservations: selectedNote.behavior_observations,
          interventions: selectedNote.interventions,
          clientResponse: selectedNote.client_response,
          planNextSteps: selectedNote.plan_next_steps,
        },
      },
    });
    setAiBusy(false);
    if (error || data?.error) {
      setMessages((prev) => [...prev, { role: "assistant", text: data?.error ?? error?.message ?? "AI draft failed." }]);
      return;
    }
    const cardZones = Array.isArray(data?.cardZones) ? data.cardZones : [];
    if (cardZones.length) {
      const zoneById = new Map(classifyZoneOptions.map((zone) => [zone.id, zone.label]));
      const allowedZones = new Set(templateZones);
      const updates = cardZones
        .map((item: any) => ({ ...item, zone: item?.zoneId && zoneById.has(item.zoneId) ? zoneById.get(item.zoneId) : item?.zone }))
        .filter((item: any) => item?.id && allowedZones.has(item.zone));
      if (updates.length) {
        const nextCards = noteCards.map((card) => {
          const update = updates.find((item: any) => item.id === card.id);
          return update ? { ...card, zone: update.zone } : card;
        });
        setNoteCards(nextCards);
        await Promise.all(updates.map((item: any) => supabase.from("session_note_cards").update({ zone: item.zone }).eq("id", item.id)));
      }
    }
    await typewriterDraft(data.text || "");
    await saveNote({ content: data.text, insurance_note: data.text, status: "draft" });
    await createVersion({ ...selectedNote, content: data.text, insurance_note: data.text }, true);
    setMessages((prev) => [...prev, { role: "assistant", text: "Draft generated. Review and edit before export." }]);
  }

  async function saveFinalVersion() {
    if (!selectedNote || selectedNote.locked) return;
    const finalText = selectedNote.insurance_note || selectedNote.content || "";
    if (!finalText.trim()) return;
    await saveNote({ content: finalText, insurance_note: finalText, status: "ready" });
    await createVersion({ ...selectedNote, content: finalText, insurance_note: finalText, status: "ready" }, true);
    patchSelectedNote({ content: finalText, insurance_note: finalText, status: "ready" });
    setMessages((prev) => [...prev, { role: "assistant", text: "Saved final note version." }]);
  }

  async function sendChatEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedNote || !chatInput.trim()) return;
    const instruction = chatInput.trim();
    setChatInput("");
    setMessages((prev) => [...prev, { role: "user", text: instruction }]);
    setAiBusy(true);
    const { data, error } = await supabase.functions.invoke("generate-session-note", {
      body: {
        mode: "edit",
        clientId: selectedNote.client_id,
        noteId: selectedNote.id,
        quickNotes: selectedNote.quick_notes,
        noteCards: noteCards.map(({ id, body, zone, sort_order }) => ({ id, body, zone, sort_order })),
        currentDraft: selectedNote.insurance_note,
        instruction,
        insuranceId: selectedNote.insurance_id,
        cptTemplateId: selectedNote.cpt_template_id,
        cptCode: selectedNote.cpt_code,
      },
    });
    setAiBusy(false);
    if (error || data?.error) {
      setMessages((prev) => [...prev, { role: "assistant", text: data?.error ?? error?.message ?? "AI edit failed." }]);
      return;
    }
    patchSelectedNote({ content: data.text, insurance_note: data.text });
    await saveNote({ content: data.text, insurance_note: data.text });
    await createVersion({ ...selectedNote, content: data.text, insurance_note: data.text }, false);
    setMessages((prev) => [...prev, { role: "assistant", text: "Updated the draft." }]);
  }

  if (clientsLoading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading client workspace...</div>;

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#2C2416]">
      <div className="flex min-h-screen">
        <aside className="w-64 shrink-0 border-r border-[#E2DED6] bg-[#F3F0EB] flex flex-col">
          <div className="px-5 py-5 border-b border-[#E2DED6]/70 flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-[#2AA198] text-white grid place-items-center font-serif italic">n</div>
            <div>
              <p className="font-serif italic text-2xl tracking-tight">BXR+</p>
              <p className="text-[11px] text-[#8C8474] -mt-1">BXR+ clinical notes</p>
            </div>
          </div>

          <nav className="px-3 pt-4 space-y-1">
            <button
              onClick={() => { setSelectedClientId("all"); setSelectedFolderId("all"); }}
              className={cn("w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] transition-colors", selectedClientId === "all" ? "bg-[#E8E4DC] font-medium" : "text-[#8C8474] hover:bg-[#E8E4DC]/70")}
            >
              <span>All Notes</span>
              <span className="text-[11px] tabular-nums">{notes.length}</span>
            </button>
          </nav>

          <div className="mt-5 flex-1 overflow-y-auto px-3 pb-4">
            <div className="px-3 mb-2 text-[11px] font-medium uppercase tracking-widest text-[#8C8474]">Client folders</div>
            <div className="space-y-px">
              {clients.map((client, index) => {
                const active = selectedClientId === client.id;
                return (
                  <button
                    key={client.id}
                    onClick={() => { setSelectedClientId(client.id); setSelectedFolderId("all"); setActiveClientId(client.id); }}
                    className={cn("w-full flex items-center justify-between px-3 py-[7px] rounded-xl text-[13px] transition-colors", active ? "bg-[#E8E4DC] font-medium" : "text-[#8C8474] hover:bg-[#E8E4DC]/70")}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: clientColor(index) }} />
                      <span className="truncate">{client.full_name}</span>
                    </span>
                    <span className="text-[11px] tabular-nums">{noteCountsByClient.get(client.id) ?? 0}</span>
                  </button>
                );
              })}
            </div>

            {selectedClientId !== "all" && <><div className="px-3 mt-6 mb-2 text-[11px] font-medium uppercase tracking-widest text-[#8C8474]">Folders inside client</div>
            <div className="space-y-px">
              <button
                onClick={() => setSelectedFolderId("all")}
                className={cn("w-full flex items-center justify-between px-3 py-[7px] rounded-xl text-[13px]", selectedFolderId === "all" ? "bg-[#E8E4DC] font-medium" : "text-[#8C8474] hover:bg-[#E8E4DC]/70")}
              >
                <span>All client notes</span>
              </button>
              <button
                onClick={() => setSelectedFolderId("unfiled")}
                className={cn("w-full flex items-center justify-between px-3 py-[7px] rounded-xl text-[13px]", selectedFolderId === "unfiled" ? "bg-[#E8E4DC] font-medium" : "text-[#8C8474] hover:bg-[#E8E4DC]/70")}
              >
                <span>Unfiled</span>
              </button>
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => setSelectedFolderId(folder.id)}
                  className={cn("w-full flex items-center justify-between px-3 py-[7px] rounded-xl text-[13px]", selectedFolderId === folder.id ? "bg-[#E8E4DC] font-medium" : "text-[#8C8474] hover:bg-[#E8E4DC]/70")}
                >
                  <span className="flex min-w-0 items-center gap-2.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: folder.color }} /><span className="truncate">{folder.name}</span></span>
                </button>
              ))}
            </div>

            </> }
            {selectedClientId !== "all" && <form onSubmit={createFolder} className="mt-4 px-3 space-y-2">
              <Input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Folder name..." className="h-8 bg-transparent text-xs" disabled={selectedClientId === "all"} />
              <div className="flex gap-1.5">
                {SUBFOLDER_COLORS.map((color) => <button key={color} type="button" onClick={() => setNewFolderColor(color)} className={cn("h-4 w-4 rounded-full border-2", newFolderColor === color ? "border-[#2C2416]" : "border-transparent")} style={{ backgroundColor: color }} />)}
              </div>
              <button className="text-[12px] text-[#8C8474] hover:text-[#2C2416]" disabled={!newFolderName.trim() || selectedClientId === "all"}>+ New folder</button>
            </form>}
          </div>
        </aside>

        <main className="flex-1 min-w-0 flex flex-col">
          <header className="min-h-16 border-b border-[#E2DED6] bg-[#FAF8F5]/90 backdrop-blur px-5 py-3 flex flex-wrap items-center gap-3 sticky top-0 z-10">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-widest text-[#8C8474]">Notes</p>
              <h1 className="truncate font-serif text-xl text-[#2C2416]">{selectedClient ? selectedClient.full_name : "Choose where to start"}</h1>
            </div>
            {selectedClient && <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${selectedClient.full_name}'s notes...`} className="max-w-sm bg-white/60" />}
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => { void importFiles(e.currentTarget.files); e.currentTarget.value = ""; }} />
              <input ref={zipInputRef} type="file" accept=".zip,application/zip" className="hidden" onChange={(e) => { void importFiles(e.currentTarget.files); e.currentTarget.value = ""; }} />
              <input ref={folderInputRef} type="file" multiple className="hidden" {...{ webkitdirectory: "", directory: "" }} onChange={(e) => { void importFiles(e.currentTarget.files); e.currentTarget.value = ""; }} />
              <Button variant="outline" size="sm" onClick={() => { window.location.href = "/note-template"; }}>Add templates</Button>
              {selectedClient && <>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>Import notes</Button>
                {selectedClientTemplates.length > 0 && <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)} className="h-9 rounded-md border bg-white px-3 text-sm">
                  {selectedClientTemplates.map((template) => <option key={template.id} value={template.id}>{template.cpt_code} — {template.service_name}</option>)}
                </select>}
                <Button size="sm" onClick={createNote}>{selectedTemplate ? `Start ${selectedTemplate.cpt_code} note` : "Start raw note"}</Button>
                {notes.length > 0 && <Button variant="ghost" size="sm" onClick={() => setView(view === "grid" ? "editor" : "grid")}>{view === "grid" ? "Editor" : "Grid"}</Button>}
                {notes.length > 0 && <Button variant={showTrash ? "default" : "ghost"} size="sm" onClick={() => { setShowTrash((v) => !v); setSelectedFolderId("all"); }}>Trash</Button>}
              </>}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-5 md:p-8">
            {loading ? (
              <div className="text-sm text-[#8C8474]">Loading notes...</div>
            ) : selectedClientId === "all" ? (
              <NotesStart clients={clients} notesCount={notes.length} payersCount={insurancePayers.length} onSelectClient={(clientId) => { setSelectedClientId(clientId); setSelectedFolderId("all"); setActiveClientId(clientId); }} onAddTemplates={() => { window.location.href = "/note-template"; }} />
            ) : view === "grid" ? (
              visibleNotes.length === 0 && !showTrash ? (
                <ClientEmptyState clientName={selectedClient?.full_name ?? "this client"} hasTemplates={selectedClientTemplates.length > 0} selectedTemplateLabel={selectedTemplate ? `${selectedTemplate.cpt_code} ${selectedTemplate.service_name}` : ""} onStartNote={createNote} onAddTemplates={() => { window.location.href = "/note-template"; }} onImport={() => fileInputRef.current?.click()} />
              ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {visibleNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={toBxrPlusNote(note)}
                    folderName={note.folder_id ? folderNameMap.get(note.folder_id) : clients.find((client) => client.id === note.client_id)?.full_name}
                    onOpen={() => { setSelectedNoteId(note.id); setView("editor"); }}
                    onDelete={() => void deleteNote(note.id)}
                  />
                ))}
                {showTrash && visibleNotes.map((note) => (
                  <button key={`restore-${note.id}`} onClick={() => restoreNote(note.id)} className="rounded-3xl border border-dashed border-[#E2DED6] p-4 text-left text-sm text-[#8C8474] hover:border-[#2AA198]">Restore {note.title}</button>
                ))}
                {visibleNotes.length === 0 && <div className="rounded-3xl border border-dashed border-[#E2DED6] p-8 text-[#8C8474]">{showTrash ? "Trash is empty." : "No notes here yet."}</div>}
              </div>
              )
            ) : selectedNote ? (
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <section className="rounded-[28px] border border-[#E2DED6] bg-white p-5 shadow-sm space-y-4">
                  <div className="grid gap-3 md:grid-cols-[1fr_160px_140px]">
                    <Input value={selectedNote.title} onChange={(e) => patchSelectedNote({ title: e.target.value })} onBlur={() => saveNote()} className="text-lg font-serif" disabled={selectedNote.locked} />
                    <Input type="date" value={selectedNote.service_date} onChange={(e) => patchSelectedNote({ service_date: e.target.value })} onBlur={() => saveNote()} disabled={selectedNote.locked} />
                    <select value={selectedNote.status} onChange={(e) => { const status = e.target.value as SessionNote["status"]; patchSelectedNote({ status }); void saveNote({ status }); }} className="h-10 rounded-md border bg-background px-3 text-sm" disabled={selectedNote.locked}>
                      <option value="draft">Draft</option><option value="ready">Ready</option><option value="submitted">Submitted</option>
                    </select>
                  </div>

                  <div className="grid gap-3 rounded-2xl border bg-[#FAF8F5] p-3 md:grid-cols-2">
                    <div>
                      <p className="mb-1 text-[11px] font-medium uppercase tracking-widest text-[#8C8474]">Insurance</p>
                      <select
                        value={selectedNoteEffectiveInsuranceId ?? ""}
                        onChange={async (e) => {
                          const insuranceId = e.target.value || null;
                          const rows = await fetchTemplatesForInsurance(insuranceId);
                          const template = rows[0];
                          patchSelectedNote({ insurance_id: insuranceId, cpt_template_id: template?.id ?? null, cpt_code: template?.cpt_code ?? null });
                          void saveNote({ insurance_id: insuranceId, cpt_template_id: template?.id ?? null, cpt_code: template?.cpt_code ?? null });
                        }}
                        className="h-10 w-full rounded-md border bg-white px-3 text-sm"
                        disabled={selectedNote.locked}
                      >
                        <option value="">No insurance selected</option>
                        {insurancePayers.map((payer) => <option key={payer.id} value={payer.id}>{payer.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <p className="mb-1 text-[11px] font-medium uppercase tracking-widest text-[#8C8474]">CPT template</p>
                      <select
                        value={selectedNoteEffectiveTemplateId}
                        onChange={(e) => {
                          const template = cptTemplates.find((row) => row.id === e.target.value);
                          patchSelectedNote({ insurance_id: template?.insurance_id ?? selectedNoteEffectiveInsuranceId, cpt_template_id: template?.id ?? null, cpt_code: template?.cpt_code ?? null });
                          void saveNote({ insurance_id: template?.insurance_id ?? selectedNoteEffectiveInsuranceId, cpt_template_id: template?.id ?? null, cpt_code: template?.cpt_code ?? null });
                          if (template) void materializeTemplateZones({ ...selectedNote, insurance_id: template.insurance_id, cpt_template_id: template.id, cpt_code: template.cpt_code }, template);
                        }}
                        className="h-10 w-full rounded-md border bg-white px-3 text-sm"
                        disabled={selectedNote.locked}
                      >
                        <option value="">No CPT selected</option>
                        {selectedNoteTemplateOptions.map((template) => <option key={template.id} value={template.id}>{template.cpt_code} — {template.service_name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-[#FAF8F5] p-3">
                    <select value={selectedNote.folder_id ?? ""} onChange={(e) => moveSelectedNote(e.target.value || null)} className="h-9 rounded-md border bg-white px-3 text-sm">
                      <option value="">Unfiled</option>
                      {folders.filter((folder) => folder.client_id === selectedNote.client_id).map((folder) => <option key={folder.id} value={folder.id}>{folder.path || folder.name}</option>)}
                    </select>
                    <Button variant="outline" size="sm" onClick={() => createVersion(selectedNote, true)}>Checkpoint</Button>
                    <Button variant="outline" size="sm" onClick={duplicateNote}>Duplicate</Button>
                    <Button variant={selectedNote.locked ? "default" : "outline"} size="sm" onClick={toggleLocked}>{selectedNote.locked ? "Unlock" : "Lock"}</Button>
                    <Button variant={selectedNote.published ? "default" : "outline"} size="sm" onClick={togglePublished} disabled={selectedNote.locked}>{selectedNote.published ? "Unpublish" : "Publish"}</Button>
                    <Button variant="outline" size="sm" onClick={toggleSyncMode}>Sync: {selectedNote.sync_mode ?? "cloud"}</Button>
                    <input ref={currentNoteUploadRef} type="file" className="hidden" accept=".pdf,.txt,.md,.markdown,.doc,.docx,.csv,.rtf,text/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => { const file = e.currentTarget.files?.[0] ?? null; e.currentTarget.value = ""; void uploadIntoCurrentNote(file); }} />
                    <Button variant="outline" size="sm" onClick={() => currentNoteUploadRef.current?.click()}>Upload note into current note</Button>
                    <Button variant="outline" size="sm" onClick={() => deleteNote(selectedNote.id)}>Trash</Button>
                  </div>

                  <div className="rounded-[28px] border bg-[#FAF8F5] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-widest text-[#8C8474]">Quick note cards</p>
                        <p className="text-xs text-[#8C8474]">Add one observation at a time. Drag cards into the section where they belong.</p>
                      </div>
                      {lastAddedCard && <Badge className="bg-[#2AA198]">Added ✓</Badge>}
                    </div>
                    <form onSubmit={addQuickCard} className="flex gap-2">
                      <Input value={quickCardInput} onChange={(e) => setQuickCardInput(e.target.value)} placeholder="Type one note, then hit Add..." className="h-11 bg-white" disabled={selectedNote.locked} />
                      <Button type="submit" size="lg" disabled={selectedNote.locked || !quickCardInput.trim()}>{lastAddedCard ? "Added" : "Add"}</Button>
                    </form>
                    <CardZone title={QUICK_CARD_ZONE} helper="New cards land here first. Drag them into a template zone later." cards={quickCards} disabled={!!selectedNote.locked} activeCardId={lastAddedCard} inputValue="" onInputChange={() => undefined} onAddCard={() => undefined} onMoveCard={moveQuickCardToZone} hideInput />
                  </div>

                  <div>
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-widest text-[#8C8474]">Template zones</p>
                        <p className="text-xs text-[#8C8474]">These zones come from the selected payer/CPT template. Drag cards here for visual sorting; AI consolidates them into the final report.</p>
                      </div>
                      <form onSubmit={addCustomZone} className="flex gap-2">
                        <Input value={newZoneLabel} onChange={(e) => setNewZoneLabel(e.target.value)} placeholder="Add zone..." className="h-9 w-40 bg-white text-sm" />
                        <Button type="submit" size="sm" disabled={!newZoneLabel.trim()}>Add Zone</Button>
                      </form>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {templateZones.map((zone) => {
                        const persistedZone = noteZones.find((item) => item.label === zone);
                        return (
                          <div key={persistedZone?.id ?? zone} className="space-y-2">
                            {persistedZone && (
                              <div className="flex items-center justify-between gap-2 rounded-2xl border bg-white px-3 py-2 text-xs">
                                {editingZoneId === persistedZone.id ? (
                                  <div className="flex flex-1 gap-2">
                                    <Input value={editingZoneLabel} onChange={(e) => setEditingZoneLabel(e.target.value)} className="h-8 text-xs" autoFocus />
                                    <Button size="sm" onClick={saveEditingZone} disabled={!editingZoneLabel.trim()}>Save</Button>
                                    <Button size="sm" variant="outline" onClick={() => setEditingZoneId(null)}>Cancel</Button>
                                  </div>
                                ) : (
                                  <>
                                    <span className="text-[#8C8474]">{persistedZone.source === "template" ? "Template zone" : "Custom zone"}</span>
                                    <div className="flex gap-1">
                                      <Button size="sm" variant="ghost" onClick={() => startEditingZone(persistedZone)} disabled={selectedNote.locked}>Edit</Button>
                                      <Button size="sm" variant="ghost" onClick={() => deleteZone(persistedZone)} disabled={selectedNote.locked}>Delete</Button>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                            <CardZone title={zone} cards={noteCards.filter((card) => card.zone === zone)} disabled={!!selectedNote.locked} activeCardId={lastAddedCard} inputValue={zoneCardInputs[zone] ?? ""} onInputChange={(value) => setZoneCardInputs((prev) => ({ ...prev, [zone]: value }))} onAddCard={() => addZoneCard(zone)} onMoveCard={moveQuickCardToZone} />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-xs font-medium uppercase tracking-widest text-[#8C8474]">Insurance-facing final</p>
                      <div className="flex gap-2"><Button variant="outline" size="sm" onClick={generateDraft} disabled={aiBusy || typewriterActive}>{aiBusy ? "Classifying cards..." : typewriterActive ? "Writing..." : "Generate draft"}</Button><Button size="sm" onClick={() => navigator.clipboard.writeText(selectedNote.insurance_note)} disabled={!selectedNote.insurance_note}>Copy export</Button></div>
                    </div>
                    <Textarea value={selectedNote.insurance_note} onChange={(e) => patchSelectedNote({ insurance_note: e.target.value, content: e.target.value })} onBlur={() => saveNote()} className="min-h-[420px] rounded-2xl font-serif text-lg leading-8" placeholder="AI draft or final note..." disabled={selectedNote.locked} />
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-[#FAF8F5] p-3">
                      <p className="text-xs text-[#8C8474]">Save locks this draft into version history so the AI-assisted final can be recovered later.</p>
                      <Button onClick={saveFinalVersion} disabled={selectedNote.locked || saving || !selectedNote.insurance_note.trim()}>Save final version</Button>
                    </div>
                  </div>

                  <div className="text-xs text-[#8C8474]">{saving ? "Saving..." : `Last saved ${new Date(selectedNote.updated_at).toLocaleString()}`}</div>
                </section>

                <aside className="space-y-4">
                  <section className="rounded-[28px] border border-[#E2DED6] bg-white p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between"><div><p className="text-sm font-semibold">Media</p><p className="text-xs text-[#8C8474]">BXR+ workspace attachments for this note.</p></div><Button variant="outline" size="sm" onClick={() => mediaInputRef.current?.click()}>Upload</Button></div>
                    <input ref={mediaInputRef} type="file" multiple className="hidden" onChange={(e) => { void uploadMedia(e.currentTarget.files); e.currentTarget.value = ""; }} />
                    <div className="space-y-2 max-h-[180px] overflow-y-auto">
                      {media.map((item) => <div key={item.id} className="flex items-center justify-between gap-2 rounded-2xl border p-3 text-sm"><div className="min-w-0"><p className="truncate font-medium">{item.filename}</p><p className="text-xs text-[#8C8474]">{item.type} · {Math.round(item.size / 1024)} KB</p></div><Button variant="outline" size="sm" onClick={() => deleteMedia(item)}>Delete</Button></div>)}
                      {media.length === 0 && <p className="rounded-2xl border p-3 text-sm text-[#8C8474]">No media attached.</p>}
                    </div>
                  </section>

                  <section className="rounded-[28px] border border-[#E2DED6] bg-white p-4 shadow-sm space-y-3">
                    <div><p className="text-sm font-semibold">Version history</p><p className="text-xs text-[#8C8474]">Checkpoints and AI edits.</p></div>
                    <div className="space-y-2 max-h-[180px] overflow-y-auto">
                      {versions.map((version) => <button key={version.id} onClick={() => restoreVersion(version)} className="w-full rounded-2xl border p-3 text-left text-sm hover:bg-[#FAF8F5]"><div className="flex items-center justify-between"><span className="font-medium truncate">{version.title}</span><Badge>{version.is_checkpoint ? "checkpoint" : "edit"}</Badge></div><p className="text-xs text-[#8C8474]">{new Date(version.created_at).toLocaleString()}</p></button>)}
                      {versions.length === 0 && <p className="rounded-2xl border p-3 text-sm text-[#8C8474]">No versions yet.</p>}
                    </div>
                  </section>

                  <section className="rounded-[28px] border border-[#E2DED6] bg-white p-4 shadow-sm space-y-3">
                    <div><p className="text-sm font-semibold">Prior-session suggestions</p><p className="text-xs text-[#8C8474]">Optional carry-forward context. Click to add only when accurate.</p></div>
                    <div className="space-y-2 max-h-[220px] overflow-y-auto">
                      {suggestions.map((suggestion) => (
                        <div key={suggestion.id} className="rounded-2xl border p-3 text-sm">
                          <p className="text-[#2C2416]">{suggestion.suggestion_text}</p>
                          {suggestion.rationale && <p className="mt-1 text-xs text-[#8C8474]">{suggestion.rationale}</p>}
                          <div className="mt-3 flex gap-2">
                            <Button size="sm" onClick={() => acceptSuggestion(suggestion)}>Add to note</Button>
                            <Button variant="outline" size="sm" onClick={() => dismissSuggestion(suggestion.id)}>Dismiss</Button>
                          </div>
                        </div>
                      ))}
                      {suggestions.length === 0 && <p className="rounded-2xl border p-3 text-sm text-[#8C8474]">No follow-up suggestions yet.</p>}
                    </div>
                  </section>

                  <section className="rounded-[28px] border border-[#E2DED6] bg-white p-4 shadow-sm space-y-3">
                    <div><p className="text-sm font-semibold">Clinical goals</p><p className="text-xs text-[#8C8474]">BCBA insurance-facing goals, separate from BXR+ point/work goals.</p></div>
                    <form onSubmit={addClinicalGoal} className="flex gap-2">
                      <Input value={newClinicalGoalTitle} onChange={(e) => setNewClinicalGoalTitle(e.target.value)} placeholder="Add BCBA clinical goal..." className="h-9 text-sm" />
                      <Button type="submit" size="sm" disabled={!newClinicalGoalTitle.trim()}>Add</Button>
                    </form>
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed bg-[#FAF8F5] px-3 py-4 text-center text-sm text-[#8C8474] hover:border-[#2AA198]">
                      <span>{uploadingPdf ? "Extracting..." : "Upload clinical goals PDF"}</span>
                      <input type="file" accept="application/pdf,.pdf" className="hidden" disabled={uploadingPdf} onChange={(e) => { const file = e.currentTarget.files?.[0] ?? null; e.currentTarget.value = ""; void handleGoalPdfUpload(file); }} />
                    </label>
                    <div className="space-y-2 max-h-[320px] overflow-y-auto">
                      {goals.map((goal) => {
                        const linked = linkedGoalIds.has(goal.id);
                        const editing = editingGoalId === goal.id;
                        return (
                          <div key={goal.id} className={cn("rounded-2xl border p-3 text-sm", linked ? "border-[#2AA198] bg-[#2AA198]/10" : "bg-white")}>
                            {editing ? (
                              <div className="space-y-2">
                                <Input value={editingGoalTitle} onChange={(e) => setEditingGoalTitle(e.target.value)} className="h-9 text-sm" autoFocus />
                                <Textarea value={editingGoalCriteria} onChange={(e) => setEditingGoalCriteria(e.target.value)} className="min-h-[70px] rounded-xl text-sm" placeholder="Mastery criteria / target details..." />
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={saveEditingGoal} disabled={!editingGoalTitle.trim()}>Save</Button>
                                  <Button size="sm" variant="outline" onClick={() => setEditingGoalId(null)}>Cancel</Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <button onClick={() => toggleGoal(goal.id)} className="w-full text-left">
                                  <div className="flex gap-2 justify-between">
                                    <span className="font-medium">{goal.title}</span>
                                    <Badge>{linked ? "Selected" : "Select"}</Badge>
                                  </div>
                                  {goal.mastery_criteria && <p className="mt-1 text-xs text-[#8C8474]">{goal.mastery_criteria}</p>}
                                </button>
                                <div className="mt-3 flex gap-2">
                                  <Button size="sm" variant="outline" onClick={() => startEditingGoal(goal)}>Edit</Button>
                                  <Button size="sm" variant="ghost" onClick={() => deleteClinicalGoal(goal.id)}>Delete</Button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                      {goals.length === 0 && <p className="rounded-2xl border p-3 text-sm text-[#8C8474]">No active clinical goals for this client yet. Add one quickly or upload a PDF goal set.</p>}
                    </div>
                  </section>

                  <section className="rounded-[28px] border border-[#E2DED6] bg-white shadow-sm overflow-hidden">
                    <button onClick={() => setChatOpen((v) => !v)} className="w-full flex items-center justify-between px-4 py-3 border-b text-left"><div><p className="text-sm font-semibold">AI editor</p><p className="text-xs text-[#8C8474]">Revise the generated draft.</p></div><span>{chatOpen ? "−" : "+"}</span></button>
                    {chatOpen && <div className="p-3 space-y-3"><div className="space-y-2 max-h-[300px] overflow-y-auto">{messages.map((message, i) => <div key={i} className={cn("rounded-2xl px-3 py-2 text-sm", message.role === "user" ? "bg-[#2AA198] text-white ml-6" : "bg-[#F3F0EB] mr-6")}>{message.text}</div>)}</div><form onSubmit={sendChatEdit} className="space-y-2"><Textarea value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Make it more objective..." className="min-h-[80px]" /><Button type="submit" className="w-full" disabled={aiBusy || !chatInput.trim() || !selectedNote.insurance_note.trim()}>Send edit</Button></form></div>}
                  </section>
                </aside>
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-[#E2DED6] p-8 text-[#8C8474]">Select or create a note.</div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function NotesStart({ clients, notesCount, payersCount, onSelectClient, onAddTemplates }: { clients: Array<{ id: string; full_name: string }>; notesCount: number; payersCount: number; onSelectClient: (clientId: string) => void; onAddTemplates: () => void }) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-[32px] border border-[#E2DED6] bg-white p-6 shadow-sm md:p-8">
        <p className="text-xs font-medium uppercase tracking-widest text-[#8C8474]">Start here</p>
        <h2 className="mt-2 font-serif text-3xl text-[#2C2416]">Who are you writing notes for?</h2>
        <p className="mt-2 max-w-2xl text-sm text-[#6F6759]">Pick a client and start typing. Templates help later when you generate the insurance-facing note.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client, index) => (
            <button key={client.id} onClick={() => onSelectClient(client.id)} className="group rounded-3xl border border-[#E2DED6] bg-[#FAF8F5] p-4 text-left transition hover:border-[#2AA198] hover:bg-[#2AA198]/5">
              <span className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: clientColor(index) }} />
                <span className="font-medium text-[#2C2416]">{client.full_name}</span>
              </span>
              <span className="mt-3 block text-sm text-[#8C8474] group-hover:text-[#2AA198]">Open client notes →</span>
            </button>
          ))}
        </div>
        {clients.length === 0 && <div className="mt-6 rounded-3xl border border-dashed border-[#E2DED6] p-6 text-sm text-[#8C8474]">Add your first client from the main sidebar, then come back here to start notes.</div>}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <button onClick={onAddTemplates} className="rounded-[28px] border border-[#E2DED6] bg-white p-5 text-left shadow-sm transition hover:border-[#2AA198] hover:bg-[#2AA198]/5">
          <p className="text-sm font-semibold text-[#2C2416]">Add payer templates</p>
          <p className="mt-1 text-sm text-[#6F6759]">Upload Cigna, Tricare, or other payer CPT templates once so final notes match what each payer expects.</p>
          <p className="mt-4 text-sm font-medium text-[#2AA198]">Open Note Template →</p>
        </button>
        <div className="rounded-[28px] border border-[#E2DED6] bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-[#2C2416]">Workspace status</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-2xl bg-[#FAF8F5] p-3"><p className="font-semibold">{clients.length}</p><p className="text-xs text-[#8C8474]">clients</p></div>
            <div className="rounded-2xl bg-[#FAF8F5] p-3"><p className="font-semibold">{notesCount}</p><p className="text-xs text-[#8C8474]">notes</p></div>
            <div className="rounded-2xl bg-[#FAF8F5] p-3"><p className="font-semibold">{payersCount}</p><p className="text-xs text-[#8C8474]">payers</p></div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ClientEmptyState({ clientName, hasTemplates, selectedTemplateLabel, onStartNote, onAddTemplates, onImport }: { clientName: string; hasTemplates: boolean; selectedTemplateLabel: string; onStartNote: () => void; onAddTemplates: () => void; onImport: () => void }) {
  return (
    <div className="mx-auto max-w-3xl rounded-[32px] border border-[#E2DED6] bg-white p-6 shadow-sm md:p-8">
      <p className="text-xs font-medium uppercase tracking-widest text-[#8C8474]">{clientName}</p>
      <h2 className="mt-2 font-serif text-3xl text-[#2C2416]">Start with raw session notes.</h2>
      <p className="mt-2 text-sm text-[#6F6759]">You do not have to tag goals or complete insurance fields first. Start typing what happened; organize and link goals after the session.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button size="lg" onClick={onStartNote}>{hasTemplates ? `Start ${selectedTemplateLabel || "note"}` : "Start raw note"}</Button>
        <Button size="lg" variant="outline" onClick={onAddTemplates}>{hasTemplates ? "Manage templates" : "Add payer templates"}</Button>
        <Button size="lg" variant="ghost" onClick={onImport}>Import old notes</Button>
      </div>
      {!hasTemplates && <div className="mt-5 rounded-2xl border border-dashed border-[#E2DED6] bg-[#FAF8F5] p-4 text-sm text-[#6F6759]">No payer template is connected yet. That is okay — capture the session now, then add templates before generating the final insurance-facing note.</div>}
    </div>
  );
}

function CardZone({ title, helper, cards, disabled, activeCardId, inputValue, hideInput, onInputChange, onAddCard, onMoveCard }: { title: string; helper?: string; cards: SessionNoteCard[]; disabled: boolean; activeCardId: string; inputValue: string; hideInput?: boolean; onInputChange: (value: string) => void; onAddCard: () => void; onMoveCard: (cardId: string, zone: string) => void }) {
  return (
    <section
      onDragOver={(e) => { if (!disabled) e.preventDefault(); }}
      onDrop={(e) => {
        if (disabled) return;
        e.preventDefault();
        const cardId = e.dataTransfer.getData("application/x-bxr-card-id");
        if (cardId) void onMoveCard(cardId, title);
      }}
      className="min-h-[150px] rounded-3xl border border-dashed border-[#D8D1C5] bg-white p-3 transition hover:border-[#2AA198]"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#8C8474]">{title}</p>
          {helper && <p className="mt-1 text-xs text-[#8C8474]">{helper}</p>}
        </div>
        <Badge variant="secondary">{cards.length}</Badge>
      </div>
      {!hideInput && <form onSubmit={(e) => { e.preventDefault(); onAddCard(); }} className="mb-3 flex gap-2">
        <Input value={inputValue} onChange={(e) => onInputChange(e.target.value)} placeholder={`Add note to ${title}...`} className="h-9 bg-[#FAF8F5] text-sm" disabled={disabled} />
        <Button type="submit" size="sm" disabled={disabled || !inputValue.trim()}>Add</Button>
      </form>}
      <div className="space-y-2">
        {cards.map((card) => (
          <div
            key={card.id}
            draggable={!disabled}
            onDragStart={(e) => { e.dataTransfer.setData("application/x-bxr-card-id", card.id); e.dataTransfer.effectAllowed = "move"; }}
            className={cn("cursor-grab rounded-2xl border bg-[#FAF8F5] p-3 text-sm shadow-sm active:cursor-grabbing", card.id === activeCardId ? "border-[#2AA198] ring-2 ring-[#2AA198]/20" : "border-[#E2DED6]")}
          >
            <div className="flex items-start gap-2">
              <span className="mt-1 text-[#8C8474]">⋮⋮</span>
              <p className="text-[#2C2416]">{card.body}</p>
            </div>
          </div>
        ))}
        {cards.length === 0 && <p className="rounded-2xl border border-dashed bg-white p-4 text-sm text-[#8C8474]">Drop cards here.</p>}
      </div>
    </section>
  );
}


function buildTemplateZones(template: CptTemplate | undefined) {
  const zones = (template?.required_sections ?? []).map((section) => String(section).trim()).filter(Boolean);
  return zones.length ? zones : FALLBACK_TEMPLATE_ZONES;
}

function buildTemplateText(clientName: string, template: CptTemplate | undefined, settingEvents: string) {
  const uploaded = template?.template_body?.trim();
  if (uploaded) {
    return uploaded
      .replace(/\{\{client\}\}/g, clientName)
      .replace(/\{\{client_name\}\}/g, clientName)
      .replace(/\{\{date\}\}/g, todayISO())
      .replace(/\{\{cpt_code\}\}/g, template?.cpt_code ?? "")
      .replace(/\{\{setting_events\}\}/g, settingEvents);
  }
  const title = template?.template_title ?? "Raw session note";
  const sections = template?.required_sections?.length ? template.required_sections : [];
  if (!sections.length) {
    return [`${title}`, `Client: ${clientName}`, `Date: ${todayISO()}`, template?.cpt_code ? `CPT: ${template.cpt_code} — ${template.service_name}` : "", "", "Raw session notes:\n"].filter(Boolean).join("\n\n");
  }
  return [`${title}`, `Client: ${clientName}`, `Date: ${todayISO()}`, template?.cpt_code ? `CPT: ${template.cpt_code} — ${template.service_name}` : "", "", ...sections.map((section) => `${section}:\n${section.toLowerCase().includes("setting") ? settingEvents : ""}`)].filter(Boolean).join("\n\n");
}

function appendSection(text: string, heading: string, addition: string) {
  const clean = addition.trim();
  if (!clean) return text;
  const pattern = new RegExp(`(${heading}:\\n)([\\s\\S]*?)(?=\\n\\n[A-Z][^\\n]{2,80}:|$)`, "i");
  if (!pattern.test(text)) return `${text.trim()}\n\n${heading}:\n${clean}`;
  return text.replace(pattern, (_match, start, body) => `${start}${body.trim() && !body.includes("[add") ? `${body.trim()}\n${clean}` : clean}`);
}

function fileToBase64(file: File): Promise<string> {
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

function slugifyZone(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "zone";
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

function extractQuickCardBodies(text: string) {
  return text
    .replace(/\r/g, "")
    .split(/\n{1,}|(?<=[.!?])\s+(?=[A-Z0-9])/g)
    .map((line) => line.replace(/^[-•*\d.)\s]+/, "").trim())
    .filter((line) => line.length >= 8)
    .map((line) => line.length > 500 ? `${line.slice(0, 500).trim()}…` : line);
}

async function bestEffortText(file: File) {
  try {
    const text = await file.text();
    const printable = text.replace(/[\x00-\x08\x0E-\x1F]/g, "").trim();
    if (printable.length >= Math.min(20, text.length)) return text;
  } catch (_) {
    // Binary file or unreadable encoding; fall through to placeholder.
  }
  return `Imported file: ${file.name}`;
}

function guessMime(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "text/markdown";
  if (lower.endsWith(".txt")) return "text/plain";
  if (lower.endsWith(".csv")) return "text/csv";
  return "application/octet-stream";
}

function mediaKind(file: File): SessionNoteMedia["type"] {
  const mime = file.type || guessMime(file.name);
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "application/pdf") return "pdf";
  return "file";
}
