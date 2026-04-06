import { useMemo, useState } from "react";
import { useClientDetail } from "@/hooks/useClients";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import IconPicker from "@/components/IconPicker";
import AnimationPicker from "@/components/AnimationPicker";
import { playEmojiBurst } from "@/lib/bursts";

type BehaviorMode = "earn" | "reduce";

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

  const [behaviorMode, setBehaviorMode] = useState<BehaviorMode>("earn");

  const positiveBehaviors = useMemo(() => behaviors.filter((b) => b.point_value >= 0), [behaviors]);
  const negativeBehaviors = useMemo(() => behaviors.filter((b) => b.point_value < 0), [behaviors]);
  const activeBehaviors = behaviorMode === "earn" ? positiveBehaviors : negativeBehaviors;

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border bg-gradient-to-br from-background via-background to-primary/5 p-5 md:p-7 shadow-sm space-y-6">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Program Setup</p>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2 max-w-3xl">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Programs & Rewards</h2>
              <p className="text-sm md:text-base text-muted-foreground">
                Build the learner’s system in one clear flow: choose what earns points, what reduces points, and the rewards the learner works toward.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <MetricChip label="Behavior programs" value={behaviors.length} />
              <MetricChip label="Rewards" value={rewards.length} />
            </div>
          </div>
        </div>

        <section className="rounded-[28px] border bg-card p-4 md:p-5 space-y-5">
          <div className="space-y-2">
            <div>
              <h3 className="text-xl font-semibold tracking-tight">Behavior Programs</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Keep behavior setup focused and easy to run during teaching.
              </p>
            </div>
            <div className="inline-flex rounded-full border bg-muted/20 p-1 w-full sm:w-auto overflow-x-auto">
              <button
                type="button"
                onClick={() => setBehaviorMode("earn")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${behaviorMode === "earn" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Earn Points ({positiveBehaviors.length})
              </button>
              <button
                type="button"
                onClick={() => setBehaviorMode("reduce")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${behaviorMode === "reduce" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Reduce Points ({negativeBehaviors.length})
              </button>
            </div>
          </div>

          <AddProgramBar
            mode={behaviorMode}
            clientId={clientId}
            onAdded={refresh}
            onInsertBehavior={insertBehavior}
          />

          {activeBehaviors.length > 0 ? (
            <div className="space-y-3">
              {activeBehaviors.map((item) => (
                <ProgramRow
                  key={item.id}
                  item={item}
                  type="behavior"
                  onUpdate={refresh}
                  onReplaceBehavior={replaceBehavior}
                  onRemoveBehavior={removeBehavior}
                />
              ))}
            </div>
          ) : (
            <EmptyState text={behaviorMode === "earn" ? "No earn-point programs yet." : "No reduce-point programs yet."} />
          )}
        </section>

        <section className="rounded-[28px] border bg-card p-4 md:p-5 space-y-5">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">Rewards</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Add the rewards the learner can work toward and redeem during the day.
            </p>
          </div>

          <AddRewardBar
            clientId={clientId}
            onAdded={refresh}
            onInsertReward={insertReward}
          />

          {rewards.length > 0 ? (
            <div className="space-y-3">
              {rewards.map((reward) => (
                <ProgramRow
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
      </section>
    </div>
  );
}

function ProgramRow({
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
      <Card className="rounded-[26px] border-2 border-primary/20 bg-background shadow-sm overflow-hidden">
        <CardContent className="p-4 md:p-5 space-y-5">
          <div className="space-y-1">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-lg font-semibold tracking-tight">{type === "behavior" ? "Edit behavior program" : "Edit reward"}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {type === "behavior"
                    ? "Update the behavior name, point value, and learner feedback."
                    : "Update the reward name, icon, and point cost."}
                </p>
              </div>
              <Badge variant="outline" className="self-start shrink-0">{type === "behavior" ? "Behavior" : "Reward"}</Badge>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[120px_minmax(0,1fr)] items-start">
            <FieldBlock label="Icon">
              <div className="rounded-[20px] border bg-muted/10 p-3 flex justify-center overflow-visible">
                <div className="shrink-0 min-w-[48px]">
                  <IconPicker value={icon} onChange={setIcon} clientId={item.client_id} />
                </div>
              </div>
            </FieldBlock>

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
              <div>
                <p className="text-sm font-semibold">What the learner sees</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {value >= 0
                    ? "Choose the feedback shown when this behavior earns points."
                    : "Choose the feedback shown when this behavior removes points."}
                </p>
              </div>

              {value >= 0 ? (
                <FeedbackPanel
                  title="When points are earned"
                  value={gainEmoji}
                  category="gain"
                  onChange={setGainEmoji}
                  onPreview={() => playEmojiBurst({ emoji: gainEmoji || "⭐", mode: "gain" })}
                />
              ) : (
                <FeedbackPanel
                  title="When points are removed"
                  value={lossEmoji}
                  category="loss"
                  onChange={setLossEmoji}
                  onPreview={() => playEmojiBurst({ emoji: lossEmoji || "⚠️", mode: "loss" })}
                />
              )}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="ghost" className="h-10" onClick={() => setEditing(false)}>Cancel</Button>
            <Button className="h-10" onClick={save} disabled={busy}>{busy ? "Saving..." : "Save changes"}</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-[26px] border bg-background shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="h-14 w-14 rounded-[20px] bg-muted/30 flex items-center justify-center text-3xl shrink-0">
              <span className="leading-none">{item.icon}</span>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-semibold leading-6 break-words whitespace-normal">{item.name}</p>
                <Badge variant={type === "behavior" ? (item.point_value < 0 ? "destructive" : "secondary") : "default"}>
                  {type === "behavior" ? `${item.point_value > 0 ? "+" : ""}${item.point_value} pts` : `${item.point_cost} pts`}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {type === "behavior"
                  ? "Used during teaching to update points in the moment."
                  : "Available on the learner’s reward path."}
              </p>
              {type === "behavior" && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {item.point_value >= 0 ? (
                    <MiniEmojiPill label="Earned" emoji={gainEmoji || "⭐"} />
                  ) : (
                    <MiniEmojiPill label="Removed" emoji={lossEmoji || "⚠️"} />
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 lg:shrink-0">
            <Button variant="outline" className="h-10 sm:min-w-24" onClick={() => setEditing(true)}>Edit</Button>
            <Button variant={confirmDelete ? "destructive" : "ghost"} className="h-10 sm:min-w-24" onClick={remove}>
              {confirmDelete ? "Confirm delete" : "Delete"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AddProgramBar({
  mode,
  clientId,
  onAdded,
  onInsertBehavior,
}: {
  mode: BehaviorMode;
  clientId: string;
  onAdded: () => void;
  onInsertBehavior: (behavior: any) => void;
}) {
  const [name, setName] = useState("");
  const [value, setValue] = useState(mode === "earn" ? 1 : -1);
  const [icon, setIcon] = useState(mode === "earn" ? "⭐" : "⚠️");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);

    const { data } = await supabase
      .from("behaviors")
      .insert({ client_id: clientId, name, point_value: value, icon, is_active: true, description: null, created_by: null })
      .select("*")
      .single();

    if (data) onInsertBehavior?.(data); else onAdded();

    setName("");
    setValue(mode === "earn" ? 1 : -1);
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="rounded-[26px] border bg-muted/10 p-4">
      <div className="grid gap-4 lg:grid-cols-[88px_minmax(0,1fr)_140px_auto] lg:items-end">
        <FieldBlock label="Icon">
          <div className="rounded-[20px] border bg-background p-2.5 flex justify-center">
            <IconPicker value={icon} onChange={setIcon} clientId={clientId} />
          </div>
        </FieldBlock>

        <FieldBlock label="Behavior name">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={mode === "earn" ? "e.g. Followed instructions" : "e.g. Refused direction"}
            className="h-11"
            required
          />
        </FieldBlock>

        <FieldBlock label="Point change">
          <Input type="number" value={value} onChange={(e) => setValue(+e.target.value)} className="h-11" />
        </FieldBlock>

        <Button type="submit" className="h-11 lg:min-w-32" disabled={busy}>
          {busy ? "Adding..." : "Add program"}
        </Button>
      </div>
    </form>
  );
}

function AddRewardBar({
  clientId,
  onAdded,
  onInsertReward,
}: {
  clientId: string;
  onAdded: () => void;
  onInsertReward: (reward: any) => void;
}) {
  const [name, setName] = useState("");
  const [value, setValue] = useState(10);
  const [icon, setIcon] = useState("🎁");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);

    const { data } = await supabase
      .from("rewards")
      .insert({ client_id: clientId, name, point_cost: value, icon, is_active: true, description: null, created_by: null })
      .select("*")
      .single();

    if (data) onInsertReward?.(data); else onAdded();

    setName("");
    setValue(10);
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="rounded-[26px] border bg-muted/10 p-4">
      <div className="grid gap-4 lg:grid-cols-[88px_minmax(0,1fr)_140px_auto] lg:items-end">
        <FieldBlock label="Icon">
          <div className="rounded-[20px] border bg-background p-2.5 flex justify-center">
            <IconPicker value={icon} onChange={setIcon} clientId={clientId} />
          </div>
        </FieldBlock>

        <FieldBlock label="Reward name">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. iPad time"
            className="h-11"
            required
          />
        </FieldBlock>

        <FieldBlock label="Point cost">
          <Input type="number" min={1} value={value} onChange={(e) => setValue(+e.target.value)} className="h-11" />
        </FieldBlock>

        <Button type="submit" className="h-11 lg:min-w-32" disabled={busy}>
          {busy ? "Adding..." : "Add reward"}
        </Button>
      </div>
    </form>
  );
}

function FeedbackPanel({
  title,
  value,
  category,
  onChange,
  onPreview,
}: {
  title: string;
  value: string;
  category: "gain" | "loss" | "unlock";
  onChange: (value: string) => void;
  onPreview: () => void;
}) {
  return (
    <div className="rounded-[22px] border bg-muted/10 p-4 space-y-3 min-w-0">
      <div className="space-y-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">Preview the cue before saving it.</p>
      </div>
      <AnimationPicker value={value} category={category} onChange={onChange} label="Emoji shown to the learner" />
      <Button type="button" variant="outline" className="w-full h-10" onClick={onPreview}>
        Preview
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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[24px] border border-dashed text-sm text-muted-foreground bg-muted/10 p-6">
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
