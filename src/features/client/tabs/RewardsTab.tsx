import { useState } from "react";
import { useClientDetail } from "@/hooks/useClients";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import IconPicker from "@/components/IconPicker";
import AnimationPicker from "@/components/AnimationPicker";
import { playEmojiBurst } from "@/lib/bursts";

export default function RewardsTab({ clientId }: { clientId: string }) {
  const { behaviors, rewards, loading, refresh, replaceBehavior, insertBehavior, removeBehavior, replaceReward, insertReward, removeReward } = useClientDetail(clientId);
  const positiveBehaviors = behaviors.filter((b) => b.point_value >= 0);
  const negativeBehaviors = behaviors.filter((b) => b.point_value < 0);

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-8">
      <div className="rounded-[28px] border bg-gradient-to-br from-background via-background to-primary/5 p-5 md:p-7 shadow-sm">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Program Setup</p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Programs & Rewards</h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Set up the behaviors you want to reinforce, the behaviors that reduce points, and the rewards the learner can earn.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <div className="rounded-full border bg-background/80 px-3 py-1.5">{behaviors.length} behaviors</div>
            <div className="rounded-full border bg-background/80 px-3 py-1.5">{rewards.length} rewards</div>
          </div>
        </div>
      </div>

      <section className="rounded-[28px] border bg-card p-4 md:p-6 shadow-sm space-y-6">
        <div className="space-y-1">
          <p className="text-lg font-semibold tracking-tight">Behavior Programs</p>
          <p className="text-sm text-muted-foreground">Define which behaviors earn points and which behaviors reduce points during teaching.</p>
        </div>

        <div className="grid gap-5 2xl:grid-cols-2">
          <BehaviorColumn title="Behaviors That Earn Points" description="Use these for target behaviors you want to strengthen." clientId={clientId} items={positiveBehaviors} onRefresh={refresh} onReplace={replaceBehavior} onInsert={insertBehavior} onRemove={removeBehavior} />
          <BehaviorColumn title="Behaviors That Reduce Points" description="Use these only when point loss is part of the plan." clientId={clientId} items={negativeBehaviors} onRefresh={refresh} onReplace={replaceBehavior} onInsert={insertBehavior} onRemove={removeBehavior} defaultNegative />
        </div>
      </section>

      <section className="rounded-[28px] border bg-card p-4 md:p-6 shadow-sm space-y-6">
        <div className="space-y-1">
          <p className="text-lg font-semibold tracking-tight">Rewards</p>
          <p className="text-sm text-muted-foreground">Create the rewards the learner can work for and redeem during the day.</p>
        </div>
        <AddItemForm type="reward" clientId={clientId} onAdded={refresh} onInsertReward={insertReward} />
        {rewards.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3 mt-1 items-stretch">
            {rewards.map((reward) => (
              <EditableItemCard key={reward.id} item={reward} type="reward" onUpdate={refresh} onReplaceReward={replaceReward} onRemoveReward={removeReward} />
            ))}
          </div>
        ) : (
          <EmptyState text="No rewards yet. Add a reward to start building the child’s progress path." />
        )}
      </section>
    </div>
  );
}

