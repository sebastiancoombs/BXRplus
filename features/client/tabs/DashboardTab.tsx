import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useClientContext } from "@/contexts/ClientContext";
import {
  useClientDetail,
  awardPoints,
  redeemReward,
  deleteTransactionAndRebalance,
} from "@/hooks/useClients";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { playEmojiBurst } from "@/lib/bursts";
import { Play, Sparkles, Undo2 } from "lucide-react";

export default function DashboardTab({ clientId }: { clientId: string }) {
  const { client, behaviors, rewards, transactions, loading, refresh, patchClient } = useClientDetail(clientId);
  const { patchClient: patchClientInList } = useClientContext();
  const [showProgressSettings, setShowProgressSettings] = useState(false);
  const [redeemingRewardId, setRedeemingRewardId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const sessionMode = searchParams.get("session") === "1";
  const setSessionMode = (open: boolean) => {
    const next = new URLSearchParams(searchParams.toString());
    if (open) next.set("session", "1");
    else next.delete("session");
    router.replace(`${pathname}${next.size ? `?${next.toString()}` : ""}`);
  };
  const [optimisticBalance, setOptimisticBalance] = useState<number | null>(null);

  const displayBalance = optimisticBalance ?? client?.balance ?? 0;

  useEffect(() => {
    if (client) setOptimisticBalance(client.balance);
  }, [client?.id, client?.balance]);

  async function handleRefresh() {
    await refresh({ silent: true });
  }

  function triggerCelebration(_x?: number, _y?: number, type?: "confetti" | "stars" | "sparkles" | "penalty", emojiOverride?: string) {
    const emoji = emojiOverride || (type === "penalty" ? "⚠️" : client?.reward_success_animation || "🎉");
    void playEmojiBurst({ emoji, mode: type === "penalty" ? "loss" : "gain" });
  }

  async function claimReward(reward: any, event: React.MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const previousBalance = displayBalance;
    const nextBalance = Math.max(0, previousBalance - reward.point_cost);
    setRedeemingRewardId(reward.id);
    setOptimisticBalance(nextBalance);
    patchClientInList(clientId, { balance: nextBalance } as any);
    try {
      await redeemReward(clientId, reward.id);
      await handleRefresh();
      triggerCelebration(rect.left + rect.width / 2, rect.top + rect.height / 2, undefined, reward.icon || "🎁");
    } catch (error) {
      setOptimisticBalance(previousBalance);
      patchClientInList(clientId, { balance: previousBalance } as any);
      console.error("Reward redemption failed", error);
      alert(error instanceof Error ? error.message : "Couldn’t claim that reward. Please try again.");
    } finally {
      setRedeemingRewardId(null);
    }
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
  const claimableReward = [...sortedRewards].reverse().find((reward) => displayBalance >= reward.point_cost) ?? null;
  const positiveBehaviors = behaviors.filter((b) => b.point_value >= 0);
  const negativeBehaviors = behaviors.filter((b) => b.point_value < 0);
  const travelerIcon = client.traveler_icon || sortedRewards[0]?.traveler_icon || "🚀";

  return (
    <div className="relative space-y-4 md:space-y-6">
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

      <section className="space-y-5 md:space-y-6">
        <div className="space-y-2 md:space-y-3">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-primary">
            <Sparkles size={14} />
            Reward Adventure
          </p>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2 max-w-3xl">
              <h1 className="hidden text-3xl font-bold tracking-tight md:block md:text-4xl">{client.full_name}</h1>
              <p className="text-sm text-muted-foreground md:text-base">Earn points, move up the path, and unlock something awesome.</p>
            </div>
            {behaviors.length > 0 && (
              <Button onClick={() => setSessionMode(true)} className="h-12 w-full gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-sky-500 px-6 font-bold text-white shadow-lg shadow-violet-500/20 sm:w-auto">
                <Play size={17} fill="currentColor" />
                Start Earning
              </Button>
            )}
          </div>
        </div>

        {(sortedRewards.length > 0 || positiveBehaviors.length > 0) && (
          <section className="relative isolate min-h-[440px] space-y-4 overflow-hidden rounded-[28px] bg-gradient-to-br from-violet-100 via-sky-50 to-amber-50 py-4 pl-[72px] pr-4 text-slate-900 shadow-[inset_0_0_0_1px_rgba(124,58,237,0.12)] dark:from-violet-950/45 dark:via-sky-950/30 dark:to-amber-950/20 dark:text-white md:py-6 md:pl-24 md:pr-6">
            <SessionEdgeProgress rewards={sortedRewards} current={displayBalance} travelerIcon={travelerIcon} alwaysVisible />
            <div className="pointer-events-none absolute -right-8 -top-10 -z-10 text-8xl opacity-[0.08]">⭐</div>
            <div className="pointer-events-none absolute -bottom-8 left-1/3 -z-10 text-7xl opacity-[0.07]">🚀</div>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-lg font-black tracking-tight">Climb the Reward Path</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Every earned point moves the explorer closer to the next reward.</p>
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

            {positiveBehaviors.length > 0 && (
              <div className="space-y-3 rounded-3xl bg-white/65 p-3 shadow-sm backdrop-blur-sm dark:bg-black/20 md:p-4">
                <div>
                  <p className="text-base font-black">What did you do?</p>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Tap a behavior to earn points and move the explorer.</p>
                </div>
                <QuickActionGroup
                  title=""
                  description=""
                  behaviors={positiveBehaviors}
                  clientId={client.id}
                  onDone={handleRefresh}
                  onCelebrate={triggerCelebration}
                  onOptimisticAward={(amount) => setOptimisticBalance((balance) => Math.max(0, (balance ?? client.balance) + amount))}
                />
              </div>
            )}

            <div className="flex items-center justify-between gap-3 border-t border-violet-300/30 pt-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700/70 dark:text-violet-200/70">Explorer position</p>
                <p className="mt-1 text-2xl font-black">{displayBalance} points</p>
              </div>
              {claimableReward ? (
                <div className="min-w-0 text-right">
                  <p className="text-xs font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Reward unlocked!</p>
                  <Button
                    type="button"
                    size="sm"
                    className="mt-1 h-auto max-w-full whitespace-normal rounded-xl bg-gradient-to-r from-amber-400 to-fuchsia-500 py-2 text-right font-black leading-tight text-white shadow-md"
                    disabled={redeemingRewardId === claimableReward.id}
                    onClick={(event) => claimReward(claimableReward, event)}
                  >
                    {redeemingRewardId === claimableReward.id ? "Claiming…" : `Claim ${claimableReward.icon} ${claimableReward.name}`}
                  </Button>
                </div>
              ) : nextReward ? (
                <div className="min-w-0 text-right">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Next target</p>
                  <p className="break-words font-black">{nextReward.icon} {nextReward.name}</p>
                  <p className="text-xs font-bold text-violet-700 dark:text-violet-300">{Math.max(0, nextReward.point_cost - displayBalance)} to go</p>
                </div>
              ) : (
                <p className="font-black text-emerald-600 dark:text-emerald-400">All rewards unlocked! 🎉</p>
              )}
            </div>
          </section>
        )}

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-y py-4 xl:grid-cols-4 xl:gap-6">
          <StatCard label="Points available" value={displayBalance} />
          <StatCard label="Rewards ready now" value={availableRewards} />
          <StatCard label="Next reward" value={nextReward?.name ?? "All rewards available"} />
          <StatCard label="Points to next reward" value={nextReward ? `${Math.max(0, nextReward.point_cost - displayBalance)} left` : "Ready now"} />
        </div>
      </section>

      <section className="grid items-start gap-6 border-t pt-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.42fr)]">
        <section className="space-y-4">
          {behaviors.length === 0 ? (
            <p className="text-sm text-muted-foreground">Add behavior programs first so staff can use point updates during session.</p>
          ) : negativeBehaviors.length > 0 ? (
            <div className="space-y-5">
                <QuickActionGroup
                  title="Plan-based corrections"
                  description="Use only when point loss is part of the plan"
                  behaviors={negativeBehaviors}
                  clientId={client.id}
                  onDone={handleRefresh}
                  onCelebrate={triggerCelebration}
                  onOptimisticAward={(amount) => setOptimisticBalance((bal) => Math.max(0, (bal ?? client.balance) + amount))}
                />
            </div>
          ) : <p className="text-sm text-muted-foreground">Earn-point behaviors are available on the game board above.</p>}
        </section>

        <aside className="border-t pt-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
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
    <div className="min-w-0 border-l-2 border-primary/30 pl-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-lg font-semibold md:text-xl">{value}</p>
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
  onCelebrate: (x?: number, y?: number, type?: "confetti" | "stars" | "sparkles" | "penalty", emojiOverride?: string) => void;
  onOptimisticAward: (amount: number) => void;
}) {
  return (
    <div className="space-y-3">
      {(title || description) && (
        <div className="space-y-1">
          {title && <p className="text-sm font-semibold">{title}</p>}
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
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
  onCelebrate?: (x?: number, y?: number, type?: "confetti" | "stars" | "sparkles" | "penalty", emojiOverride?: string) => void;
  onOptimisticAward?: (amount: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);

  async function go(e?: React.MouseEvent<HTMLButtonElement>) {
    const rect = e?.currentTarget.getBoundingClientRect();
    setBusy(true);
    onOptimisticAward?.(behavior.point_value);
    try {
      await awardPoints(clientId, behavior.id, behavior.point_value);
      setFlash(true);
      setTimeout(() => setFlash(false), 600);
      onDone();
      onCelebrate?.(
        rect ? rect.left + rect.width / 2 : undefined,
        rect ? rect.top + rect.height / 2 : undefined,
        behavior.point_value < 0 ? "penalty" : undefined,
        behavior.point_value < 0 ? (behavior.feedback_loss_animation_id || "⚠️") : (behavior.feedback_gain_animation_id || "⭐")
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
      className={`relative h-auto min-h-28 w-full flex-col justify-center overflow-hidden rounded-3xl border-[3px] px-3 py-3 text-center shadow-[0_5px_0_rgba(15,23,42,0.12)] transition-all active:translate-y-1 active:scale-[0.98] active:shadow-none ${behavior.point_value < 0 ? "border-rose-200 bg-rose-50/70 hover:bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/20" : "border-white bg-gradient-to-br from-cyan-300 via-sky-400 to-violet-500 text-white hover:brightness-105 dark:border-white/20"} ${flash ? behavior.point_value < 0 ? "ring-4 ring-red-300 bg-red-50" : "ring-4 ring-amber-300 brightness-110" : ""}`}
    >
      <span className="text-4xl drop-shadow-sm">{behavior.icon}</span>
      <span className="mt-1 min-w-0 whitespace-normal break-words text-sm font-black leading-tight">{behavior.name}</span>
      <Badge variant={behavior.point_value < 0 ? "destructive" : "secondary"} className="absolute right-2 top-2 shrink-0 border-0 bg-white/90 text-xs font-black text-violet-700 shadow-sm">
        {behavior.point_value > 0 ? "+" : ""}{behavior.point_value}
      </Badge>
    </Button>
  );
}

function UnifiedRewardPath({ rewards, current, travelerIcon }: {
  rewards: any[];
  current: number;
  travelerIcon: string;
}) {
  const sorted = [...rewards].sort((a, b) => a.point_cost - b.point_cost);
  const maxCost = Math.max(...sorted.map((reward) => reward.point_cost), 1);
  const progressPct = Math.min(96, Math.max(8, (current / maxCost) * 100));
  const unlockedCount = sorted.filter((reward) => current >= reward.point_cost).length;

  return (
    <div className="space-y-4">
      <div className="py-1">
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
          <div className="space-y-3 min-w-0">
            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 text-3xl shadow-sm dark:bg-white/10">{travelerIcon}</span>
              <span className="font-bold">{unlockedCount} of {sorted.length} rewards unlocked</span>
            </div>
            <div>
              <p className="text-3xl font-black tracking-tight md:text-4xl">{current} points</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {sorted.length === 0
                  ? "Add rewards to create the learner’s path."
                  : current >= maxCost
                    ? "Everything on the path is unlocked and ready."
                    : `${Math.max(0, maxCost - current)} more points to complete the full path.`}
              </p>
            </div>
          </div>

          <div className="py-1 lg:border-l lg:pl-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Adventure progress</p>
                <p className="mt-1 text-2xl font-black">{Math.round((current / maxCost) * 100)}%</p>
              </div>
              <span className="text-4xl leading-none">{travelerIcon}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[140px_minmax(0,1fr)]">
        <div className="hidden xl:flex justify-center">
          <div className="relative h-[520px] w-[120px]">
            <div className="absolute bottom-5 left-1/2 top-5 w-5 -translate-x-1/2 rounded-full bg-white/70 shadow-inner dark:bg-white/10" />
            <div
              className="absolute bottom-5 left-1/2 w-5 -translate-x-1/2 rounded-full bg-gradient-to-t from-violet-600 via-fuchsia-500 to-amber-400 shadow-[0_0_20px_rgba(139,92,246,0.45)] transition-all duration-700"
              style={{ height: `calc(${progressPct}% - 10px)` }}
            />
            <div key={`desktop-traveler-${current}`} className="animate-level-up absolute left-1/2 z-10 -translate-x-1/2 text-6xl drop-shadow-lg transition-all duration-700" style={{ bottom: `calc(${progressPct}% - 6px)` }}>
              {travelerIcon}
            </div>
            {sorted.map((reward) => {
              const stopPct = Math.min(96, Math.max(8, (reward.point_cost / maxCost) * 100));
              const unlocked = current >= reward.point_cost;
              return (
                <div key={reward.id} className="absolute left-1/2 -translate-x-1/2" style={{ bottom: `calc(${stopPct}% - 18px)` }}>
                  <div className={`grid h-14 w-14 place-items-center rounded-full border-4 text-2xl shadow-md ${unlocked ? "border-amber-300 bg-white shadow-amber-300/30" : "border-white/70 bg-slate-100 grayscale dark:border-white/20 dark:bg-slate-800"}`}>
                    {reward.icon}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative divide-y border-y pl-12 xl:pl-0">
          <div className="absolute bottom-5 left-[19px] top-5 w-2 rounded-full bg-white/70 shadow-inner dark:bg-white/10 xl:hidden" />
          <div
            className="absolute left-[19px] top-5 w-2 rounded-full bg-gradient-to-b from-violet-600 via-fuchsia-500 to-amber-400 shadow-[0_0_14px_rgba(139,92,246,0.4)] transition-all duration-700 xl:hidden"
            style={{ height: `calc(${progressPct}% - 10px)` }}
          />
          <div
            key={`mobile-traveler-${current}`}
            className="animate-level-up absolute left-[1px] z-[4] text-4xl drop-shadow-md transition-all duration-700 xl:hidden"
            style={{ top: `calc(${progressPct}% - 4px)` }}
          >
            {travelerIcon}
          </div>
          {sorted.map((reward, index) => {
            const unlocked = current >= reward.point_cost;
            return (
              <div key={reward.id} className={`relative py-4 md:px-2 md:py-5 ${unlocked ? "" : "opacity-65"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex items-start gap-3 flex-1">
                    <div className={`absolute -left-12 z-[3] grid h-10 w-10 shrink-0 place-items-center rounded-full border-[3px] text-lg shadow-sm xl:static xl:hidden ${unlocked ? "border-amber-300 bg-white shadow-amber-300/30" : "border-white/80 bg-slate-100 grayscale dark:border-white/20 dark:bg-slate-800"}`}>
                      {reward.icon}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Reward stop {index + 1}</p>
                      <p className="font-semibold break-words">{reward.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {unlocked ? "Available now" : `${Math.max(0, reward.point_cost - current)} points to unlock`}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 space-y-2 text-right">
                    <Badge>{reward.point_cost} pts</Badge>
                    <p className={`text-[10px] font-black uppercase tracking-wide ${unlocked ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
                      {unlocked ? "Unlocked!" : "Keep going"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
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

function SessionProgressRail({ rewards, current, travelerIcon }: { rewards: any[]; current: number; travelerIcon: string }) {
  const sorted = [...rewards].sort((a, b) => a.point_cost - b.point_cost);
  const maxCost = Math.max(...sorted.map((reward) => reward.point_cost), 1);
  const progressPct = Math.min(96, Math.max(8, (current / maxCost) * 100));

  return (
    <Card className="overflow-hidden rounded-[28px]">
      <CardContent className="py-4 px-3 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Reward Path</p>
          <p className="text-2xl font-extrabold mb-1">{current}</p>
          <p className="text-xs text-muted-foreground">Points available</p>
        </div>

        <div className="relative mx-auto flex justify-center lg:hidden">
          <div className="relative h-[360px] w-[150px]">
            <div className="absolute left-1/2 top-5 bottom-5 -translate-x-1/2 w-6 rounded-full bg-gradient-to-b from-fuchsia-200 via-sky-200 to-emerald-200 shadow-inner" />
            <div
              className="absolute left-1/2 bottom-5 -translate-x-1/2 w-6 rounded-full bg-gradient-to-t from-violet-600 via-indigo-500 to-sky-400 transition-all duration-500"
              style={{ height: `calc(${progressPct}% - 10px)` }}
            />
            <div className="absolute left-1/2 -translate-x-1/2 text-4xl animate-bounce transition-all duration-500" style={{ bottom: `calc(${progressPct}% - 6px)` }}>
              {travelerIcon}
            </div>
            {sorted.map((reward, index) => {
              const stopPct = Math.min(96, Math.max(8, (reward.point_cost / maxCost) * 100));
              const unlocked = current >= reward.point_cost;
              const offset = index % 2 === 0 ? -42 : 42;
              return (
                <div key={reward.id} className="absolute left-1/2 -translate-x-1/2" style={{ bottom: `calc(${stopPct}% - 18px)`, marginLeft: `${offset}px` }}>
                  <div className={`h-16 w-16 rounded-[22px] border-4 grid place-items-center text-3xl shadow-md ${unlocked ? "bg-background border-primary" : "bg-white/80 border-slate-200"}`}>
                    {reward.icon}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="hidden lg:flex justify-center">
          <div className="relative h-[640px] w-[180px]">
            <div className="absolute left-1/2 top-6 bottom-6 -translate-x-1/2 w-8 rounded-full bg-slate-200 shadow-inner" />
            <div
              className="absolute left-1/2 bottom-6 -translate-x-1/2 w-8 rounded-full bg-gradient-to-t from-violet-600 via-indigo-500 to-sky-400 transition-all duration-500 shadow-lg"
              style={{ height: `calc(${progressPct}% - 12px)` }}
            />
            <div
              className="absolute left-1/2 -translate-x-1/2 text-5xl animate-bounce transition-all duration-500 drop-shadow-md"
              style={{ bottom: `calc(${progressPct}% - 4px)` }}
            >
              {travelerIcon}
            </div>
            {sorted.map((reward, index) => {
              const stopPct = Math.min(96, Math.max(8, (reward.point_cost / maxCost) * 100));
              const unlocked = current >= reward.point_cost;
              const offset = index % 2 === 0 ? -52 : 52;
              return (
                <div
                  key={reward.id}
                  className="absolute left-1/2 -translate-x-1/2"
                  style={{ bottom: `calc(${stopPct}% - 22px)`, marginLeft: `${offset}px` }}
                >
                  <div
                    className={`h-20 w-20 rounded-[24px] border-4 grid place-items-center text-4xl shadow-lg transition-transform ${
                      unlocked
                        ? "bg-background border-primary scale-105"
                        : "bg-muted border-border opacity-80"
                    }`}
                  >
                    {reward.icon}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type RecentAction = {
  id: string;
  txnId: string;
  emoji: string;
  label: string;
  delta: number; // positive = balance went up, negative = down
  kind: "earn" | "lose" | "redeem";
};

function SessionEdgeProgress({ rewards, current, travelerIcon, alwaysVisible = false }: { rewards: any[]; current: number; travelerIcon: string; alwaysVisible?: boolean }) {
  const sorted = [...rewards].sort((a, b) => a.point_cost - b.point_cost);
  const maxCost = Math.max(...sorted.map((reward) => reward.point_cost), 1);
  const progressPct = Math.min(92, Math.max(8, (current / maxCost) * 100));
  const target = sorted.find((reward) => current < reward.point_cost) ?? sorted.at(-1);

  return (
    <div className={`absolute inset-y-0 left-0 z-[4] w-14 border-r border-white/30 bg-gradient-to-b from-sky-300/80 via-violet-300/70 to-fuchsia-300/80 shadow-[6px_0_24px_rgba(99,102,241,0.15)] backdrop-blur-sm md:w-16 ${alwaysVisible ? "" : "lg:hidden"}`}>
      <div className="absolute inset-y-8 left-1/2 w-2 -translate-x-1/2 rounded-full bg-white/60 shadow-inner" />
      <div
        className="absolute bottom-8 left-1/2 w-2 -translate-x-1/2 rounded-full bg-gradient-to-t from-violet-700 via-fuchsia-500 to-amber-300 shadow-[0_0_14px_rgba(124,58,237,0.7)] transition-all duration-700"
        style={{ height: `calc(${progressPct}% - 16px)` }}
      />
      {target && (
        <div className="absolute left-1/2 top-3 grid h-11 w-11 -translate-x-1/2 place-items-center rounded-full border-[3px] border-amber-300 bg-white text-2xl shadow-lg" aria-label={`Target: ${target.name}`}>
          {target.icon}
        </div>
      )}
      <div
        key={`session-edge-${current}`}
        className="animate-level-up absolute left-1/2 z-10 -translate-x-1/2 text-4xl drop-shadow-lg transition-all duration-700"
        style={{ bottom: `calc(${progressPct}% - 8px)` }}
      >
        {travelerIcon}
      </div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white/85 px-2 py-0.5 text-[9px] font-black text-violet-700 shadow">
        {current}
      </div>
    </div>
  );
}

function QuickAwardSessionView({ client, behaviors, rewards, onClose, onAwarded, onCelebrate, onOptimisticAward }: {
  client: any;
  behaviors: any[];
  rewards: any[];
  onClose: () => void;
  onAwarded: () => Promise<void>;
  onCelebrate: (x?: number, y?: number, type?: "confetti" | "stars" | "sparkles" | "penalty", emojiOverride?: string) => void;
  onOptimisticAward: (amount: number) => void;
}) {
  const [mobileTab, setMobileTab] = useState<"earn" | "reduce" | "rewards">("earn");
  const [recent, setRecent] = useState<RecentAction[]>([]);
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [rewardFeedback, setRewardFeedback] = useState<string | null>(null);
  const positiveBehaviors = useMemo(() => behaviors.filter((behavior) => behavior.point_value >= 0), [behaviors]);
  const negativeBehaviors = useMemo(() => behaviors.filter((behavior) => behavior.point_value < 0), [behaviors]);
  const travelerIcon = client.traveler_icon || rewards[0]?.traveler_icon || "🚀";
  const mobileActions = mobileTab === "earn" ? positiveBehaviors : mobileTab === "reduce" ? negativeBehaviors : rewards;

  function pushRecent(action: RecentAction) {
    setRecent((prev) => [action, ...prev].slice(0, 5));
  }

  async function handleApplyBehavior(behavior: any) {
    const delta = behavior.point_value;
    onOptimisticAward(delta);
    const txn = await awardPoints(client.id, behavior.id, delta);
    await onAwarded();
    onCelebrate(
      undefined,
      undefined,
      delta < 0 ? "penalty" : undefined,
      delta < 0 ? (behavior.feedback_loss_animation_id || "⚠️") : (behavior.feedback_gain_animation_id || "⭐")
    );
    if (txn?.id) {
      pushRecent({
        id: `${txn.id}-${Date.now()}`,
        txnId: txn.id,
        emoji: behavior.icon,
        label: behavior.name,
        delta,
        kind: delta < 0 ? "lose" : "earn",
      });
    }
  }

  async function handleRedeemReward(reward: any) {
    if (client.balance < reward.point_cost) {
      const remaining = reward.point_cost - client.balance;
      setRewardFeedback(`${reward.icon} ${remaining} more point${remaining === 1 ? "" : "s"} to unlock ${reward.name}`);
      window.setTimeout(() => setRewardFeedback(null), 3000);
      return;
    }
    setRewardFeedback(`Claiming ${reward.icon} ${reward.name}…`);
    onOptimisticAward(-reward.point_cost);
    try {
      const txn = await redeemReward(client.id, reward.id);
      await onAwarded();
      onCelebrate(undefined, undefined, undefined, reward.icon || "🎁");
      if (txn?.id) {
        pushRecent({
          id: `${txn.id}-${Date.now()}`,
          txnId: txn.id,
          emoji: reward.icon || "🎁",
          label: reward.name,
          delta: -reward.point_cost,
          kind: "redeem",
        });
      }
      setRewardFeedback(`${reward.icon} ${reward.name} claimed!`);
      window.setTimeout(() => setRewardFeedback(null), 3000);
    } catch (error) {
      onOptimisticAward(reward.point_cost);
      console.error("Reward redemption failed", error);
      setRewardFeedback(null);
      alert(error instanceof Error ? error.message : "Couldn’t claim that reward. Please try again.");
    }
  }

  async function handleUndo(action: RecentAction) {
    setUndoingId(action.id);
    try {
      // Reverse the optimistic balance change first so the UI feels instant.
      onOptimisticAward(-action.delta);
      await deleteTransactionAndRebalance(action.txnId);
      await onAwarded();
      setRecent((prev) => prev.filter((r) => r.id !== action.id));
    } catch (err) {
      console.error("Undo failed", err);
      // Roll the optimistic reverse back if the server rejected the delete.
      onOptimisticAward(action.delta);
      alert("Couldn't undo that one — it may have already been edited.");
    } finally {
      setUndoingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-40 overflow-hidden bg-gradient-to-br from-sky-100 via-violet-50 to-fuchsia-100 dark:from-sky-950 dark:via-violet-950 dark:to-fuchsia-950">
      <div className="pointer-events-none absolute left-[18%] top-[18%] text-5xl opacity-15">☁️</div>
      <div className="pointer-events-none absolute right-[8%] top-[32%] text-4xl opacity-20">⭐</div>
      <div className="pointer-events-none absolute bottom-[12%] right-[20%] text-6xl opacity-10">🏰</div>
      <div className="h-full flex flex-col">
        <div className="sticky top-0 z-10 border-b bg-background/95 px-3 py-2 backdrop-blur md:px-4 md:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Session Mode</p>
              <h2 className="truncate text-base font-bold md:text-lg">{client.full_name}</h2>
              <p className="mt-0.5 hidden text-xs text-muted-foreground md:block">Deliver points and rewards in the moment.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="hidden text-xs text-muted-foreground sm:block">Points</p>
                <p className="text-xl font-extrabold md:text-2xl">{client.balance}</p>
              </div>
              <Button variant="outline" onClick={onClose}>Done</Button>
            </div>
          </div>

          {recent.length > 0 && (
            <div className="mt-3 -mx-4 px-4 pt-3 border-t">
              <div className="flex items-center gap-2 mb-2">
                <Undo2 className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                  Recent — tap to undo
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {recent.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => handleUndo(action)}
                    disabled={undoingId === action.id}
                    className={`group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all hover:shadow-sm disabled:opacity-50 ${
                      action.kind === "lose"
                        ? "border-red-200 bg-red-50/60 text-red-800 hover:bg-red-50"
                        : action.kind === "redeem"
                        ? "border-amber-200 bg-amber-50/60 text-amber-800 hover:bg-amber-50"
                        : "border-emerald-200 bg-emerald-50/60 text-emerald-800 hover:bg-emerald-50"
                    }`}
                    title={`Undo ${action.label}`}
                  >
                    <span className="text-base leading-none">{action.emoji}</span>
                    <span className="truncate max-w-[140px]">{action.label}</span>
                    <span className="font-bold">
                      {action.delta > 0 ? `+${action.delta}` : action.delta}
                    </span>
                    <Undo2 className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative flex-1 overflow-y-auto p-3 md:p-6">
          <SessionEdgeProgress rewards={rewards} current={client.balance} travelerIcon={travelerIcon} />
          <div className="space-y-5 lg:grid lg:grid-cols-[240px_1fr] lg:gap-6 lg:h-full lg:space-y-0">
            <div className="hidden lg:block self-start">
              <SessionProgressRail rewards={rewards} current={client.balance} travelerIcon={travelerIcon} />
            </div>

            <div className="space-y-5">
              <div className="pl-14 lg:hidden">
                <div className="min-w-0 space-y-3">
                  <div className="sticky top-0 z-[5] rounded-xl border bg-card/95 p-1.5 shadow-sm backdrop-blur">
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setMobileTab("earn")}
                        className={`rounded-full px-2 py-2 text-xs font-medium transition-colors ${mobileTab === "earn" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
                      >
                        Earn
                      </button>
                      <button
                        type="button"
                        onClick={() => setMobileTab("reduce")}
                        className={`rounded-full px-2 py-2 text-xs font-medium transition-colors ${mobileTab === "reduce" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
                      >
                        Reduce
                      </button>
                      <button
                        type="button"
                        onClick={() => setMobileTab("rewards")}
                        className={`rounded-full px-2 py-2 text-xs font-medium transition-colors ${mobileTab === "rewards" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
                      >
                        Rewards
                      </button>
                    </div>
                  </div>

                  {mobileTab === "rewards" && rewardFeedback && (
                    <div className="rounded-2xl border border-amber-300 bg-amber-50 px-3 py-2 text-center text-sm font-bold text-amber-900 shadow-sm dark:border-amber-700 dark:bg-amber-950/70 dark:text-amber-100">
                      {rewardFeedback}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {mobileTab !== "rewards" && mobileActions.map((behavior) => (
                      <CompactSessionActionRow
                        key={behavior.id}
                        emoji={behavior.icon}
                        title={behavior.name}
                        value={`${behavior.point_value > 0 ? "+" : ""}${behavior.point_value}`}
                        tone={behavior.point_value < 0 ? "loss" : "gain"}
                        onClick={() => handleApplyBehavior(behavior)}
                      />
                    ))}

                    {mobileTab === "rewards" && rewards.map((reward) => (
                      <CompactSessionActionRow
                        key={reward.id}
                        emoji={reward.icon}
                        title={reward.name}
                        value={`${reward.point_cost}`}
                        tone={client.balance >= reward.point_cost ? "reward" : "muted"}
                        subtitle={client.balance >= reward.point_cost ? "Tap to claim" : `Tap · ${Math.max(0, reward.point_cost - client.balance)} left`}
                        onClick={() => handleRedeemReward(reward)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="hidden lg:block space-y-3">
                <div className="rounded-[22px] border bg-card p-2 shadow-sm inline-flex">
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setMobileTab("earn")}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${mobileTab === "earn" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
                    >
                      Earn
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileTab("reduce")}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${mobileTab === "reduce" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
                    >
                      Reduce
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileTab("rewards")}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${mobileTab === "rewards" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
                    >
                      Rewards
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {mobileTab === "rewards" && rewardFeedback && (
                    <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 shadow-sm dark:border-amber-700 dark:bg-amber-950/70 dark:text-amber-100">
                      {rewardFeedback}
                    </div>
                  )}
                  {mobileTab !== "rewards" && (mobileTab === "earn" ? positiveBehaviors : negativeBehaviors).map((behavior) => (
                    <CompactSessionActionRow
                      key={behavior.id}
                      emoji={behavior.icon}
                      title={behavior.name}
                      value={`${behavior.point_value > 0 ? "+" : ""}${behavior.point_value}`}
                      tone={behavior.point_value < 0 ? "loss" : "gain"}
                      onClick={() => handleApplyBehavior(behavior)}
                    />
                  ))}

                  {mobileTab === "rewards" && rewards.map((reward) => (
                    <CompactSessionActionRow
                      key={reward.id}
                      emoji={reward.icon}
                      title={reward.name}
                      value={`${reward.point_cost}`}
                      tone={client.balance >= reward.point_cost ? "reward" : "muted"}
                      subtitle={client.balance >= reward.point_cost ? "Tap to claim" : `Tap · ${Math.max(0, reward.point_cost - client.balance)} left`}
                      onClick={() => handleRedeemReward(reward)}
                    />
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

function CompactSessionActionRow({
  emoji,
  title,
  value,
  tone,
  subtitle,
  disabled,
  onClick,
}: {
  emoji: string;
  title: string;
  value: string;
  tone: "gain" | "loss" | "reward" | "muted";
  subtitle?: string;
  disabled?: boolean;
  onClick: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (disabled || busy) return;
    setBusy(true);
    try {
      await onClick();
    } finally {
      setBusy(false);
    }
  }

  const toneClasses =
    tone === "gain"
      ? "border-emerald-200 bg-emerald-50/70"
      : tone === "loss"
        ? "border-red-200 bg-red-50/70"
        : tone === "reward"
          ? "border-amber-200 bg-amber-50/70"
          : "border-slate-200 bg-slate-50/70";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || busy}
      className={`h-full min-h-28 w-full rounded-3xl border-2 px-3 py-3 text-center shadow-[0_5px_0_rgba(15,23,42,0.12)] transition-all active:translate-y-1 active:scale-[0.98] active:shadow-none ${toneClasses} ${disabled ? "opacity-60" : "hover:shadow-md"}`}
    >
      <div className="flex h-full flex-col items-center justify-center gap-1.5">
        <div className="min-w-0">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/90 text-3xl shadow-sm">{emoji}</div>
          <div className="min-w-0">
            <p className="mt-1 whitespace-normal break-words text-sm font-black leading-tight">{title}</p>
            {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <div className="rounded-full bg-white/90 px-3 py-1 text-sm font-black shadow-sm">{busy ? "..." : value}</div>
      </div>
    </button>
  );
}
