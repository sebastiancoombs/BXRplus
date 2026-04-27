import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import type { AppRole } from "@/types/database";
import { Eye, Users, X, Check } from "lucide-react";

export type TeamMember = {
  user_id: string;
  full_name: string;
  role: AppRole;
  is_owner?: boolean;
};

type Props = {
  type: "behavior" | "reward";
  itemId: string;
  ownerId: string | null;
  ownerName?: string | null;
  team: TeamMember[];               // does not need to include the owner
  canEdit: boolean;                 // only the client owner gets a true here
  onChanged?: () => void;
};

const ROLE_LABEL: Record<AppRole, string> = {
  bcba: "BCBA",
  rbt: "RBT",
  parent: "Parent",
};

export function VisibilityPicker({
  type,
  itemId,
  ownerId,
  ownerName,
  team,
  canEdit,
  onChanged,
}: Props) {
  const tableName = type === "behavior" ? "behavior_visible_to" : "reward_visible_to";
  const idField = type === "behavior" ? "behavior_id" : "reward_id";
  const rpcName = type === "behavior" ? "set_behavior_visibility" : "set_reward_visibility";

  const [open, setOpen] = useState(false);
  const [allowedIds, setAllowedIds] = useState<Set<string> | null>(null); // null = everyone
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from(tableName)
      .select("user_id")
      .eq(idField, itemId);
    if (!data || data.length === 0) {
      setAllowedIds(null); // everyone
    } else {
      setAllowedIds(new Set(data.map((r: any) => r.user_id as string)));
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [itemId, tableName]);

  // Sorted, deduped, owner first.
  const otherMembers = team.filter((m) => m.user_id !== ownerId);

  const summary = (() => {
    if (loading) return "…";
    if (allowedIds === null) return "Everyone";
    if (allowedIds.size === 0) return "Owner only";
    const names = otherMembers
      .filter((m) => allowedIds.has(m.user_id))
      .map((m) => m.full_name);
    if (names.length === 0) return "Owner only";
    if (names.length <= 2) return names.join(", ");
    return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
  })();

  const isRestricted = allowedIds !== null;

  return (
    <>
      <button
        type="button"
        onClick={() => canEdit && setOpen(true)}
        disabled={!canEdit}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
          isRestricted
            ? "border-amber-200 bg-amber-50/60 text-amber-800 hover:bg-amber-50"
            : "border-slate-200 bg-muted/30 text-muted-foreground hover:bg-muted"
        } ${canEdit ? "cursor-pointer" : "cursor-default opacity-90"}`}
        title={canEdit ? "Click to change visibility" : "Visibility is set by the client owner"}
      >
        {isRestricted ? <Eye className="w-3 h-3" /> : <Users className="w-3 h-3" />}
        <span>Visible to: {summary}</span>
      </button>

      {canEdit && (
        <VisibilityModal
          open={open}
          onOpenChange={setOpen}
          team={otherMembers}
          ownerName={ownerName}
          initial={allowedIds}
          type={type}
          onSave={async (ids) => {
            const payload = ids === null ? null : Array.from(ids);
            const { error } = await supabase.rpc(rpcName as any, {
              [type === "behavior" ? "p_behavior_id" : "p_reward_id"]: itemId,
              p_user_ids: payload,
            } as any);
            if (error) {
              console.error("set visibility error", error);
              alert(`Could not save: ${error.message}`);
              return;
            }
            setAllowedIds(ids === null ? null : new Set(ids));
            setOpen(false);
            onChanged?.();
          }}
        />
      )}
    </>
  );
}

function VisibilityModal({
  open,
  onOpenChange,
  team,
  ownerName,
  initial,
  type,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  team: TeamMember[];
  ownerName?: string | null;
  initial: Set<string> | null;
  type: "behavior" | "reward";
  onSave: (ids: Set<string> | null) => Promise<void>;
}) {
  const [mode, setMode] = useState<"everyone" | "specific">(
    initial === null ? "everyone" : "specific"
  );
  const [selected, setSelected] = useState<Set<string>>(
    new Set(initial ?? [])
  );
  const [busy, setBusy] = useState(false);

  // Re-sync local state when the modal reopens with fresh initial data.
  useEffect(() => {
    if (open) {
      setMode(initial === null ? "everyone" : "specific");
      setSelected(new Set(initial ?? []));
    }
  }, [open, initial]);

  function toggle(userId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function selectRole(role: AppRole) {
    const ids = team.filter((m) => m.role === role).map((m) => m.user_id);
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  }

  function clearRole(role: AppRole) {
    const ids = new Set(team.filter((m) => m.role === role).map((m) => m.user_id));
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
  }

  async function save() {
    setBusy(true);
    try {
      if (mode === "everyone") await onSave(null);
      else await onSave(selected);
    } finally {
      setBusy(false);
    }
  }

  const grouped: Record<AppRole, TeamMember[]> = {
    bcba: [],
    rbt: [],
    parent: [],
  };
  team.forEach((m) => grouped[m.role].push(m));

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[94vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-card border shadow-2xl p-6 max-h-[85vh] overflow-y-auto">
          <div className="flex items-start justify-between mb-4">
            <div>
              <Dialog.Title className="text-xl font-bold">
                Who can see this {type}?
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                {ownerName ? `${ownerName} (owner)` : "The client owner"} always sees everything. Choose who else has access.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="text-muted-foreground hover:text-foreground" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex rounded-lg border p-1 bg-muted/40 mb-5">
            <button
              type="button"
              onClick={() => setMode("everyone")}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === "everyone" ? "bg-card shadow-sm" : "text-muted-foreground"
              }`}
            >
              Everyone on the team
            </button>
            <button
              type="button"
              onClick={() => setMode("specific")}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === "specific" ? "bg-card shadow-sm" : "text-muted-foreground"
              }`}
            >
              Specific people
            </button>
          </div>

          {mode === "specific" && (
            <>
              {team.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  No team members yet. Invite RBTs or parents from the Team tab first.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(["bcba", "rbt", "parent"] as AppRole[]).map((role) => {
                      const members = grouped[role];
                      if (members.length === 0) return null;
                      const allSelected = members.every((m) => selected.has(m.user_id));
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => (allSelected ? clearRole(role) : selectRole(role))}
                          className="text-xs rounded-full border px-3 py-1.5 hover:bg-accent transition-colors"
                        >
                          {allSelected ? "Clear" : "Select"} all {ROLE_LABEL[role]}s
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-1.5 max-h-[40vh] overflow-y-auto -mx-1 px-1">
                    {(["bcba", "rbt", "parent"] as AppRole[]).map((role) => {
                      const members = grouped[role];
                      if (members.length === 0) return null;
                      return (
                        <div key={role}>
                          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mt-3 mb-1.5">
                            {ROLE_LABEL[role]}s
                          </p>
                          {members.map((m) => {
                            const checked = selected.has(m.user_id);
                            return (
                              <label
                                key={m.user_id}
                                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                              >
                                <span
                                  className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                    checked
                                      ? "bg-primary border-primary text-primary-foreground"
                                      : "bg-background border-input"
                                  }`}
                                >
                                  {checked && <Check className="w-3.5 h-3.5" />}
                                </span>
                                <input
                                  type="checkbox"
                                  className="sr-only"
                                  checked={checked}
                                  onChange={() => toggle(m.user_id)}
                                />
                                <span className="flex-1 text-sm">{m.full_name}</span>
                              </label>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="ghost" disabled={busy}>Cancel</Button>
            </Dialog.Close>
            <Button onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
