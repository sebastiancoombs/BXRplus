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
  const {
    behaviors,
    rewards,
    loading,
    refresh,
    replaceBehavior,
    insertBehavior,
    removeBehavior,
    replaceReward,
    insertReward,
    removeReward,
  } = useClientDetail(clientId);

  const positiveBehaviors = behaviors.filter((b) => b.point_value >= 0);
  const negativeBehaviors = behaviors.filter((b) => b.point_value < 0);

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Program Setup</p>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2 max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Programs & Rewards</h2>
            <p className="text-sm md:text-base text-muted-foreground">
              Build the learner’s point system: define the behaviors staff track, choose how points change, and set the rewards the learner can earn.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <MetricChip label="Behavior programs" value={behaviors.length} />
            <MetricChip label="Rewards" value={rewards.length} />
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="space-y-1">
          <h3 className="text-xl font-semibold tracking-tight">Behavior Programs</h3>
          <p className="text-sm text-muted-foreground">
            Keep behavior setup simple and easy for staff to use during teaching.
          </p>
        </div>

        <div className="grid gap-6 2xl:grid-cols-2 items-start">
          <BehaviorLane
            title="Earn Points"
            subtitle="Target behaviors you want to strengthen."
            type="behavior"
            clientId={clientId}
            items={positiveBehaviors}
            emptyText="No earn-point behaviors yet."
            onAdded={refresh}
            onInsertBehavior={insertBehavior}
            onReplaceBehavior={replaceBehavior}
            onRemoveBehavior={removeBehavior}
          />

          <BehaviorLane
            title="Reduce Points"
            subtitle="Use only when point loss is part of the plan."
            type="behavior"
            clientId={clientId}
            items={negativeBehaviors}
            emptyText="No reduce-point behaviors yet."
            tone="loss"
            defaultNegative
            onAdded={refresh}
            onInsertBehavior={insertBehavior}
            onReplaceBehavior={replaceBehavior}
            onRemoveBehavior={removeBehavior}
          />
        </div>
      </section>

      <section className="space-y-5">
        <div className="space-y-1">
          <h3 className="text-xl font-semibold tracking-tight">Rewards</h3>
          <p className="text-sm text-muted-foreground">
            Add rewards the learner can work for and redeem during the day.
          </p>
        </div>

        <AddItemPanel
          type="reward"
          clientId={clientId}
          onAdded={refresh}
          onInsertReward={insertReward}
        />

        {rewards.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3 items-start">
            {rewards.map((reward) => (
              <ItemCard
                key={reward.id}
                item={reward}
                type="reward"
                onUpdate={refresh}
                onReplaceReward={replaceReward}
                onRemoveReward={removeReward}
              />
            ))}
          </div>
        ) : (
          <EmptyState text="No rewards yet. Add the rewards the learner can work toward." />
        )}
      </section>
    </div>
  );
}

function BehaviorLane({
  title,
  subtitle,
  type,
  clientId,
  items,
  emptyText,
  tone = "gain",
  defaultNegative = false,
  onAdded,
  onInsertBehavior,
  onReplaceBehavior,
  onRemoveBehavior,
}: {
  title: string;
  subtitle: string;
  type: "behavior";
  clientId: string;
  items: any[];
  emptyText: string;
  tone?: "gain" | "loss";
  defaultNegative?: boolean;
  onAdded: () => void;
  onInsertBehavior: (behavior: any) => void;
  onReplaceBehavior: (behavior: any) => void;
  onRemoveBehavior: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-2xl grid place-items-center text-base font-semibold ${tone === "loss" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
          {tone === "loss" ? "−" : "+"}
        </div>
        <div>
          <p className="text-lg font-semibold tracking-tight">{title}</p>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <AddItemPanel
        type={type}
        clientId={clientId}
        onAdded={onAdded}
        onInsertBehavior={onInsertBehavior}
        defaultNegative={defaultNegative}
      />

      {items.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 items-start">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              type="behavior"
              onUpdate={onAdded}
              onReplaceBehavior={onReplaceBehavior}
              onRemoveBehavior={onRemoveBehavior}
            />
          ))}
        </div>
      ) : (
        <EmptyState text={emptyText} compact />
      )}
    </div>
  );
}

