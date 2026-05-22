import { useEffect, useMemo, useState } from "react";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import { Plus, Sparkles, Save, FileText, Pencil, FolderPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const DEFAULT_SECTIONS = [
  { name: "Setting Events", description: "Affect, health, sleep, transitions, and environmental variables observed before or during session." },
  { name: "Parent Concerns", description: "Caregiver priorities, home updates, and current clinical concerns." },
  { name: "Goals Targeted", description: "Skills, programs, ABA methods, and treatment targets addressed during session." },
  { name: "Progress Observed", description: "Objective gains, independence, prompting changes, and successful responding." },
  { name: "Barriers Included", description: "Maladaptive behavior, denied access, motivation, attention, transitions, or other barriers." },
  { name: "Goals Modified", description: "Goals changed, added, held, or discontinued based on data and clinical judgment." },
  { name: "Targets Modified", description: "Specific target-level changes, prompt changes, mastery changes, or teaching adjustments." },
  { name: "Why Changes Were Made", description: "Clinical rationale for any program or target adjustments." },
  { name: "Plan for Next Time", description: "Next-session priorities, reinforcement plan, prompting, and caregiver/staff follow-up." },
];

type Category = {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_default: boolean;
  is_active: boolean;
};

type SessionNote = {
  id: string;
  client_id: string;
  category_id: string | null;
  service_date: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

type SessionReport = {
  id: string;
  client_id: string;
  service_date: string;
  title: string;
  content_html: string;
  updated_at: string;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function paragraphs(text: string) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function generateSessionReportHtml(clientName: string, serviceDate: string, categories: Category[], notes: SessionNote[]) {
  const byCategory = new Map<string, SessionNote[]>();
  notes.forEach((note) => {
    const key = note.category_id ?? "uncategorized";
    byCategory.set(key, [...(byCategory.get(key) ?? []), note]);
  });

  const sections = categories
    .filter((category) => byCategory.has(category.id))
    .map((category) => {
      const categoryNotes = byCategory.get(category.id) ?? [];
      const body = categoryNotes.flatMap((note) => paragraphs(note.content));
      return { category, body };
    });

  const other = byCategory.get("uncategorized") ?? [];

  const sectionHtml = sections.map(({ category, body }) => `
    <h2>${escapeHtml(category.name)}</h2>
    ${body.length > 0
      ? body.map((line) => `<p>${escapeHtml(line)}</p>`).join("")
      : `<p>No specific notes were entered for this section.</p>`}
  `).join("");

  const otherHtml = other.length > 0 ? `
    <h2>Additional Notes</h2>
    ${other.flatMap((note) => paragraphs(note.content)).map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
  ` : "";

  return `
    <h1>Session Note</h1>
    <p><strong>Client:</strong> ${escapeHtml(clientName)}</p>
    <p><strong>Date of Service:</strong> ${escapeHtml(serviceDate)}</p>
    <p>During today's session, ABA-based treatment procedures were implemented to address the client's active goals, reduce barriers to learning, and strengthen functional communication, cooperation, and skill acquisition.</p>
    ${sectionHtml}
    ${otherHtml}
    <h2>Clinical Summary</h2>
    <p>The session notes above were organized into the clinic's default documentation sections and should be reviewed by the BCBA for final clinical language, medical necessity, and payer-specific requirements before submission.</p>
  `;
}

export default function SessionNotesTab({ clientId, clientName }: { clientId: string; clientName: string }) {
  const { user } = useAuth();
  const [serviceDate, setServiceDate] = useState(todayISO());
  const [categories, setCategories] = useState<Category[]>([]);
  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [reports, setReports] = useState<SessionReport[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [editingNote, setEditingNote] = useState<SessionNote | null>(null);
  const [noteTitle, setNoteTitle] = useState("Session observation");
  const [noteContent, setNoteContent] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [activeReport, setActiveReport] = useState<SessionReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const editor = useEditor({
    extensions: [StarterKit],
    content: activeReport?.content_html || "<p>Generate a report from the session notes to start editing.</p>",
    editorProps: {
      attributes: {
        class: "min-h-[320px] rounded-[24px] border bg-background px-4 py-3 text-base leading-7 outline-none prose prose-sm max-w-none focus:ring-2 focus:ring-primary/20",
      },
    },
  });

  useEffect(() => {
    if (editor) editor.commands.setContent(activeReport?.content_html || "<p>Generate a report from the session notes to start editing.</p>");
  }, [activeReport, editor]);

  const notesForDate = useMemo(() => notes.filter((note) => note.service_date === serviceDate), [notes, serviceDate]);
  const reportForDate = useMemo(() => reports.find((report) => report.service_date === serviceDate) ?? null, [reports, serviceDate]);

  async function load() {
    setLoading(true);
    const [{ data: categoryRows }, { data: noteRows }, { data: reportRows }] = await Promise.all([
      supabase.from("session_note_categories").select("*").eq("client_id", clientId).eq("is_active", true).order("sort_order"),
      supabase.from("session_notes").select("*").eq("client_id", clientId).order("service_date", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("session_note_reports").select("*").eq("client_id", clientId).order("service_date", { ascending: false }),
    ]);

    if (!categoryRows || categoryRows.length === 0) {
      const inserts = DEFAULT_SECTIONS.map((section, index) => ({
        client_id: clientId,
        name: section.name,
        description: section.description,
        sort_order: index,
        is_default: true,
        created_by: user?.id ?? null,
      }));
      const { data: seeded } = await supabase.from("session_note_categories").insert(inserts).select("*").order("sort_order");
      setCategories((seeded ?? []) as Category[]);
      setSelectedCategoryId(seeded?.[0]?.id ?? "");
    } else {
      setCategories(categoryRows as Category[]);
      setSelectedCategoryId((prev) => prev || categoryRows[0]?.id || "");
    }

    setNotes((noteRows ?? []) as SessionNote[]);
    setReports((reportRows ?? []) as SessionReport[]);
    setActiveReport(((reportRows ?? []) as SessionReport[]).find((report) => report.service_date === serviceDate) ?? null);
    setLoading(false);
  }

  useEffect(() => { load(); }, [clientId]);

  useEffect(() => {
    setActiveReport(reportForDate);
  }, [reportForDate]);

  function startEdit(note: SessionNote) {
    setEditingNote(note);
    setSelectedCategoryId(note.category_id ?? "");
    setNoteTitle(note.title);
    setNoteContent(note.content);
  }

  function resetComposer() {
    setEditingNote(null);
    setNoteTitle("Session observation");
    setNoteContent("");
  }

  async function saveNote() {
    if (!noteContent.trim()) return;
    setBusy(true);
    const payload = {
      client_id: clientId,
      category_id: selectedCategoryId || null,
      service_date: serviceDate,
      title: noteTitle || "Session observation",
      content: noteContent.trim(),
      created_by: user?.id ?? null,
      updated_at: new Date().toISOString(),
    };

    if (editingNote) {
      const { data } = await supabase.from("session_notes").update(payload).eq("id", editingNote.id).select("*").single();
      if (data) setNotes((prev) => prev.map((note) => note.id === editingNote.id ? data as SessionNote : note));
    } else {
      const { data } = await supabase.from("session_notes").insert(payload).select("*").single();
      if (data) setNotes((prev) => [data as SessionNote, ...prev]);
    }
    resetComposer();
    setBusy(false);
  }

  async function addCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    setBusy(true);
    const { data } = await supabase.from("session_note_categories").insert({
      client_id: clientId,
      name,
      description: "Custom documentation group.",
      sort_order: categories.length + 1,
      is_default: false,
      created_by: user?.id ?? null,
    }).select("*").single();
    if (data) {
      setCategories((prev) => [...prev, data as Category]);
      setSelectedCategoryId(data.id);
    }
    setNewCategoryName("");
    setBusy(false);
  }

  async function generateReport() {
    setBusy(true);
    const html = generateSessionReportHtml(clientName, serviceDate, categories, notesForDate);
    const payload = {
      client_id: clientId,
      service_date: serviceDate,
      title: `${clientName} session note — ${serviceDate}`,
      content_html: html,
      generated_from: { note_ids: notesForDate.map((note) => note.id), category_ids: categories.map((category) => category.id) },
      created_by: user?.id ?? null,
      updated_at: new Date().toISOString(),
    };

    if (reportForDate) {
      const { data } = await supabase.from("session_note_reports").update(payload).eq("id", reportForDate.id).select("*").single();
      if (data) {
        setReports((prev) => prev.map((report) => report.id === data.id ? data as SessionReport : report));
        setActiveReport(data as SessionReport);
      }
    } else {
      const { data } = await supabase.from("session_note_reports").insert(payload).select("*").single();
      if (data) {
        setReports((prev) => [data as SessionReport, ...prev]);
        setActiveReport(data as SessionReport);
      }
    }
    setBusy(false);
  }

  async function saveReport() {
    if (!activeReport || !editor) return;
    setBusy(true);
    const content_html = editor.getHTML();
    const { data } = await supabase.from("session_note_reports").update({ content_html, updated_at: new Date().toISOString() }).eq("id", activeReport.id).select("*").single();
    if (data) {
      setReports((prev) => prev.map((report) => report.id === data.id ? data as SessionReport : report));
      setActiveReport(data as SessionReport);
    }
    setBusy(false);
  }

  if (loading) return <p className="text-muted-foreground">Loading session notes...</p>;

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border bg-gradient-to-br from-background via-background to-sky-50/70 p-5 md:p-7 shadow-sm space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2 max-w-3xl">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">BCBA Documentation</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Session Notes</h2>
            <p className="text-sm md:text-base text-muted-foreground">
              Capture short category notes during the day, then generate a clean rich-text session note draft for review and editing.
            </p>
          </div>
          <div className="rounded-2xl border bg-card p-3 shadow-sm">
            <label className="text-xs font-medium text-muted-foreground">Session day</label>
            <Input type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} className="mt-1 h-11" />
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <section className="rounded-[28px] border bg-card p-4 md:p-5 space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-xl font-semibold tracking-tight">Daily note groups</h3>
                <p className="text-sm text-muted-foreground mt-1">Use the template defaults, or add custom groups for anything payer/client-specific.</p>
              </div>
              <Badge variant="outline">{notesForDate.length} notes today</Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Input placeholder="Add custom group" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
              <Button type="button" variant="outline" onClick={addCategory} disabled={busy || !newCategoryName.trim()}><FolderPlus className="size-4" /> Add group</Button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {categories.map((category) => {
                const count = notesForDate.filter((note) => note.category_id === category.id).length;
                const selected = selectedCategoryId === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(category.id)}
                    className={`rounded-[20px] border p-3 text-left transition-all ${selected ? "border-primary bg-primary/5 shadow-sm" : "bg-background hover:bg-accent/40"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold leading-tight">{category.name}</p>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{count}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{category.description}</p>
                  </button>
                );
              })}
            </div>

            <div className="rounded-[24px] border bg-background p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{editingNote ? "Edit note" : "Add note"}</p>
                  <p className="text-xs text-muted-foreground">Short broken-up notes work best for the generated report.</p>
                </div>
                {editingNote && <Button type="button" variant="ghost" size="sm" onClick={resetComposer}>New note</Button>}
              </div>
              <Input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="Note title" />
              <Textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder="What happened in session? Add objective clinical details, prompts, barriers, progress, caregiver concerns, or plan notes." className="min-h-[130px] text-base" />
              <Button type="button" onClick={saveNote} disabled={busy || !noteContent.trim()} className="w-full sm:w-auto">
                {editingNote ? <Save className="size-4" /> : <Plus className="size-4" />}
                {editingNote ? "Save note" : "Add note"}
              </Button>
            </div>
          </section>

          <section className="space-y-5">
            <Card className="rounded-[28px] overflow-hidden">
              <CardContent className="p-4 md:p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight">Notes for {serviceDate}</h3>
                    <p className="text-sm text-muted-foreground mt-1">Add more notes or edit existing notes before export.</p>
                  </div>
                  <Button type="button" onClick={generateReport} disabled={busy || notesForDate.length === 0}>
                    <Sparkles className="size-4" /> Export draft
                  </Button>
                </div>

                {notesForDate.length > 0 ? (
                  <div className="space-y-3 max-h-[430px] overflow-y-auto pr-1">
                    {notesForDate.map((note) => {
                      const category = categories.find((item) => item.id === note.category_id);
                      return (
                        <button key={note.id} type="button" onClick={() => startEdit(note)} className="w-full rounded-[22px] border bg-background p-4 text-left hover:bg-accent/40 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold">{note.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{category?.name ?? "Additional Notes"}</p>
                            </div>
                            <Pencil className="size-4 text-muted-foreground shrink-0" />
                          </div>
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-3 whitespace-pre-line">{note.content}</p>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed bg-muted/20 p-8 text-center">
                    <FileText className="size-8 mx-auto text-muted-foreground mb-3" />
                    <p className="font-medium">No notes for this day yet.</p>
                    <p className="text-sm text-muted-foreground mt-1">Choose a group, write a quick note, then export the report draft.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[28px] overflow-hidden">
              <CardContent className="p-4 md:p-5 space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight">Rich-text report editor</h3>
                    <p className="text-sm text-muted-foreground mt-1">Generate the draft, then clean up clinical language before using it outside BXR+.</p>
                  </div>
                  <Button type="button" variant="outline" onClick={saveReport} disabled={busy || !activeReport || !editor}><Save className="size-4" /> Save report</Button>
                </div>

                <EditorToolbar editor={editor} />
                <EditorContent editor={editor} />
              </CardContent>
            </Card>
          </section>
        </div>
      </section>
    </div>
  );
}

function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;
  const tools = [
    { label: "Bold", active: editor.isActive("bold"), action: () => editor.chain().focus().toggleBold().run() },
    { label: "Italic", active: editor.isActive("italic"), action: () => editor.chain().focus().toggleItalic().run() },
    { label: "H2", active: editor.isActive("heading", { level: 2 }), action: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "Bullets", active: editor.isActive("bulletList"), action: () => editor.chain().focus().toggleBulletList().run() },
  ];
  return (
    <div className="flex flex-wrap gap-2 rounded-[18px] border bg-muted/20 p-2">
      {tools.map((tool) => (
        <button key={tool.label} type="button" onClick={tool.action} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${tool.active ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"}`}>
          {tool.label}
        </button>
      ))}
    </div>
  );
}