function BehaviorColumn({ title, description, clientId, items, onRefresh, onReplace, onInsert, onRemove, defaultNegative = false }: {
  title: string;
  description: string;
  clientId: string;
  items: any[];
  onRefresh: () => void;
  onReplace: (behavior: any) => void;
  onInsert: (behavior: any) => void;
  onRemove: (id: string) => void;
  defaultNegative?: boolean;
}) {
  return (
    <div className={`space-y-4 rounded-[24px] border p-4 md:p-5 ${defaultNegative ? "bg-red-50/50 border-red-100" : "bg-emerald-50/40 border-emerald-100"}`}>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className={`h-8 w-8 rounded-full grid place-items-center text-sm ${defaultNegative ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
            {defaultNegative ? "−" : "+"}
          </div>
          <p className="text-base font-semibold tracking-tight">{title}</p>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <AddItemForm type="behavior" clientId={clientId} onAdded={onRefresh} onInsertBehavior={onInsert} defaultNegative={defaultNegative} />
      {items.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 items-stretch">
          {items.map((item) => (
            <EditableItemCard key={item.id} item={item} type="behavior" onUpdate={onRefresh} onReplaceBehavior={onReplace} onRemoveBehavior={onRemove} />
          ))}
        </div>
      ) : (
        <EmptyState text="No items yet." compact />
      )}
    </div>
  );
}

function EditableItemCard({ item, type, onUpdate, onReplaceBehavior, onRemoveBehavior, onReplaceReward, onRemoveReward }: {
  item: any;
  type: "behavior" | "reward";
  onUpdate: () => void;
  onReplaceBehavior?: (behavior: any) => void;
  onRemoveBehavior?: (id: string) => void;
  onReplaceReward?: (reward: any) => void;
  onRemoveReward?: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [icon, setIcon] = useState(item.icon);
  const [value, setValue] = useState(type === "behavior" ? item.point_value : item.point_cost);
  const [feedbackGainAnimationId, setFeedbackGainAnimationId] = useState(item.feedback_gain_animation_id ?? "");
  const [feedbackLossAnimationId, setFeedbackLossAnimationId] = useState(item.feedback_loss_animation_id ?? "");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const table = type === "behavior" ? "behaviors" : "rewards";
  const valueField = type === "behavior" ? "point_value" : "point_cost";

  async function save() {
    setBusy(true);
    const patch = type === "behavior"
      ? { name, icon, [valueField]: value, feedback_gain_animation_id: feedbackGainAnimationId || null, feedback_loss_animation_id: feedbackLossAnimationId || null }
      : { name, icon, [valueField]: value };

    const { data } = await supabase.from(table).update(patch).eq("id", item.id).select("*").single();
    setBusy(false);
    setEditing(false);

    if (data) {
      if (type === "behavior") onReplaceBehavior?.(data);
      else onReplaceReward?.(data);
    } else {
      onUpdate();
    }
  }

  async function remove() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await supabase.from(table).update({ is_active: false }).eq("id", item.id);
    if (type === "behavior") onRemoveBehavior?.(item.id);
    else onRemoveReward?.(item.id);
  }

  if (editing) {
    return (
      <Card className="border-primary/30 shadow-sm overflow-hidden">
        <CardContent className="p-4 md:p-5 space-y-5">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-3">
              <p className="text-base font-semibold">Edit {type === "behavior" ? "behavior" : "reward"}</p>
              <Badge variant="outline" className="shrink-0 text-xs">{type === "behavior" ? "Behavior" : "Reward"}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {type === "behavior" ? "Update the label, point value, and burst feedback." : "Update the reward name, icon, and point cost."}
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-[120px_1fr] items-start">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Icon</label>
              <div className="rounded-2xl border bg-background p-3 flex justify-center lg:justify-start">
                <IconPicker value={icon} onChange={setIcon} clientId={item.client_id} />
              </div>
            </div>

            <div className="space-y-4 min-w-0">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11 text-sm" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">{type === "behavior" ? "Point change" : "Point cost"}</label>
                <div className="flex items-center gap-2">
                  <Input type="number" min={type === "behavior" ? -99 : 1} value={value} onChange={(e) => setValue(+e.target.value)} className="w-32 h-11 text-sm" />
                  <span className="text-sm text-muted-foreground">points</span>
                </div>
              </div>
            </div>
          </div>

          {type === "behavior" && (
            <div className="space-y-4 rounded-2xl border bg-muted/20 p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Learner feedback</p>
                <p className="text-sm text-muted-foreground">Choose what the learner sees when points are earned or removed for this behavior.</p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border bg-background p-3 md:p-4 space-y-3 min-w-0">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">When points are added</p>
                    <p className="text-xs text-muted-foreground">This burst appears after a successful behavior is tracked.</p>
                  </div>
                  <AnimationPicker value={feedbackGainAnimationId} category="gain" onChange={setFeedbackGainAnimationId} label="Gain burst emoji" />
                  <Button type="button" variant="outline" className="w-full h-10" onClick={() => playEmojiBurst({ emoji: feedbackGainAnimationId || "⭐", mode: "gain" })}>
                    Preview gain burst
                  </Button>
                </div>

                <div className="rounded-2xl border bg-background p-3 md:p-4 space-y-3 min-w-0">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">When points are removed</p>
                    <p className="text-xs text-muted-foreground">This burst appears when points are taken away for this behavior.</p>
                  </div>
                  <AnimationPicker value={feedbackLossAnimationId} category="loss" onChange={setFeedbackLossAnimationId} label="Loss burst emoji" />
                  <Button type="button" variant="outline" className="w-full h-10" onClick={() => playEmojiBurst({ emoji: feedbackLossAnimationId || "⚠️", mode: "loss" })}>
                    Preview loss burst
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <Button variant="ghost" className="h-10" onClick={() => setEditing(false)}>Cancel</Button>
            <Button className="h-10" onClick={save} disabled={busy}>{busy ? "Saving..." : "Save changes"}</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group rounded-[24px] border bg-background shadow-sm overflow-hidden h-full transition-shadow hover:shadow-md">
      <CardContent className="p-4 md:p-5 h-full flex flex-col justify-between gap-5">
        <div className="space-y-4 min-w-0">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-14 w-14 rounded-[20px] bg-muted flex items-center justify-center text-3xl shrink-0">
              <span className="leading-none">{item.icon}</span>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="space-y-2 min-w-0">
                <p className="font-semibold text-base leading-6 break-words whitespace-normal">{item.name}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={type === "behavior" ? (item.point_value < 0 ? "destructive" : "secondary") : "default"} className="text-xs shrink-0">
                    {type === "behavior" ? `${item.point_value > 0 ? "+" : ""}${item.point_value} pts` : `${item.point_cost} pts`}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{type === "behavior" ? "Behavior" : "Reward"}</span>
                </div>
              </div>
            </div>
          </div>

          {type === "behavior" && (
            <div className="flex flex-wrap gap-2">
              <MiniEmojiPill label="Gain" emoji={feedbackGainAnimationId || "⭐"} />
              <MiniEmojiPill label="Loss" emoji={feedbackLossAnimationId || "⚠️"} />
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <Button variant="outline" className="h-10 sm:min-w-24" onClick={() => setEditing(true)}>Edit</Button>
          <Button variant={confirmDelete ? "destructive" : "ghost"} className="h-10 sm:min-w-24" onClick={remove}>
            {confirmDelete ? "Confirm delete" : "Delete"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AddItemForm({ type, clientId, onAdded, onInsertBehavior, onInsertReward, defaultNegative = false }: {
  type: "behavior" | "reward";
  clientId: string;
  onAdded: () => void;
  onInsertBehavior?: (behavior: any) => void;
  onInsertReward?: (reward: any) => void;
  defaultNegative?: boolean;
}) {
  const [name, setName] = useState("");
  const [value, setValue] = useState(type === "reward" ? 10 : defaultNegative ? -1 : 1);
  const [icon, setIcon] = useState(type === "reward" ? "🎁" : defaultNegative ? "⚠️" : "⭐");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    if (type === "behavior") {
      const { data } = await supabase.from("behaviors").insert({ client_id: clientId, name, point_value: value, icon, is_active: true, description: null, created_by: null }).select("*").single();
      if (data) onInsertBehavior?.(data); else onAdded();
    } else {
      const { data } = await supabase.from("rewards").insert({ client_id: clientId, name, point_cost: value, icon, is_active: true, description: null, created_by: null }).select("*").single();
      if (data) onInsertReward?.(data); else onAdded();
    }
    setName("");
    setValue(type === "reward" ? 10 : defaultNegative ? -1 : 1);
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-[24px] border bg-background/80 p-4 md:p-5 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[88px_1fr_auto] lg:items-end">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Icon</label>
          <div className="rounded-2xl border bg-background p-2.5 flex justify-center">
            <IconPicker value={icon} onChange={setIcon} clientId={clientId} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px] min-w-0">
          <div className="space-y-1.5 min-w-0">
            <label className="text-xs font-medium text-muted-foreground">{type === "behavior" ? "Name of behavior" : "Reward name"}</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={type === "behavior" ? "e.g. Followed instructions" : "e.g. iPad time"} className="h-11" required />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{type === "behavior" ? "Point change" : "Point cost"}</label>
            <Input type="number" min={type === "behavior" ? -99 : 1} value={value} onChange={(e) => setValue(+e.target.value)} className="h-11" />
          </div>
        </div>

        <Button type="submit" className="h-11 min-w-32" disabled={busy}>{busy ? "Adding..." : `Add ${type === "behavior" ? "behavior" : "reward"}`}</Button>
      </div>
    </form>
  );
}

function EmptyState({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <div className={`rounded-2xl border border-dashed text-sm text-muted-foreground ${compact ? "p-4" : "p-6"}`}>
      {text}
    </div>
  );
}

function MiniEmojiPill({ label, emoji }: { label: string; emoji: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground">
      <span className="font-medium">{label}</span>
      <span className="text-sm leading-none">{emoji}</span>
    </div>
  );
}