function ItemCard({
  item,
  type,
  onUpdate,
  onReplaceBehavior,
  onRemoveBehavior,
  onReplaceReward,
  onRemoveReward,
}: {
  item: any;
  type: "behavior" | "reward";
  onUpdate: () => void;
  onReplaceBehavior?: (behavior: any) => void;
  onRemoveBehavior?: (id: string) => void;
  onReplaceReward?: (reward: any) => void;
  onRemoveReward?: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(item.name);
  const [icon, setIcon] = useState(item.icon);
  const [value, setValue] = useState(type === "behavior" ? item.point_value : item.point_cost);
  const [gainEmoji, setGainEmoji] = useState(item.feedback_gain_animation_id ?? "");
  const [lossEmoji, setLossEmoji] = useState(item.feedback_loss_animation_id ?? "");

  const table = type === "behavior" ? "behaviors" : "rewards";
  const valueField = type === "behavior" ? "point_value" : "point_cost";

  async function save() {
    setBusy(true);
    const patch = type === "behavior"
      ? {
          name,
          icon,
          [valueField]: value,
          feedback_gain_animation_id: gainEmoji || null,
          feedback_loss_animation_id: lossEmoji || null,
        }
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
      <Card className="rounded-[26px] border-2 border-primary/20 shadow-sm overflow-hidden bg-background">
        <CardContent className="p-4 md:p-5 space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <p className="text-lg font-semibold tracking-tight">{type === "behavior" ? "Edit behavior program" : "Edit reward"}</p>
              <p className="text-sm text-muted-foreground">
                {type === "behavior"
                  ? "Update the behavior label, point value, and learner feedback."
                  : "Update the reward label, icon, and point cost."}
              </p>
            </div>
            <Badge variant="outline" className="self-start shrink-0">{type === "behavior" ? "Behavior" : "Reward"}</Badge>
          </div>

          <div className="grid gap-4 xl:grid-cols-[96px_minmax(0,1fr)] items-start">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Icon</label>
              <div className="rounded-[22px] border bg-muted/20 p-3 flex justify-center">
                <IconPicker value={icon} onChange={setIcon} clientId={item.client_id} />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_140px] items-start">
              <FieldBlock label="Name">
                <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
              </FieldBlock>
              <FieldBlock label={type === "behavior" ? "Point change" : "Point cost"}>
                <Input type="number" min={type === "behavior" ? -99 : 1} value={value} onChange={(e) => setValue(+e.target.value)} className="h-11" />
              </FieldBlock>
            </div>
          </div>

          {type === "behavior" && (
            <div className="space-y-4 border-t pt-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold">What the learner sees</p>
                <p className="text-sm text-muted-foreground">Choose the emoji feedback shown when this behavior earns or removes points.</p>
              </div>

              <div className="grid gap-4 xl:grid-cols-2 items-start">
                <FeedbackPanel
                  title="When points are earned"
                  description="Shown after the learner earns points for this behavior."
                  value={gainEmoji}
                  category="gain"
                  onChange={setGainEmoji}
                  onPreview={() => playEmojiBurst({ emoji: gainEmoji || "⭐", mode: "gain" })}
                  previewLabel="Preview earned-points feedback"
                />
                <FeedbackPanel
                  title="When points are removed"
                  description="Shown if points are reduced for this behavior."
                  value={lossEmoji}
                  category="loss"
                  onChange={setLossEmoji}
                  onPreview={() => playEmojiBurst({ emoji: lossEmoji || "⚠️", mode: "loss" })}
                  previewLabel="Preview point-loss feedback"
                />
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
    <Card className="rounded-[26px] border bg-background shadow-sm overflow-hidden h-full hover:shadow-md transition-shadow">
      <CardContent className="p-4 md:p-5 h-full flex flex-col gap-5 justify-between">
        <div className="space-y-4 min-w-0">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-14 w-14 rounded-[20px] bg-muted/50 flex items-center justify-center text-3xl shrink-0">
              <span className="leading-none">{item.icon}</span>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-base font-semibold leading-6 break-words whitespace-normal">{item.name}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={type === "behavior" ? (item.point_value < 0 ? "destructive" : "secondary") : "default"}>
                  {type === "behavior" ? `${item.point_value > 0 ? "+" : ""}${item.point_value} pts` : `${item.point_cost} pts`}
                </Badge>
                <span className="text-xs text-muted-foreground">{type === "behavior" ? "Behavior program" : "Reward"}</span>
              </div>
            </div>
          </div>

          {type === "behavior" && (
            <div className="flex flex-wrap gap-2">
              <MiniEmojiPill label="Earned" emoji={gainEmoji || "⭐"} />
              <MiniEmojiPill label="Removed" emoji={lossEmoji || "⚠️"} />
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

function AddItemPanel({
  type,
  clientId,
  onAdded,
  onInsertBehavior,
  onInsertReward,
  defaultNegative = false,
}: {
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
      const { data } = await supabase
        .from("behaviors")
        .insert({ client_id: clientId, name, point_value: value, icon, is_active: true, description: null, created_by: null })
        .select("*")
        .single();
      if (data) onInsertBehavior?.(data); else onAdded();
    } else {
      const { data } = await supabase
        .from("rewards")
        .insert({ client_id: clientId, name, point_cost: value, icon, is_active: true, description: null, created_by: null })
        .select("*")
        .single();
      if (data) onInsertReward?.(data); else onAdded();
    }

    setName("");
    setValue(type === "reward" ? 10 : defaultNegative ? -1 : 1);
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="rounded-[26px] border bg-muted/15 p-4 md:p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
        <div className="space-y-1.5 shrink-0">
          <label className="text-xs font-medium text-muted-foreground">Icon</label>
          <div className="rounded-[20px] border bg-background p-2.5 flex justify-center">
            <IconPicker value={icon} onChange={setIcon} clientId={clientId} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_140px] flex-1 min-w-0">
          <FieldBlock label={type === "behavior" ? "Behavior name" : "Reward name"}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === "behavior" ? "e.g. Followed instructions" : "e.g. iPad time"}
              className="h-11"
              required
            />
          </FieldBlock>

          <FieldBlock label={type === "behavior" ? "Point change" : "Point cost"}>
            <Input type="number" min={type === "behavior" ? -99 : 1} value={value} onChange={(e) => setValue(+e.target.value)} className="h-11" />
          </FieldBlock>
        </div>

        <Button type="submit" className="h-11 xl:min-w-36" disabled={busy}>
          {busy ? "Adding..." : `Add ${type === "behavior" ? "program" : "reward"}`}
        </Button>
      </div>
    </form>
  );
}

function FeedbackPanel({
  title,
  description,
  value,
  category,
  onChange,
  onPreview,
  previewLabel,
}: {
  title: string;
  description: string;
  value: string;
  category: "gain" | "loss" | "unlock";
  onChange: (value: string) => void;
  onPreview: () => void;
  previewLabel: string;
}) {
  return (
    <div className="rounded-[22px] border bg-muted/10 p-4 space-y-3 min-w-0">
      <div className="space-y-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <AnimationPicker value={value} category={category} onChange={onChange} label="Emoji shown to the learner" />
      <Button type="button" variant="outline" className="w-full h-10" onClick={onPreview}>
        {previewLabel}
      </Button>
    </div>
  );
}

function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 min-w-0">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function EmptyState({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <div className={`rounded-[24px] border border-dashed text-sm text-muted-foreground bg-muted/10 ${compact ? "p-4" : "p-6"}`}>
      {text}
    </div>
  );
}

function MiniEmojiPill({ label, emoji }: { label: string; emoji: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
      <span className="font-medium">{label}</span>
      <span className="text-sm leading-none">{emoji}</span>
    </div>
  );
}

function MetricChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-full border bg-background/80 px-3 py-1.5">
      {value} {label}
    </div>
  );
}
