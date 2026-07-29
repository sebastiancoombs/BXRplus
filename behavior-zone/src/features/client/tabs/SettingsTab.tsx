import { useEffect, useState } from "react";
import IconPicker from "@/components/IconPicker";
import { useClientContext } from "@/contexts/ClientContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type InsurancePayer = { id: string; name: string };
type CptTemplate = { id: string; insurance_id: string; cpt_code: string; service_name: string; template_body: string };

export default function SettingsTab({ clientId, isOwner, onResetTab }: { clientId: string; isOwner: boolean; onResetTab?: () => void }) {
  const { patchClient, removeClientLocal } = useClientContext();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [insuranceId, setInsuranceId] = useState("");
  const [defaultTemplateId, setDefaultTemplateId] = useState("");
  const [payers, setPayers] = useState<InsurancePayer[]>([]);
  const [templates, setTemplates] = useState<CptTemplate[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pathTravelerEmoji, setPathTravelerEmoji] = useState("🚀");
  const [celebrationEmoji, setCelebrationEmoji] = useState("🎉");
  const [autoSavingField, setAutoSavingField] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [{ data: client }, { data: insuranceRows }] = await Promise.all([
        supabase.from("clients").select("*").eq("id", clientId).single(),
        supabase.from("insurance_payers").select("id, name").order("name"),
      ]);
      const payerRows = (insuranceRows ?? []) as InsurancePayer[];
      const nextInsuranceId = client?.insurance_id ?? payerRows[0]?.id ?? "";
      setName(client?.full_name ?? "");
      setDob(client?.date_of_birth ?? "");
      setInsuranceId(nextInsuranceId);
      setDefaultTemplateId(client?.default_cpt_template_id ?? "");
      setPayers(payerRows);
      setPathTravelerEmoji(client?.traveler_icon ?? "🚀");
      setCelebrationEmoji(client?.reward_success_animation ?? "🎉");
      if (nextInsuranceId) await loadTemplates(nextInsuranceId, client?.default_cpt_template_id ?? "");
      setLoading(false);
    }
    void load();
  }, [clientId]);


  async function loadTemplates(nextInsuranceId: string, preferredTemplateId = "") {
    const { data } = await supabase
      .from("insurance_cpt_templates")
      .select("id, insurance_id, cpt_code, service_name, template_body")
      .eq("insurance_id", nextInsuranceId)
      .eq("is_active", true)
      .order("cpt_code");
    const rows = (data ?? []) as CptTemplate[];
    setTemplates(rows);
    setDefaultTemplateId((prev) => {
      if (preferredTemplateId && rows.some((template) => template.id === preferredTemplateId)) return preferredTemplateId;
      if (prev && rows.some((template) => template.id === prev)) return prev;
      return rows[0]?.id ?? "";
    });
  }

  async function saveInsurance(nextInsuranceId: string) {
    setInsuranceId(nextInsuranceId);
    const { data } = await supabase
      .from("insurance_cpt_templates")
      .select("id, insurance_id, cpt_code, service_name, template_body")
      .eq("insurance_id", nextInsuranceId)
      .eq("is_active", true)
      .order("cpt_code");
    const rows = (data ?? []) as CptTemplate[];
    const firstTemplate = rows[0];
    setTemplates(rows);
    setDefaultTemplateId(firstTemplate?.id ?? "");
    await supabase.from("clients").update({ insurance_id: nextInsuranceId || null, default_cpt_template_id: firstTemplate?.id ?? null, default_cpt_code: firstTemplate?.cpt_code ?? null }).eq("id", clientId);
    patchClient(clientId, { insurance_id: nextInsuranceId || null, default_cpt_template_id: firstTemplate?.id ?? null, default_cpt_code: firstTemplate?.cpt_code ?? null });
  }

  async function saveDefaultTemplate(nextTemplateId: string) {
    setDefaultTemplateId(nextTemplateId);
    const selectedTemplate = templates.find((template) => template.id === nextTemplateId);
    await supabase.from("clients").update({ default_cpt_template_id: nextTemplateId || null, default_cpt_code: selectedTemplate?.cpt_code ?? null }).eq("id", clientId);
    patchClient(clientId, { default_cpt_template_id: nextTemplateId || null, default_cpt_code: selectedTemplate?.cpt_code ?? null });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setSaved(false);
    const selectedTemplate = templates.find((template) => template.id === defaultTemplateId);
    await supabase.from("clients").update({ full_name: name.trim(), date_of_birth: dob || null, insurance_id: insuranceId || null, default_cpt_template_id: defaultTemplateId || null, default_cpt_code: selectedTemplate?.cpt_code ?? null }).eq("id", clientId);
    patchClient(clientId, { full_name: name.trim(), date_of_birth: dob || null, insurance_id: insuranceId || null, default_cpt_template_id: defaultTemplateId || null, default_cpt_code: selectedTemplate?.cpt_code ?? null });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function saveClientPreference(field: "traveler_icon" | "reward_success_animation", value: string) {
    setAutoSavingField(field);
    await supabase.from("clients").update({ [field]: value }).eq("id", clientId);
    setTimeout(() => setAutoSavingField((current) => (current === field ? null : current)), 300);
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    await supabase.from("client_staff").delete().eq("client_id", clientId);
    await supabase.from("behaviors").delete().eq("client_id", clientId);
    await supabase.from("rewards").delete().eq("client_id", clientId);
    await supabase.from("transactions").delete().eq("client_id", clientId);
    await supabase.from("clients").delete().eq("id", clientId);
    removeClientLocal(clientId);
    onResetTab?.();
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6 max-w-lg">
      <Card>
        <CardContent className="py-5 space-y-6">
          <div>
            <h3 className="font-semibold mb-1">Learner Details</h3>
            <p className="text-sm text-muted-foreground">Update the learner’s basic information.</p>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Full Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Date of Birth</label>
              <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Insurance</label>
              <select value={insuranceId} onChange={(e) => void saveInsurance(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">No insurance selected</option>
                {payers.map((payer) => <option key={payer.id} value={payer.id}>{payer.name}</option>)}
              </select>
              <p className="text-xs text-muted-foreground">This controls which note templates appear for this learner.</p>
            </div>
            <div className="space-y-2 rounded-2xl border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Default CPT note template</p>
                <Badge>{templates.length}</Badge>
              </div>
              {templates.length > 0 ? (
                <select value={defaultTemplateId} onChange={(e) => void saveDefaultTemplate(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                  {templates.map((template) => <option key={template.id} value={template.id}>{template.cpt_code} — {template.service_name}</option>)}
                </select>
              ) : (
                <p className="text-xs text-muted-foreground">No templates saved for this insurance yet. Add them under Note Template.</p>
              )}
              <div className="flex flex-wrap gap-2">
                {templates.map((template) => <Badge key={template.id} variant={template.id === defaultTemplateId ? "default" : "secondary"}>{template.cpt_code}</Badge>)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
              {saved && <span className="text-sm text-green-600">✓ Saved</span>}
            </div>
          </form>

          <div className="space-y-4 rounded-2xl border bg-muted/20 p-4">
            <div>
              <h4 className="text-sm font-semibold">Reward Path</h4>
              <p className="text-xs text-muted-foreground mt-1">Choose how the learner’s reward progress looks during sessions.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Path traveler</label>
                <div className="flex items-center gap-3 rounded-2xl border bg-background p-3">
                  <IconPicker value={pathTravelerEmoji} onChange={(value) => {
                    setPathTravelerEmoji(value);
                    void saveClientPreference("traveler_icon", value);
                  }} />
                  <div>
                    <p className="text-sm font-medium">{pathTravelerEmoji}</p>
                    <p className="text-[11px] text-muted-foreground">Shown moving up the reward path</p>
                  </div>
                </div>
                {autoSavingField === "traveler_icon" && <p className="text-xs text-muted-foreground">Saving...</p>}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Celebration cue</label>
                <div className="flex items-center gap-3 rounded-2xl border bg-background p-3">
                  <IconPicker value={celebrationEmoji} onChange={(value) => {
                    setCelebrationEmoji(value);
                    void saveClientPreference("reward_success_animation", value);
                  }} />
                  <div>
                    <p className="text-sm font-medium">{celebrationEmoji}</p>
                    <p className="text-[11px] text-muted-foreground">Shown when points are earned</p>
                  </div>
                </div>
                {autoSavingField === "reward_success_animation" && <p className="text-xs text-muted-foreground">Saving...</p>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isOwner && (
        <Card className="border-destructive/30">
          <CardContent className="py-5">
            <h3 className="font-semibold text-destructive mb-2">Delete Learner</h3>
            <p className="text-sm text-muted-foreground mb-4">Deleting this learner removes their points, rewards, and teaching history. This cannot be undone.</p>
            {confirmDelete ? (
              <div className="flex items-center gap-3">
                <p className="text-sm text-destructive font-medium">Are you sure?</p>
                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>{deleting ? "Deleting..." : "Yes, Delete Everything"}</Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              </div>
            ) : (
              <Button variant="destructive" onClick={handleDelete}>Delete Learner</Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
