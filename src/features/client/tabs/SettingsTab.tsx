import { useEffect, useState } from "react";
import IconPicker from "@/components/IconPicker";
import { useClientContext } from "@/contexts/ClientContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SettingsTab({ clientId, isOwner, onResetTab }: { clientId: string; isOwner: boolean; onResetTab?: () => void }) {
  const { patchClient, removeClientLocal } = useClientContext();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pathTravelerEmoji, setPathTravelerEmoji] = useState("🚀");
  const [celebrationEmoji, setCelebrationEmoji] = useState("🎉");
  const [autoSavingField, setAutoSavingField] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    supabase.from("clients").select("*").eq("id", clientId).single().then(({ data }) => {
      setName(data?.full_name ?? "");
      setDob(data?.date_of_birth ?? "");
      setPathTravelerEmoji(data?.traveler_icon ?? "🚀");
      setCelebrationEmoji(data?.reward_success_animation ?? "🎉");
      setLoading(false);
    });
  }, [clientId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setSaved(false);
    await supabase.from("clients").update({ full_name: name.trim(), date_of_birth: dob || null }).eq("id", clientId);
    patchClient(clientId, { full_name: name.trim(), date_of_birth: dob || null });
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
