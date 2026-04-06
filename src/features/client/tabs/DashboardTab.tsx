import { useEffect, useState } from "react";
import { useClientContext } from "@/contexts/ClientContext";
import { useClientDetail, awardPoints, redeemReward } from "@/hooks/useClients";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { playEmojiBurst } from "@/lib/bursts";

export default function DashboardTab({ clientId }: { clientId: string }) {
  const { client, behaviors, rewards, transactions, loading, refresh, patchClient } = useClientDetail(clientId);
  const { patchClient: patchClientInList } = useClientContext();
  const [showProgressSettings, setShowProgressSettings] = useState(false);
  const [sessionMode, setSessionMode] = useState(false);
  const [optimisticBalance, setOptimisticBalance] = useState<number | null>(null);

  const displayBalance = optimisticBalance ?? client?.balance ?? 0;

  useEffect(() => {
    if (client) setOptimisticBalance(client.balance);
  }, [client?.id, client?.balance]);

  async function handleRefresh() {
    await refresh({ silent: true });
  }

  function triggerCelebration(_x?: number, _y?: number, type?: "confetti" | "stars" | "sparkles" | "penalty") {
    const emoji = type === "penalty" ? "⚠️" : client?.reward_success_animation || "🎉";
    void playEmojiBurst({ emoji, mode: type === "penalty" ? "loss" : "gain" });
  }

  async function saveProgressPrefs(patch: { reward_bar_theme?: string; reward_bar_style?: string; reward_success_animation?: string }) {
    await supabase.from("clients").update(patch).eq("id", clientId);
    patchClient(patch);
    patchClientInList(clientId, patch as any);
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (!client) return null;

  const sortedRewards = [...rewards].sort((a, b) => a.point_cost - b.point_cost);
  const availableRewards = sortedRewards.filter((r) => displayBalance >= r.point_cost).length;
  const nextReward = sortedRewards.find((r) => displayBalance < r.point_cost) ?? null;
  const positiveBehaviors = behaviors.filter((b) => b.point_value >= 0);
  const negativeBehaviors = behaviors.filter((b) => b.point_value < 0);
  const travelerIcon = client.traveler_icon || sortedRewards[0]?.traveler_icon || "🚀";

  return (
    <div className="space-y-6 relative">
      {sessionMode && (
        <QuickAwardSessionView
          client={{ ...client, balance: displayBalance }}
          behaviors={behaviors}
          rewards={sortedRewards}
          onClose={() => setSessionMode(false)}
          onAwarded={handleRefresh}
          onCelebrate={triggerCelebration}
          onOptimisticAward={(amount) => setOptimisticBalance((b) => Math.max(0, (b ?? client.balance) + amount))}
        />
      )}

      <section className="rounded-[32px] border bg-gradient-to-br from-background via-background to-primary/5 p-5 md:p-7 shadow-sm space-y-6">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Session Overview</p>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2 max-w-3xl">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{client.full_name}</h1>
              <p className="text-sm md:text-base text-muted-foreground">
                A calm home base for the learner’s day: keep the reward path central, make point updates easy, and keep progress readable for staff and caregivers.
              </p>
            </div>
            {behaviors.length > 0 && (
              <Button onClick={() => setSessionMode(true)} className="shadow-sm w-full sm:w-auto h-11 px-5">
                Open Session Mode
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Points available" value={displayBalance} />
          <StatCard label="Rewards ready now" value={availableRewards} />
          <StatCard label="Next reward" value={nextReward?.name ?? "All rewards available"} />
          <StatCard label="Points to next reward" value={nextReward ? `${Math.max(0, nextReward.point_cost - displayBalance)} left` : "Ready now"} />
        </div>

        {sortedRewards.length > 0 && (
          <section className="rounded-[28px] border bg-card p-4 md:p-6 shadow-sm space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-semibold">Reward Path</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Keep the learner’s path front and center: what is unlocked, what is next, and what can be redeemed right now.
                </p>
              </div>
              <Button variant={showProgressSettings ? "secondary" : "outline"} size="sm" onClick={() => setShowProgressSettings((v) => !v)}>
                {showProgressSettings ? "Hide options" : "Adjust view"}
              </Button>
            </div>

            {showProgressSettings && (
              <ProgressCustomizationPanel
                theme={client.reward_bar_theme ?? "rainbow"}
                style={client.reward_bar_style ?? "rounded"}
                celebrationEmoji={client.reward_success_animation ?? "🎉"}
                onChange={saveProgressPrefs}
              />
            )}

            <UnifiedRewardPath
              rewards={sortedRewards}
              current={displayBalance}
              travelerIcon={travelerIcon}
              onCelebrate={triggerCelebration}
              onRedeem={async (reward) => {
                setOptimisticBalance((b) => Math.max(0, (b ?? client.balance) - reward.point_cost));
                try {
                  await redeemReward(client.id, reward.id);
                  await handleRefresh();
                } catch (e) {
                  setOptimisticBalance(client.balance);
                  throw e;
                }
              }}
            />
          </section>
        )}
      </section>

      <section className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_360px] items-start">
        <section className="rounded-[28px] border bg-card p-5 md:p-6 shadow-sm space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold">Quick Actions</p>
            <p className="text-xs text-muted-foreground">Award or remove points without breaking flow during teaching.</p>
          </div>

          {behaviors.length === 0 ? (
            <p className="text-sm text-muted-foreground">Add behavior programs first so staff can use point updates during session.</p>
          ) : (
            <div className="space-y-5">
              {positiveBehaviors.length > 0 && (
                <QuickActionGroup
                  title="Earn Points"
                  description="Target behaviors you want to strengthen"
                  behaviors={positiveBehaviors}
                  clientId={client.id}
                  onDone={handleRefresh}
                  onCelebrate={triggerCelebration}
                  onOptimisticAward={(amount) => setOptimisticBalance((bal) => Math.max(0, (bal ?? client.balance) + amount))}
                />
              )}

              {negativeBehaviors.length > 0 && (
                <QuickActionGroup
                  title="Remove Points"
                  description="Use only when point loss is part of the plan"
                  behaviors={negativeBehaviors}
                  clientId={client.id}
                  onDone={handleRefresh}
                  onCelebrate={triggerCelebration}
                  onOptimisticAward={(amount) => setOptimisticBalance((bal) => Math.max(0, (bal ?? client.balance) + amount))}
                />
              )}
            </div>
          )}
        </section>

        <aside className="rounded-[28px] border bg-card p-5 md:p-6 shadow-sm">
          <div className="space-y-1 mb-4">
            <p className="text-sm font-semibold">Recent Activity</p>
            <p className="text-xs text-muted-foreground">A clean running log of points earned, removed, and rewards redeemed.</p>
          </div>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No activity yet.</p>
          ) : (
            <TransactionHistory transactions={transactions} onRefresh={handleRefresh} compact />
          )}
        </aside>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[22px] border bg-card px-4 py-4 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg md:text-xl font-semibold mt-2 break-words">{value}</p>
    </div>
  );
}

function QuickActionGroup({
  title,
  description,
  behaviors,
  clientId,
  onDone,
  onCelebrate,
  onOptimisticAward,
}: {
  title: string;
  description: string;
  behaviors: any[];
  clientId: string;
  onDone: () => Promise<void>;
  onCelebrate: (x?: number, y?: number, type?: "confetti" | "stars" | "sparkles" | "penalty") => void;
  onOptimisticAward: (amount: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {behaviors.map((behavior) => (
          <QuickAwardBtn
            key={behavior.id}
            behavior={behavior}
            clientId={clientId}
            onDone={onDone}
            onCelebrate={onCelebrate}
            onOptimisticAward={onOptimisticAward}
          />
        ))}
      </div>
    </div>
  );
}

function TransactionHistory({ transactions, onRefresh, compact = false }: {
  transactions: any[];
  onRefresh: () => Promise<void>;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1">
        {transactions.map((txn) => (
          <TransactionFeedItem key={txn.id} txn={txn} onRefresh={onRefresh} />
        ))}
      </div>
    );
  }

  return <div className="text-sm text-muted-foreground">Full table view moved out for now.</div>;
}

function TransactionFeedItem({ txn, onRefresh }: { txn: any; onRefresh: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(txn.amount);
  const [note, setNote] = useState(txn.note ?? "");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save() {
    const { updateTransactionAndRebalance } = await import("@/hooks/useClients");
    setBusy(true);
    await updateTransactionAndRebalance(txn.id, amount, note || null);
    setBusy(false);
    setEditing(false);
    await onRefresh();
  }

  async function remove() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    const { deleteTransactionAndRebalance } = await import("@/hooks/useClients");
    setBusy(true);
    await deleteTransactionAndRebalance(txn.id);
    setBusy(false);
    await onRefresh();
  }

  const icon = txn.reward_id ? "🎁" : txn.behavior?.point_value && txn.behavior.point_value < 0 ? "⚠️" : "✨";
  const color = txn.reward_id ? "text-amber-600" : txn.behavior?.point_value && txn.behavior.point_value < 0 ? "text-red-500" : "text-green-600";

  return (
    <div className="rounded-[20px] border bg-background px-4 py-3">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-2xl bg-muted grid place-items-center text-lg ${color}`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium break-words">
            {txn.type === "credit"
              ? `${txn.amount} point${txn.amount === 1 ? "" : "s"} ${txn.behavior?.point_value && txn.behavior.point_value < 0 ? "removed" : "earned"}`
              : txn.reward_id
                ? `${txn.amount} point${txn.amount === 1 ? "" : "s"} redeemed`
                : `${txn.amount} point${txn.amount === 1 ? "" : "s"} removed`}
          </p>
          <p className="text-xs text-muted-foreground mt-1 break-words">
            {txn.behavior?.name ?? txn.reward?.name ?? "Manual change"} · {new Date(txn.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
          {editing ? (
            <div className="mt-3 space-y-2">
              <input type="number" min={1} value={amount} onChange={(e) => setAmount(+e.target.value)} className="h-8 w-full rounded-md border bg-background px-3 text-sm" />
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" className="h-8 w-full rounded-md border bg-background px-3 text-sm" />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                <Button size="sm" onClick={save} disabled={busy}>{busy ? "..." : "Save"}</Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end gap-1 mt-2">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setEditing(true)}>Edit</Button>
              <Button variant="ghost" size="sm" className={`h-7 px-2 text-xs ${confirmDelete ? "text-destructive" : "text-muted-foreground hover:text-destructive"}`}
                onClick={remove} onBlur={() => setTimeout(() => setConfirmDelete(false), 200)}>
                {confirmDelete ? "Delete?" : "Delete"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickAwardBtn({ behavior, clientId, onDone, onCelebrate, onOptimisticAward }: {
  behavior: any;
  clientId: string;
  onDone: () => Promise<void>;
  onCelebrate?: (x?: number, y?: number, type?: "confetti" | "stars" | "sparkles" | "penalty") => void;
  onOptimisticAward?: (amount: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);

  async function go(e?: React.MouseEvent<HTMLButtonElement>) {
    setBusy(true);
    onOptimisticAward?.(behavior.point_value);
    try {
      await awardPoints(clientId, behavior.id, behavior.point_value);
      setFlash(true);
      setTimeout(() => setFlash(false), 600);
      onDone();
      const rect = e?.currentTarget.getBoundingClientRect();
      onCelebrate?.(
        rect ? rect.left + rect.width / 2 : undefined,
        rect ? rect.top + rect.height / 2 : undefined,
        behavior.point_value < 0 ? "penalty" : undefined
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={go}
      disabled={busy}
      className={`h-10 rounded-full transition-all ${flash ? behavior.point_value < 0 ? "ring-2 ring-red-300 bg-red-50" : "ring-2 ring-green-400 bg-green-50" : ""}`}
    >
      <span className="mr-1">{behavior.icon}</span>
      <span className="max-w-[160px] truncate">{behavior.name}</span>
      <Badge variant={behavior.point_value < 0 ? "destructive" : "secondary"} className="ml-2 text-xs">
        {behavior.point_value > 0 ? "+" : ""}{behavior.point_value}
      </Badge>
    </Button>
  );
}

function UnifiedRewardPath({ rewards, current, travelerIcon, onRedeem, onCelebrate }: {
  rewards: any[];
  current: number;
  travelerIcon: string;
  onRedeem: (reward: any) => Promise<void>;
  onCelebrate?: (x?: number, y?: number, type?: "confetti" | "stars" | "sparkles" | "penalty") => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const sorted = [...rewards].sort((a, b) => a.point_cost - b.point_cost);
  const maxCost = Math.max(...sorted.map((reward) => reward.point_cost), 1);
  const avatarPct = Math.min(96, Math.max(8, (current / maxCost) * 100));
  const unlockedCount = sorted.filter((reward) => current >= reward.point_cost).length;

  async function handleRedeem(reward: any, e: React.MouseEvent<HTMLButtonElement>) {
    setBusyId(reward.id);
    await onRedeem(reward);
    const rect = e.currentTarget.getBoundingClientRect();
    onCelebrate?.(rect.left + rect.width / 2, rect.top + rect.height / 2);
    setBusyId(null);
  }

  return (
    <Card className="overflow-hidden border-0 bg-gradient-to-b from-slate-900/[0.03] via-background to-indigo-500/[0.06] shadow-none">
      <CardContent className="px-0 py-0">
        <div className="space-y-5">
          <div className="rounded-[24px] border bg-background/80 p-4 md:p-5">
            <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
              <div className="space-y-3 min-w-0">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-2xl">{travelerIcon}</span>
                  <span>{unlockedCount} of {sorted.length} rewards unlocked</span>
                </div>
                <div>
                  <p className="text-2xl md:text-3xl font-bold tracking-tight">{current} points available</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {sorted.length === 0
                      ? "Add rewards to create the learner’s path."
                      : current >= maxCost
                        ? "Everything on the path is unlocked and ready."
                        : `${Math.max(0, maxCost - current)} more points to complete the full path.`}
                  </p>
                </div>
              </div>

              <div className="rounded-[22px] border bg-muted/20 p-4">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Path progress</p>
                    <p className="text-lg font-semibold mt-2">{Math.round((current / maxCost) * 100)}%</p>
                  </div>
                  <span className="text-4xl leading-none">{travelerIcon}</span>
                </div>
                <div className="mt-4 h-3 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-600 via-indigo-500 to-sky-400 transition-all duration-500"
                    style={{ width: `${avatarPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border bg-background p-4 md:p-5">
            <div className="flex gap-4 overflow-x-auto pb-2 md:hidden">
              {sorted.map((reward, index) => {
                const unlocked = current >= reward.point_cost;
                return (
                  <div key={reward.id} className={`min-w-[240px] rounded-[22px] border p-4 ${unlocked ? "bg-background shadow-sm" : "bg-muted/25"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-3 min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-2xl border bg-background grid place-items-center text-2xl">{reward.icon}</div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Stop {index + 1}</p>
                            <p className="font-semibold break-words">{reward.name}</p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {unlocked ? "Available now" : `${Math.max(0, reward.point_cost - current)} points to unlock`}
                        </p>
                      </div>
                      <Badge>{reward.point_cost} pts</Badge>
                    </div>
                    {unlocked && (
                      <Button size="sm" className="mt-4 w-full" onClick={(e) => handleRedeem(reward, e)} disabled={busyId === reward.id}>
                        {busyId === reward.id ? "Redeeming..." : "Redeem reward"}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="hidden md:block space-y-4">
              <div className="relative px-6 py-8">
                <div className="absolute left-6 right-6 top-[56px] h-1.5 rounded-full bg-slate-200" />
                <div
                  className="absolute left-6 top-[56px] h-1.5 rounded-full bg-gradient-to-r from-violet-600 via-indigo-500 to-sky-400 transition-all duration-500"
                  style={{ width: `calc(${avatarPct}% - 12px)` }}
                />
                <div className="absolute top-[28px] -translate-x-1/2 text-3xl transition-all duration-500" style={{ left: `${avatarPct}%` }}>
                  {travelerIcon}
                </div>
                <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.max(sorted.length, 1)}, minmax(0, 1fr))` }}>
                  {sorted.map((reward, index) => {
                    const unlocked = current >= reward.point_cost;
                    return (
                      <div key={reward.id} className="relative pt-10">
                        <div className={`mx-auto h-14 w-14 rounded-[20px] border-2 grid place-items-center text-2xl relative z-10 ${unlocked ? "bg-background border-primary shadow-sm" : "bg-muted border-border"}`}>
                          {reward.icon}
                        </div>
                        <div className={`mt-4 rounded-[22px] border p-4 min-h-[156px] ${unlocked ? "bg-background shadow-sm" : "bg-muted/25"}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Stop {index + 1}</p>
                              <p className="mt-2 font-semibold break-words">{reward.name}</p>
                              <p className="mt-2 text-xs text-muted-foreground">
                                {unlocked ? "Available now" : `${Math.max(0, reward.point_cost - current)} points to unlock`}
                              </p>
                            </div>
                            <Badge>{reward.point_cost} pts</Badge>
                          </div>
                          {unlocked && (
                            <Button size="sm" className="mt-4" onClick={(e) => handleRedeem(reward, e)} disabled={busyId === reward.id}>
                              {busyId === reward.id ? "Redeeming..." : "Redeem"}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                {sorted.map((reward, index) => {
                  const unlocked = current >= reward.point_cost;
                  return (
                    <div key={`${reward.id}-row`} className={`rounded-[22px] border px-4 py-4 ${unlocked ? "bg-background" : "bg-muted/20"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex items-start gap-3">
                          <div className="h-11 w-11 rounded-2xl border bg-background grid place-items-center text-2xl shrink-0">{reward.icon}</div>
                          <div className="min-w-0">
                            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Reward {index + 1}</p>
                            <p className="font-semibold break-words mt-1">{reward.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {unlocked ? "Available now" : `${Math.max(0, reward.point_cost - current)} points to unlock`}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <Badge>{reward.point_cost} pts</Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressCustomizationPanel({ theme, style, celebrationEmoji, onChange }: {
  theme: string;
  style: string;
  celebrationEmoji: string;
  onChange: (patch: { reward_bar_theme?: string; reward_bar_style?: string; reward_success_animation?: string }) => Promise<void>;
}) {
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const themes = ["rainbow", "stars", "ocean", "candy", "rocket"];
  const styles = ["rounded", "pill", "ticket"];
  const celebrationOptions = ["🎉", "✨", "⭐", "💖", "🥳"];

  async function save(patch: { reward_bar_theme?: string; reward_bar_style?: string; reward_success_animation?: string }, key: string) {
    setSavingKey(key);
    await onChange(patch);
    setTimeout(() => setSavingKey(null), 250);
  }

  return (
    <div className="mb-4 rounded-xl border bg-muted/30 p-4 space-y-4">
      <OptionRow title="Path theme" values={themes} selected={theme} savingKey={savingKey} prefix="theme" onSelect={(id) => save({ reward_bar_theme: id }, `theme-${id}`)} />
      <OptionRow title="Path shape" values={styles} selected={style} savingKey={savingKey} prefix="style" onSelect={(id) => save({ reward_bar_style: id }, `style-${id}`)} />
      <OptionRow title="Celebration emoji" values={celebrationOptions} selected={celebrationEmoji} savingKey={savingKey} prefix="celebration" onSelect={(id) => save({ reward_success_animation: id }, `celebration-${id}`)} />
    </div>
  );
}

function OptionRow({ title, values, selected, savingKey, prefix, onSelect }: {
  title: string;
  values: string[];
  selected: string;
  savingKey: string | null;
  prefix: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-2">{title}</p>
      <div className="flex flex-wrap gap-2">
        {values.map((id) => (
          <Button key={id} type="button" size="sm" variant={selected === id ? "default" : "outline"} onClick={() => onSelect(id)}>
            {savingKey === `${prefix}-${id}` ? "Saving..." : id}
          </Button>
        ))}
      </div>
    </div>
  );
}

function SessionProgressRail({ rewards, current }: { rewards: any[]; current: number }) {
  return (
    <Card>
      <CardContent className="py-4 px-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Reward Progress</p>
        <p className="text-2xl font-extrabold mb-1">{current}</p>
        <p className="text-xs text-muted-foreground mb-3">Points available</p>
        <div className="space-y-2">
          {[...rewards].sort((a, b) => a.point_cost - b.point_cost).map((reward) => (
            <div key={reward.id} className="flex items-center justify-between rounded-xl border bg-background px-3 py-2 text-sm">
              <span>{reward.icon} {reward.name}</span>
              <span className="font-medium">{reward.point_cost}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function QuickAwardSessionView({ client, behaviors, rewards, onClose, onAwarded, onCelebrate, onOptimisticAward }: {
  client: any;
  behaviors: any[];
  rewards: any[];
  onClose: () => void;
  onAwarded: () => Promise<void>;
  onCelebrate: (x?: number, y?: number, type?: "confetti" | "stars" | "sparkles" | "penalty") => void;
  onOptimisticAward: (amount: number) => void;
}) {
  return (
    <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur-sm">
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background/90 backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Session Mode</p>
            <h2 className="text-lg font-bold">{client.full_name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Use this view during teaching to deliver points and redeem rewards in the moment.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Points available</p>
              <p className="text-2xl font-extrabold">{client.balance}</p>
            </div>
            <Button variant="outline" onClick={onClose}>Done</Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="grid lg:grid-cols-[180px_1fr] gap-4 h-full">
            <div className="lg:sticky lg:top-0 self-start">
              <SessionProgressRail rewards={rewards} current={client.balance} />
            </div>
            <div className="space-y-5">
              <div>
                <p className="text-sm font-semibold mb-3">Behavior Programs</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 content-start">
                  {behaviors.map((behavior) => (
                    <QuickAwardSessionCard key={behavior.id} behavior={behavior} clientId={client.id} onDone={onAwarded} onCelebrate={onCelebrate} onOptimisticAward={onOptimisticAward} />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold mb-3">Rewards</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 content-start">
                  {rewards.map((reward) => (
                    <QuickRedeemSessionCard key={reward.id} reward={reward} clientId={client.id} currentBalance={client.balance} onDone={onAwarded} onCelebrate={onCelebrate} onOptimisticRedeem={(amount) => onOptimisticAward(-amount)} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAwardSessionCard({ behavior, clientId, onDone, onCelebrate, onOptimisticAward }: {
  behavior: any;
  clientId: string;
  onDone: () => Promise<void>;
  onCelebrate: (x?: number, y?: number, type?: "confetti" | "stars" | "sparkles" | "penalty") => void;
  onOptimisticAward: (amount: number) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function award() {
    setBusy(true);
    onOptimisticAward(behavior.point_value);
    try {
      await awardPoints(clientId, behavior.id, behavior.point_value);
      await onDone();
      onCelebrate(undefined, undefined, behavior.point_value < 0 ? "penalty" : undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={award}
      disabled={busy}
      className="rounded-3xl border bg-card shadow-sm p-6 min-h-[180px] text-left transition-all active:scale-[0.98] hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 grid place-items-center text-3xl">{behavior.icon}</div>
        <div className={`rounded-full px-3 py-1 text-sm font-bold ${behavior.point_value < 0 ? "bg-red-100 text-red-700" : "bg-primary text-primary-foreground"}`}>
          {behavior.point_value > 0 ? "+" : ""}{behavior.point_value}
        </div>
      </div>
      <div className="mt-5">
        <p className="text-2xl font-bold leading-tight break-words">{behavior.name}</p>
        <p className="text-sm text-muted-foreground mt-2">Tap anytime during the session to add points fast.</p>
      </div>
    </button>
  );
}

function QuickRedeemSessionCard({ reward, clientId, currentBalance, onDone, onCelebrate, onOptimisticRedeem }: {
  reward: any;
  clientId: string;
  currentBalance: number;
  onDone: () => Promise<void>;
  onCelebrate: (x?: number, y?: number, type?: "confetti" | "stars" | "sparkles" | "penalty") => void;
  onOptimisticRedeem: (amount: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const available = currentBalance >= reward.point_cost;

  async function redeemNow() {
    if (!available) return;
    setBusy(true);
    onOptimisticRedeem(reward.point_cost);
    try {
      await redeemReward(clientId, reward.id);
      await onDone();
      onCelebrate(undefined, undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={redeemNow}
      disabled={busy || !available}
      className={`rounded-3xl border shadow-sm p-6 min-h-[180px] text-left transition-all active:scale-[0.98] ${available ? "bg-card hover:shadow-md" : "bg-muted/40 opacity-70"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 grid place-items-center text-3xl">{reward.icon}</div>
        <div className="rounded-full px-3 py-1 text-sm font-bold bg-amber-100 text-amber-700">
          {reward.point_cost}
        </div>
      </div>
      <div className="mt-5 space-y-2">
        <p className="text-2xl font-bold leading-tight break-words">{reward.name}</p>
        <p className="text-sm text-muted-foreground">{available ? (busy ? "Redeeming..." : "Tap to redeem") : `${Math.max(0, reward.point_cost - currentBalance)} more points needed`}</p>
      </div>
    </button>
  );
}
