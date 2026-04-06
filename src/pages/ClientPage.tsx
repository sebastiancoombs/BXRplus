import { useState, useEffect, useRef } from "react";
import { useClientContext } from "@/contexts/ClientContext";
import { useClientDetail, awardPoints, redeemReward, updateTransactionAndRebalance, deleteTransactionAndRebalance } from "@/hooks/useClients";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PrintableClientCard, PrintableRewardTicket } from "@/components/PrintableCard";
import IconPicker from "@/components/IconPicker";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/types/database";

type Tab = "dashboard" | "rewards" | "data" | "printables" | "team" | "settings";

// Keep tab state outside the component so it survives re-renders from context refreshes
let persistedTab: Tab = "dashboard";

export default function ClientPage() {
  const { activeClient, clients, loading } = useClientContext();
  const [tab, setTabState] = useState<Tab>(persistedTab);
  const setTab = (t: Tab) => { persistedTab = t; setTabState(t); };

  if (loading) return <p className="text-muted-foreground p-6">Loading...</p>;

  if (clients.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-sm">
          <p className="text-5xl mb-6">🏆</p>
          <h2 className="text-2xl font-bold mb-2">Welcome to BXR+</h2>
          <p className="text-muted-foreground">
            Add your first client using the sidebar to get started.
          </p>
        </div>
      </div>
    );
  }

  if (!activeClient) return null;

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "dashboard", label: "Dashboard", icon: "📊" },
    { key: "rewards", label: "Rewards & Behaviors", icon: "🎁" },
    { key: "data", label: "Data", icon: "📈" },
    { key: "printables", label: "Printables", icon: "🖨️" },
    { key: "team", label: "Team", icon: "👥" },
    { key: "settings", label: "Client Settings", icon: "✏️" },
  ];

  return (
    <div className="min-h-screen">
      {/* Client name + tabs */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="py-3 md:py-4 pl-10 md:pl-0">
            <h1 className="text-lg md:text-xl font-bold">{activeClient.full_name}</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              {activeClient.balance} points
              {activeClient.isOwner && " · Owner"}
              {activeClient.myRole && !activeClient.isOwner && ` · ${activeClient.myRole.toUpperCase()}`}
            </p>
          </div>
          <div className="flex gap-0.5 -mb-px overflow-x-auto scrollbar-none">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0",
                  tab === t.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
                )}
              >
                <span className="md:mr-1">{t.icon}</span>
                <span className="hidden sm:inline"> {t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 md:py-6">
        {tab === "dashboard" && <DashboardTab clientId={activeClient.id} />}
        {tab === "rewards" && <RewardsTab clientId={activeClient.id} />}
        {tab === "data" && <DataTab clientId={activeClient.id} clientName={activeClient.full_name} />}
        {tab === "printables" && <PrintablesTab clientId={activeClient.id} client={activeClient} />}
        {tab === "team" && <TeamTab clientId={activeClient.id} isOwner={activeClient.isOwner} />}
        {tab === "settings" && <ClientSettingsTab clientId={activeClient.id} isOwner={activeClient.isOwner} />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// DASHBOARD TAB
// ═══════════════════════════════════════

function DashboardTab({ clientId }: { clientId: string }) {
  const { client, behaviors, rewards, transactions, loading, refresh } = useClientDetail(clientId);
  const { refresh: refreshClients } = useClientContext();
  const [showProgressSettings, setShowProgressSettings] = useState(false);
  const [sessionMode, setSessionMode] = useState(false);
  const [optimisticBalance, setOptimisticBalance] = useState<number | null>(null);
  const [celebration, setCelebration] = useState<null | { type: "confetti" | "stars" | "sparkles" | "penalty"; x?: number; y?: number }>(null);

  const displayBalance = optimisticBalance ?? client?.balance ?? 0;

  useEffect(() => {
    if (client) setOptimisticBalance(client.balance);
  }, [client?.id, client?.balance]);

  async function handleRefresh() { await refresh({ silent: true }); }

  function triggerCelebration(x?: number, y?: number, type?: "confetti" | "stars" | "sparkles" | "penalty") {
    const anim = type ?? ((client?.reward_success_animation as "confetti" | "stars" | "sparkles" | null) ?? "confetti");
    setCelebration({ type: anim, x, y });
    window.setTimeout(() => setCelebration(null), 900);
  }

  async function saveProgressPrefs(patch: { reward_bar_theme?: string; reward_bar_style?: string; reward_success_animation?: string }) {
    await supabase.from("clients").update(patch).eq("id", clientId);
    await refresh({ silent: true });
    await refreshClients();
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (!client) return null;

  const availableRewards = rewards.filter((r) => displayBalance >= r.point_cost).length;
  const nextReward = [...rewards].sort((a, b) => a.point_cost - b.point_cost).find((r) => displayBalance < r.point_cost) ?? null;
  const positiveBehaviors = behaviors.filter((b) => b.point_value >= 0);
  const negativeBehaviors = behaviors.filter((b) => b.point_value < 0);

  return (
    <div className="space-y-8 relative">
      {celebration && <RewardCelebration type={celebration.type} x={celebration.x} y={celebration.y} />}
      {sessionMode && (
        <QuickAwardSessionView
          client={{ ...client, balance: displayBalance }}
          behaviors={behaviors}
          onClose={() => setSessionMode(false)}
          onAwarded={handleRefresh}
          onCelebrate={triggerCelebration}
          onOptimisticAward={(amount) => setOptimisticBalance((b) => Math.max(0, (b ?? client.balance) + amount))}
        />
      )}

      <div className="rounded-3xl border bg-gradient-to-br from-background via-background to-primary/5 p-5 md:p-7 shadow-sm">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr] items-start">
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Dashboard</p>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1">{client.full_name}</h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-xl">
                Run reinforcement in real time, keep progress visible, and make rewards easy to understand at a glance.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-2xl bg-card border px-4 py-4">
                <p className="text-xs text-muted-foreground">Current points</p>
                <p className="text-3xl font-extrabold mt-1">{displayBalance}</p>
              </div>
              <div className="rounded-2xl bg-card border px-4 py-4">
                <p className="text-xs text-muted-foreground">Available now</p>
                <p className="text-3xl font-extrabold mt-1">{availableRewards}</p>
              </div>
              <div className="rounded-2xl bg-card border px-4 py-4">
                <p className="text-xs text-muted-foreground">Next reward</p>
                <p className="text-base font-bold mt-1 truncate">{nextReward?.name ?? "All unlocked"}</p>
              </div>
              <div className="rounded-2xl bg-card border px-4 py-4">
                <p className="text-xs text-muted-foreground">Next target</p>
                <p className="text-base font-bold mt-1">{nextReward ? `${Math.max(0, nextReward.point_cost - displayBalance)} left` : "Ready now"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-card border p-4 md:p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-sm font-semibold">Quick Actions</p>
                <p className="text-xs text-muted-foreground mt-1">The fastest way to run a live session.</p>
              </div>
              {behaviors.length > 0 && (
                <Button onClick={() => setSessionMode(true)} className="shadow-sm">
                  Start Live Session
                </Button>
              )}
            </div>

            {behaviors.length === 0 ? (
              <p className="text-sm text-muted-foreground">Add behaviors in the Rewards tab to start awarding points.</p>
            ) : (
              <div className="space-y-4">
                {positiveBehaviors.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Earn Points</p>
                    <div className="flex flex-wrap gap-2">
                      {positiveBehaviors.map((b) => (
                        <QuickAwardBtn key={b.id} behavior={b} clientId={client.id} onDone={handleRefresh} onCelebrate={triggerCelebration}
                          onOptimisticAward={(amount) => setOptimisticBalance((bal) => Math.max(0, (bal ?? client.balance) + amount))} />
                      ))}
                    </div>
                  </div>
                )}
                {negativeBehaviors.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Remove Points</p>
                    <div className="flex flex-wrap gap-2">
                      {negativeBehaviors.map((b) => (
                        <QuickAwardBtn key={b.id} behavior={b} clientId={client.id} onDone={handleRefresh} onCelebrate={triggerCelebration}
                          onOptimisticAward={(amount) => setOptimisticBalance((bal) => Math.max(0, (bal ?? client.balance) + amount))} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr] items-start">
        <div className="space-y-6">
          {rewards.length > 0 && (
            <section className="rounded-3xl border bg-card p-5 md:p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-sm font-semibold">Reward Progress</p>
                  <p className="text-xs text-muted-foreground mt-1">See what is available now, what is next to unlock, and how close they are to each reward.</p>
                </div>
                <Button variant={showProgressSettings ? "secondary" : "outline"} size="sm" onClick={() => setShowProgressSettings((v) => !v)}>
                  {showProgressSettings ? "Hide options" : "Customize"}
                </Button>
              </div>

              {showProgressSettings && (
                <ProgressCustomizationPanel
                  theme={client.reward_bar_theme ?? "rainbow"}
                  style={client.reward_bar_style ?? "rounded"}
                  animation={client.reward_success_animation ?? "confetti"}
                  onChange={saveProgressPrefs}
                />
              )}

              <UnifiedRewardPath
                rewards={rewards}
                current={displayBalance}
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
        </div>

        <aside className="space-y-6">
          <section className="rounded-3xl border bg-card p-5 md:p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-sm font-semibold">Recent Activity</p>
                <p className="text-xs text-muted-foreground mt-1">Clear, trustworthy record of points earned, removed, and rewards redeemed.</p>
              </div>
            </div>
            {transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No activity yet.</p>
            ) : (
              <TransactionHistory transactions={transactions} onRefresh={handleRefresh} compact />
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// TRANSACTION HISTORY
// ═══════════════════════════════════════

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

  return (
    <>
      <div className="md:hidden space-y-2">
        {transactions.map((txn) => (
          <TransactionCard key={txn.id} txn={txn} onRefresh={onRefresh} />
        ))}
      </div>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 pr-4 font-medium">Date</th>
              <th className="pb-2 pr-4 font-medium">Description</th>
              <th className="pb-2 pr-4 font-medium text-right">Credit</th>
              <th className="pb-2 pr-4 font-medium text-right">Debit</th>
              <th className="pb-2 pr-4 font-medium text-right">Balance</th>
              <th className="pb-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((txn) => (
              <TransactionRow key={txn.id} txn={txn} onRefresh={onRefresh} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function TransactionFeedItem({ txn, onRefresh }: { txn: any; onRefresh: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(txn.amount);
  const [note, setNote] = useState(txn.note ?? "");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save() {
    setBusy(true);
    await updateTransactionAndRebalance(txn.id, amount, note || null);
    setBusy(false);
    setEditing(false);
    await onRefresh();
  }

  async function remove() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setBusy(true);
    await deleteTransactionAndRebalance(txn.id);
    setBusy(false);
    await onRefresh();
  }

  const icon = txn.reward_id ? "🎁" : txn.behavior?.point_value && txn.behavior.point_value < 0 ? "⚠️" : "✨";
  const color = txn.reward_id ? "text-amber-600" : txn.behavior?.point_value && txn.behavior.point_value < 0 ? "text-red-500" : "text-green-600";

  return (
    <div className="rounded-2xl border bg-background px-4 py-3">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-2xl bg-muted grid place-items-center text-lg ${color}`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {txn.type === "credit"
              ? `${txn.amount} point${txn.amount === 1 ? "" : "s"} ${txn.behavior?.point_value && txn.behavior.point_value < 0 ? "removed" : "earned"}`
              : txn.reward_id
                ? `${txn.amount} point${txn.amount === 1 ? "" : "s"} redeemed`
                : `${txn.amount} point${txn.amount === 1 ? "" : "s"} removed`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {txn.behavior?.name ?? txn.reward?.name ?? "Manual change"} · {new Date(txn.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
          {txn.edited_at && <p className="text-[11px] text-muted-foreground mt-1">Edited{txn.original_amount && txn.original_amount !== txn.amount ? ` · originally ${txn.original_amount}` : ""}</p>}
          {editing ? (
            <div className="mt-3 space-y-2">
              <Input type="number" min={1} value={amount} onChange={(e) => setAmount(+e.target.value)} className="h-8" />
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" className="h-8" />
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

function TransactionCard({ txn, onRefresh }: { txn: any; onRefresh: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(txn.amount);
  const [note, setNote] = useState(txn.note ?? "");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save() {
    setBusy(true);
    await updateTransactionAndRebalance(txn.id, amount, note || null);
    setBusy(false);
    setEditing(false);
    await onRefresh();
  }

  async function remove() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setBusy(true);
    await deleteTransactionAndRebalance(txn.id);
    setBusy(false);
    await onRefresh();
  }

  if (editing) {
    return (
      <Card className="border-primary/30">
        <CardContent className="py-3 space-y-2">
          <p className="text-sm font-medium">Edit Transaction</p>
          <div className="flex gap-2 items-center">
            <Input type="number" min={1} value={amount} onChange={(e) => setAmount(+e.target.value)} className="h-8" />
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" className="h-8" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={busy}>{busy ? "..." : "Save"}</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0 gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">
          {txn.type === "credit"
            ? `${txn.amount} point${txn.amount === 1 ? "" : "s"} ${txn.behavior?.point_value && txn.behavior.point_value < 0 ? "removed" : "earned"}`
            : txn.reward_id
              ? `${txn.amount} point${txn.amount === 1 ? "" : "s"} redeemed`
              : `${txn.amount} point${txn.amount === 1 ? "" : "s"} removed`}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {txn.behavior?.name ?? txn.reward?.name ?? "Manual change"}
          {" · "}
          {new Date(txn.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          {" · "}
          {new Date(txn.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        </p>
        {(txn.note || txn.edited_at) && (
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {txn.note ? txn.note : ""}
            {txn.note && txn.edited_at ? " · " : ""}
            {txn.edited_at ? `edited` : ""}
          </p>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-sm font-bold ${txn.type === "credit" ? "text-green-600" : "text-red-500"}`}>
          {txn.type === "credit" ? "+" : "−"}{txn.amount}
        </p>
        <p className="text-[11px] text-muted-foreground">bal: {txn.balance_after}</p>
        <div className="flex justify-end gap-1 mt-1">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setEditing(true)}>Edit</Button>
          <Button variant="ghost" size="sm" className={`h-7 px-2 text-xs ${confirmDelete ? "text-destructive" : "text-muted-foreground hover:text-destructive"}`}
            onClick={remove} onBlur={() => setTimeout(() => setConfirmDelete(false), 200)}>
            {confirmDelete ? "Delete?" : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function TransactionRow({ txn, onRefresh }: { txn: any; onRefresh: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(txn.amount);
  const [note, setNote] = useState(txn.note ?? "");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save() {
    setBusy(true);
    await updateTransactionAndRebalance(txn.id, amount, note || null);
    setBusy(false);
    setEditing(false);
    await onRefresh();
  }

  async function remove() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setBusy(true);
    await deleteTransactionAndRebalance(txn.id);
    setBusy(false);
    await onRefresh();
  }

  return (
    <tr className="border-b last:border-0 hover:bg-muted/50">
      <td className="py-3 pr-4 whitespace-nowrap text-muted-foreground">
        {new Date(txn.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        <span className="block text-xs">
          {new Date(txn.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        </span>
      </td>
      <td className="py-3 pr-4">
        {editing ? (
          <div className="space-y-2">
            <Input type="number" min={1} value={amount} onChange={(e) => setAmount(+e.target.value)} className="h-8" />
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" className="h-8" />
          </div>
        ) : (
          <div>
            <span className="font-medium">
              {txn.type === "credit"
                ? `${txn.amount} point${txn.amount === 1 ? "" : "s"} ${txn.behavior?.point_value && txn.behavior.point_value < 0 ? "removed" : "earned"}`
                : txn.reward_id
                  ? `${txn.amount} point${txn.amount === 1 ? "" : "s"} redeemed`
                  : `${txn.amount} point${txn.amount === 1 ? "" : "s"} removed`}
            </span>
            <p className="text-xs text-muted-foreground mt-1">
              {txn.behavior?.name ?? txn.reward?.name ?? "Manual change"}
              {txn.note ? ` · ${txn.note}` : ""}
              {txn.edited_at ? ` · edited` : ""}
            </p>
            {txn.edited_at && txn.original_amount && txn.original_amount !== txn.amount && (
              <p className="text-[11px] text-muted-foreground mt-1">Originally {txn.original_amount}</p>
            )}
          </div>
        )}
      </td>
      <td className="py-3 pr-4 text-right">
        {txn.type === "credit" ? <span className="text-green-600 font-medium">+{editing ? amount : txn.amount}</span> : <span className="text-muted-foreground">—</span>}
      </td>
      <td className="py-3 pr-4 text-right">
        {txn.type === "debit" ? <span className="text-red-500 font-medium">−{editing ? amount : txn.amount}</span> : <span className="text-muted-foreground">—</span>}
      </td>
      <td className="py-3 text-right font-mono font-medium">{txn.balance_after}</td>
      <td className="py-3 text-right">
        {editing ? (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs" onClick={save} disabled={busy}>{busy ? "..." : "Save"}</Button>
          </div>
        ) : (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditing(true)}>Edit</Button>
            <Button variant="ghost" size="sm" className={`h-7 text-xs ${confirmDelete ? "text-destructive" : "text-muted-foreground hover:text-destructive"}`}
              onClick={remove} onBlur={() => setTimeout(() => setConfirmDelete(false), 200)}>
              {confirmDelete ? "Delete?" : "Delete"}
            </Button>
          </div>
        )}
      </td>
    </tr>
  );
}

// ═══════════════════════════════════════
// REWARDS TAB
// ═══════════════════════════════════════

function RewardsTab({ clientId }: { clientId: string }) {
  const { behaviors, rewards, loading, refresh: refreshDetail } = useClientDetail(clientId);
  // Only refresh local detail data, NOT the global client context (avoids remounts)
  const refresh = refreshDetail;

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-8">
      {/* Behaviors */}
      <div>
        <h3 className="font-semibold mb-3">⭐ Behaviors <span className="text-muted-foreground font-normal text-sm">— what adds or removes points</span></h3>
        <AddItemForm type="behavior" clientId={clientId} onAdded={refresh} />
        {behaviors.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-4">
            {behaviors.map((b) => (
              <EditableItemCard key={b.id} item={b} type="behavior" onUpdate={refresh} />
            ))}
          </div>
        )}
      </div>

      {/* Rewards */}
      <div>
        <h3 className="font-semibold mb-3">🎁 Rewards <span className="text-muted-foreground font-normal text-sm">— what points buy</span></h3>
        <AddItemForm type="reward" clientId={clientId} onAdded={refresh} />
        {rewards.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-4">
            {rewards.map((r) => (
              <EditableItemCard key={r.id} item={r} type="reward" onUpdate={refresh} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EditableItemCard({ item, type, onUpdate }: {
  item: any;
  type: "behavior" | "reward";
  onUpdate: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [icon, setIcon] = useState(item.icon);
  const [value, setValue] = useState(type === "behavior" ? item.point_value : item.point_cost);
  const [journeyPreset, setJourneyPreset] = useState(item.journey_preset ?? "space");
  const [travelerIcon, setTravelerIcon] = useState(item.traveler_icon ?? "🚀");
  const [destinationIcon, setDestinationIcon] = useState(item.destination_icon ?? "🌙");
  const [journeyTheme, setJourneyTheme] = useState(item.journey_theme ?? "space");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const table = type === "behavior" ? "behaviors" : "rewards";
  const valueField = type === "behavior" ? "point_value" : "point_cost";

  async function save() {
    setBusy(true);
    await supabase.from(table).update(type === "behavior"
      ? { name, icon, [valueField]: value }
      : { name, icon, [valueField]: value, journey_preset: journeyPreset, traveler_icon: travelerIcon, destination_icon: destinationIcon, journey_theme: journeyTheme }
    ).eq("id", item.id);
    setBusy(false);
    setEditing(false);
    onUpdate();
  }

  async function remove() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await supabase.from(table).update({ is_active: false }).eq("id", item.id);
    onUpdate();
  }

  if (editing) {
    return (
      <Card className="border-primary/30">
        <CardContent className="py-3 space-y-2">
          <div className="flex gap-2 items-center">
            <IconPicker value={icon} onChange={setIcon} />
            <Input value={name} onChange={(e) => setName(e.target.value)} className="flex-1 min-w-0 h-8 text-sm" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">{type === "behavior" ? "±" : ""}</span>
              <Input type="number" min={type === "behavior" ? -99 : 1} value={value} onChange={(e) => setValue(+e.target.value)} className="w-20 h-8 text-sm" />
              <span className="text-xs text-muted-foreground">pts</span>
            </div>
            <div className="flex gap-1 ml-auto">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditing(false)}>Cancel</Button>
              <Button size="sm" className="h-7 text-xs" onClick={save} disabled={busy}>
                {busy ? "..." : "Save"}
              </Button>
            </div>
          </div>

          {type === "reward" && (
            <>
              <select value={journeyPreset} onChange={(e) => {
                const p = getJourneyPreset(e.target.value);
                setJourneyPreset(p.id); setJourneyTheme(p.theme); setTravelerIcon(p.traveler); setDestinationIcon(p.destination);
              }} className="w-full h-8 rounded-md border bg-background px-3 text-sm">
                {JOURNEY_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Traveler</p>
                  <IconPicker value={travelerIcon} onChange={setTravelerIcon} clientId={item.client_id} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Destination</p>
                  <IconPicker value={destinationIcon} onChange={setDestinationIcon} clientId={item.client_id} />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group">
      <CardContent className="py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <ItemIcon icon={item.icon} />
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{item.name}</p>
              <Badge variant={type === "behavior" ? "secondary" : "default"} className="text-xs">
                {type === "behavior" ? `${item.point_value > 0 ? "+" : ""}${item.point_value}` : `${item.point_cost} pts`}
              </Badge>
            </div>
          </div>
          <div className="flex gap-0.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => setEditing(true)} title="Edit">
              ✏️
            </Button>
            <Button variant="ghost" size="sm"
              className={`h-7 w-7 p-0 ${confirmDelete ? "text-destructive" : "text-muted-foreground hover:text-destructive"}`}
              onClick={remove}
              onBlur={() => setTimeout(() => setConfirmDelete(false), 200)}
              title={confirmDelete ? "Click again to delete" : "Delete"}
            >
              {confirmDelete ? "❌" : "🗑️"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AddItemForm({ type, clientId, onAdded }: { type: "behavior" | "reward"; clientId: string; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [value, setValue] = useState(type === "reward" ? 10 : 1);
  const [icon, setIcon] = useState(type === "reward" ? "🎁" : "⭐");
  const [journeyPreset, setJourneyPreset] = useState("space");
  const [travelerIcon, setTravelerIcon] = useState("🚀");
  const [destinationIcon, setDestinationIcon] = useState("🌙");
  const [journeyTheme, setJourneyTheme] = useState("space");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    if (type === "behavior") {
      await supabase.from("behaviors").insert({
        client_id: clientId, name, point_value: value, icon,
        is_active: true, description: null, created_by: null,
      });
    } else {
      await supabase.from("rewards").insert({
        client_id: clientId, name, point_cost: value, icon,
        journey_preset: journeyPreset, traveler_icon: travelerIcon, destination_icon: destinationIcon, journey_theme: journeyTheme,
        is_active: true, description: null, created_by: null,
      });
    }
    setName(""); setValue(type === "reward" ? 10 : 1); setBusy(false);
    onAdded();
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="flex gap-2 items-center">
        <IconPicker value={icon} onChange={setIcon} clientId={clientId} />
        <Input value={name} onChange={(e) => setName(e.target.value)}
          placeholder={type === "behavior" ? "e.g. Followed instructions" : "e.g. iPad time"}
          className="flex-1 min-w-0 h-9" required />
      </div>
      <div className="flex gap-2 items-center">
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">{type === "behavior" ? "±" : ""}</span>
          <Input type="number" min={type === "behavior" ? -99 : 1} value={value} onChange={(e) => setValue(+e.target.value)} className="w-16 h-9" />
          <span className="text-xs text-muted-foreground">pts</span>
        </div>
        <Button type="submit" size="sm" className="h-9 ml-auto" disabled={busy}>Add</Button>
      </div>

      {type === "reward" && (
        <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
          <select value={journeyPreset} onChange={(e) => {
            const p = getJourneyPreset(e.target.value);
            setJourneyPreset(p.id); setJourneyTheme(p.theme); setTravelerIcon(p.traveler); setDestinationIcon(p.destination);
          }} className="w-full h-9 rounded-md border bg-background px-3 text-sm">
            {JOURNEY_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3 items-start">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Traveler</p>
              <IconPicker value={travelerIcon} onChange={setTravelerIcon} clientId={clientId} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Destination</p>
              <IconPicker value={destinationIcon} onChange={setDestinationIcon} clientId={clientId} />
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

// ═══════════════════════════════════════
// DATA TAB
// ═══════════════════════════════════════

import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const CHART_COLORS = ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6"];

type DateRange = "7d" | "30d" | "90d" | "all";

function DataTab({ clientId, clientName }: { clientId: string; clientName: string }) {
  const { behaviors, transactions, loading } = useClientDetail(clientId);
  const [range, setRange] = useState<DateRange>("30d");
  const [filterBehavior, setFilterBehavior] = useState<string>("all");

  if (loading) return <p className="text-muted-foreground">Loading data...</p>;

  // Filter transactions by date range
  const now = Date.now();
  const rangeMs: Record<DateRange, number> = { "7d": 7 * 86400000, "30d": 30 * 86400000, "90d": 90 * 86400000, "all": Infinity };
  const filtered = transactions.filter((t) => now - new Date(t.created_at).getTime() < rangeMs[range]);

  // Further filter by behavior if selected
  const behaviorFiltered = filterBehavior === "all"
    ? filtered
    : filtered.filter((t) => t.behavior_id === filterBehavior || (filterBehavior === "debits" && t.type === "debit"));

  // ── Summary stats ──
  const totalCredits = filtered.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0);
  const totalDebits = filtered.filter((t) => t.type === "debit").reduce((s, t) => s + t.amount, 0);
  const creditCount = filtered.filter((t) => t.type === "credit").length;
  const debitCount = filtered.filter((t) => t.type === "debit").length;

  // ── Bar chart: points per behavior ──
  const behaviorTotals = new Map<string, { name: string; icon: string; points: number; count: number }>();
  filtered.filter((t) => t.type === "credit" && t.behavior).forEach((t) => {
    const key = t.behavior_id ?? "unknown";
    const prev = behaviorTotals.get(key) ?? { name: t.behavior?.name ?? "Unknown", icon: t.behavior?.icon ?? "⭐", points: 0, count: 0 };
    prev.points += t.amount;
    prev.count += 1;
    behaviorTotals.set(key, prev);
  });
  const barData = Array.from(behaviorTotals.values()).sort((a, b) => b.points - a.points);

  // ── Pie chart: reward redemptions ──
  const rewardTotals = new Map<string, { name: string; icon: string; count: number; points: number }>();
  filtered.filter((t) => t.type === "debit" && t.reward).forEach((t) => {
    const key = t.reward_id ?? "unknown";
    const prev = rewardTotals.get(key) ?? { name: t.reward?.name ?? "Unknown", icon: t.reward?.icon ?? "🎁", count: 0, points: 0 };
    prev.count += 1;
    prev.points += t.amount;
    rewardTotals.set(key, prev);
  });
  const pieData = Array.from(rewardTotals.values());

  // ── Timeline: daily points earned ──
  const dailyMap = new Map<string, { date: string; earned: number; spent: number }>();
  filtered.forEach((t) => {
    const day = new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const prev = dailyMap.get(day) ?? { date: day, earned: 0, spent: 0 };
    if (t.type === "credit") prev.earned += t.amount;
    else prev.spent += t.amount;
    dailyMap.set(day, prev);
  });
  const timelineData = Array.from(dailyMap.values()).reverse();

  // ── CSV export ──
  function exportCSV() {
    const rows = behaviorFiltered
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((t) => ({
        Date: new Date(t.created_at).toISOString(),
        Type: t.type,
        Description: t.type === "credit" ? (t.behavior?.name ?? "Points awarded") : (t.reward?.name ?? "Reward redeemed"),
        Amount: t.type === "credit" ? t.amount : -t.amount,
        Balance: t.balance_after,
        Note: t.note ?? "",
      }));

    const headers = Object.keys(rows[0] ?? {});
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => {
        const val = (r as any)[h];
        return typeof val === "string" && (val.includes(",") || val.includes('"'))
          ? `"${val.replace(/"/g, '""')}"`
          : val;
      }).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${clientName.replace(/\s+/g, "_")}_data_${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-lg border overflow-hidden flex-shrink-0">
            {(["7d", "30d", "90d", "all"] as DateRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "px-2.5 py-1.5 text-xs font-medium transition-colors",
                  range === r ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                )}
              >
                {r === "all" ? "All" : r}
              </button>
            ))}
          </div>
          <select
            value={filterBehavior}
            onChange={(e) => setFilterBehavior(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1.5 text-xs h-8 min-w-0 flex-1 sm:flex-none sm:w-auto"
          >
            <option value="all">All transactions</option>
            <option value="debits">Redemptions only</option>
            {behaviors.map((b) => (
              <option key={b.id} value={b.id}>{b.icon} {b.name}</option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={behaviorFiltered.length === 0}
            className="ml-auto flex-shrink-0">
            📥 CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
        <Card><CardContent className="py-3 md:py-4 text-center">
          <p className="text-xl md:text-2xl font-bold text-green-600">+{totalCredits}</p>
          <p className="text-[10px] md:text-xs text-muted-foreground">Earned</p>
        </CardContent></Card>
        <Card><CardContent className="py-3 md:py-4 text-center">
          <p className="text-xl md:text-2xl font-bold text-red-500">−{totalDebits}</p>
          <p className="text-[10px] md:text-xs text-muted-foreground">Spent</p>
        </CardContent></Card>
        <Card><CardContent className="py-3 md:py-4 text-center">
          <p className="text-xl md:text-2xl font-bold">{creditCount}</p>
          <p className="text-[10px] md:text-xs text-muted-foreground">Awards</p>
        </CardContent></Card>
        <Card><CardContent className="py-3 md:py-4 text-center">
          <p className="text-xl md:text-2xl font-bold">{debitCount}</p>
          <p className="text-[10px] md:text-xs text-muted-foreground">Redeemed</p>
        </CardContent></Card>
      </div>

      {/* Timeline Chart — earned vs spent */}
      {timelineData.length > 1 && (
        <Card>
          <CardContent className="py-5">
            <p className="text-sm font-medium text-muted-foreground mb-4">Points Over Time</p>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="earned" stroke="#22c55e" strokeWidth={2} name="Earned" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="spent" stroke="#ef4444" strokeWidth={2} name="Spent" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Behavior Frequency by Day — line per behavior */}
      {(() => {
        // Build: { date: string, [behaviorName]: count }[]
        const behaviorNames = Array.from(new Set(
          filtered.filter((t) => t.type === "credit" && t.behavior).map((t) => t.behavior?.name ?? "")
        )).filter(Boolean);

        if (behaviorNames.length === 0) return null;

        const dailyBehaviors = new Map<string, Record<string, number>>();
        filtered.filter((t) => t.type === "credit" && t.behavior).forEach((t) => {
          const day = new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
          if (!dailyBehaviors.has(day)) dailyBehaviors.set(day, {});
          const row = dailyBehaviors.get(day)!;
          const name = t.behavior?.name ?? "";
          row[name] = (row[name] ?? 0) + 1;
        });

        const chartData = Array.from(dailyBehaviors.entries())
          .map(([date, counts]) => ({ date, ...counts }))
          .reverse();

        if (chartData.length < 2) return null;

        return (
          <Card>
            <CardContent className="py-5">
              <p className="text-sm font-medium text-muted-foreground mb-4">Behavior Frequency by Day</p>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  {behaviorNames.map((name, i) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );
      })()}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Bar Chart: Points by Behavior */}
        {barData.length > 0 && (
          <Card>
            <CardContent className="py-5">
              <p className="text-sm font-medium text-muted-foreground mb-4">Points by Behavior</p>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip formatter={(val: number) => [`${val} pts`, "Points"]} />
                  <Bar dataKey="points" radius={[0, 4, 4, 0]}>
                    {barData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Pie Chart: Reward Redemptions */}
        {pieData.length > 0 && (
          <Card>
            <CardContent className="py-5">
              <p className="text-sm font-medium text-muted-foreground mb-4">Reward Redemptions</p>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, count }) => `${name} (${count})`}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number, name: string) => [`${val} times`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Frequency Table */}
      {barData.length > 0 && (
        <Card>
          <CardContent className="py-5">
            <p className="text-sm font-medium text-muted-foreground mb-4">Behavior Frequency</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Behavior</th>
                    <th className="pb-2 pr-4 font-medium text-right">Times Awarded</th>
                    <th className="pb-2 pr-4 font-medium text-right">Total Points</th>
                    <th className="pb-2 font-medium text-right">Avg / Day</th>
                  </tr>
                </thead>
                <tbody>
                  {barData.map((b, i) => {
                    const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : Math.max(1, Math.ceil((now - new Date(transactions[transactions.length - 1]?.created_at ?? now).getTime()) / 86400000));
                    return (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2.5 pr-4">{b.icon} {b.name}</td>
                        <td className="py-2.5 pr-4 text-right font-medium">{b.count}</td>
                        <td className="py-2.5 pr-4 text-right text-green-600 font-medium">+{b.points}</td>
                        <td className="py-2.5 text-right text-muted-foreground">{(b.count / days).toFixed(1)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Table Preview */}
      <Card>
        <CardContent className="py-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-muted-foreground">
              Transaction Log ({behaviorFiltered.length} records)
            </p>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={behaviorFiltered.length === 0}>
              📥 Export CSV
            </Button>
          </div>
          {behaviorFiltered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No data for this period.</p>
          ) : (
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Date & Time</th>
                    <th className="pb-2 pr-4 font-medium">Type</th>
                    <th className="pb-2 pr-4 font-medium">Description</th>
                    <th className="pb-2 pr-4 font-medium text-right">Amount</th>
                    <th className="pb-2 font-medium text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {behaviorFiltered.map((txn) => (
                    <tr key={txn.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground text-xs">
                        {new Date(txn.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </td>
                      <td className="py-2 pr-4">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${txn.type === "credit" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {txn.type === "credit" ? "Credit" : "Debit"}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-xs">
                        {txn.type === "credit" ? txn.behavior?.name ?? "Points" : txn.reward?.name ?? "Reward"}
                      </td>
                      <td className="py-2 pr-4 text-right font-medium">
                        <span className={txn.type === "credit" ? "text-green-600" : "text-red-500"}>
                          {txn.type === "credit" ? "+" : "−"}{txn.amount}
                        </span>
                      </td>
                      <td className="py-2 text-right font-mono text-xs">{txn.balance_after}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════
// PRINTABLES TAB
// ═══════════════════════════════════════

function PrintablesTab({ clientId, client }: { clientId: string; client: any }) {
  const { behaviors, rewards, loading } = useClientDetail(clientId);
  const [copies, setCopies] = useState(1);

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  function handlePrintAll() {
    const win = window.open("", "_blank");
    if (!win) return;

    // Collect all QR SVGs from the DOM
    const clientQR = document.getElementById(`print-qr-${client.id}`)?.innerHTML ?? "";
    const rewardQRs = rewards.map((r) => ({
      ...r,
      qrHtml: document.getElementById(`reward-qr-${r.id}`)?.innerHTML ?? "",
    }));

    const pages: string[] = [];
    for (let i = 0; i < copies; i++) {
      // Client card
      pages.push(`
        <div class="page-break">
          <div class="section-title">Client Card${copies > 1 ? ` (${i + 1}/${copies})` : ""}</div>
          <div class="card" style="background: linear-gradient(135deg, #4f46e5, #7c3aed);">
            <div class="card-top"><div class="brand">🏆 BXR+</div><div class="sticker">⭐</div></div>
            <div class="chip"></div>
            <div class="card-name">${client.full_name}</div>
            <div class="card-sub">My Reward Card</div>
            <div class="card-qr">${clientQR}</div>
          </div>
        </div>
      `);

      // Reward tickets — 4 per page
      if (rewardQRs.length > 0) {
        for (let j = 0; j < rewardQRs.length; j += 4) {
          const batch = rewardQRs.slice(j, j + 4);
          pages.push(`
            <div class="page-break">
              <div class="section-title">Reward Tickets${copies > 1 ? ` (${i + 1}/${copies})` : ""}</div>
              <div class="ticket-grid">
                ${batch.map((r) => `
                  <div class="ticket">
                    <div class="ticket-notch-l"></div><div class="ticket-notch-r"></div>
                    <div class="ticket-icon">${r.icon}</div>
                    <div class="ticket-name">${r.name}</div>
                    <div class="ticket-cost">${r.point_cost} points</div>
                    <div class="ticket-for">for ${client.full_name}</div>
                    <div class="ticket-qr">${r.qrHtml}</div>
                    <div class="ticket-scan">Scan to redeem</div>
                  </div>
                `).join("")}
              </div>
            </div>
          `);
        }
      }

      // Behavior reference card
      if (behaviors.length > 0) {
        pages.push(`
          <div class="page-break">
            <div class="section-title">Behavior Reference${copies > 1 ? ` (${i + 1}/${copies})` : ""}</div>
            <div class="ref-card">
              <div class="ref-header">
                <span>⭐ Behaviors for ${client.full_name}</span>
              </div>
              <table class="ref-table">
                <thead><tr><th>Behavior</th><th>Points</th></tr></thead>
                <tbody>
                  ${behaviors.map((b) => `
                    <tr><td>${b.icon} ${b.name}</td><td class="pts">+${b.point_value}</td></tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </div>
        `);
      }
    }

    win.document.write(`
      <html><head><title>BXR+ Printables — ${client.full_name}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: white; padding: 20px; }
        .page-break { page-break-after: always; margin-bottom: 40px; }
        .page-break:last-child { page-break-after: avoid; }
        .section-title { font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 16px; }

        /* Card */
        .card { width: 3.375in; height: 2.125in; border-radius: 14px; color: white; padding: 18px; position: relative; overflow: hidden; margin: 0 auto; }
        .card::before { content: ''; position: absolute; top: -40px; right: -40px; width: 140px; height: 140px; border-radius: 50%; background: rgba(255,255,255,0.08); }
        .card-top { display: flex; justify-content: space-between; align-items: flex-start; position: relative; z-index: 1; margin-bottom: 8px; }
        .brand { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; opacity: 0.7; }
        .sticker { font-size: 28px; }
        .chip { width: 34px; height: 26px; border-radius: 5px; background: rgba(255,255,255,0.3); margin-bottom: 14px; position: relative; z-index: 1; }
        .card-name { font-size: 20px; font-weight: 800; position: relative; z-index: 1; }
        .card-sub { font-size: 11px; opacity: 0.7; position: relative; z-index: 1; }
        .card-qr { position: absolute; bottom: 12px; right: 12px; background: white; padding: 5px; border-radius: 8px; z-index: 1; }

        /* Tickets */
        .ticket-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; max-width: 6.5in; margin: 0 auto; }
        .ticket { border: 2px solid #e5e7eb; border-radius: 16px; padding: 20px; text-align: center; position: relative; }
        .ticket-notch-l, .ticket-notch-r { position: absolute; width: 18px; height: 18px; background: white; border-radius: 50%; top: 50%; transform: translateY(-50%); }
        .ticket-notch-l { left: -11px; border-right: 2px solid #e5e7eb; }
        .ticket-notch-r { right: -11px; border-left: 2px solid #e5e7eb; }
        .ticket-icon { font-size: 32px; margin-bottom: 6px; }
        .ticket-name { font-size: 14px; font-weight: 700; }
        .ticket-cost { font-size: 12px; color: #6b7280; margin-bottom: 8px; }
        .ticket-for { font-size: 10px; color: #9ca3af; margin-bottom: 10px; }
        .ticket-qr { display: inline-block; padding: 6px; border: 1px solid #e5e7eb; border-radius: 8px; }
        .ticket-scan { font-size: 9px; color: #9ca3af; margin-top: 4px; }

        /* Behavior reference */
        .ref-card { border: 2px solid #e5e7eb; border-radius: 12px; overflow: hidden; max-width: 5in; margin: 0 auto; }
        .ref-header { background: #f9fafb; padding: 12px 16px; font-weight: 700; font-size: 14px; border-bottom: 2px solid #e5e7eb; }
        .ref-table { width: 100%; border-collapse: collapse; }
        .ref-table th { text-align: left; padding: 8px 16px; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e5e7eb; }
        .ref-table td { padding: 10px 16px; font-size: 14px; border-bottom: 1px solid #f3f4f6; }
        .ref-table .pts { text-align: right; font-weight: 600; color: #16a34a; }

        @media print { 
          body { padding: 0; } 
          .page-break { margin-bottom: 0; }
        }
      </style></head><body>
      ${pages.join("")}
      <script>window.print();<\/script>
      </body></html>
    `);
    win.document.close();
  }

  return (
    <div className="space-y-8">
      {/* Print All controls */}
      <Card>
        <CardContent className="py-5">
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold">Print All Materials</h3>
              <p className="text-sm text-muted-foreground">
                Client card, reward tickets, and behavior reference.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Copies:</label>
                <Input type="number" min={1} max={20} value={copies} onChange={(e) => setCopies(Math.max(1, +e.target.value))}
                  className="w-14 h-8 text-center text-sm" />
              </div>
              <Button onClick={handlePrintAll} className="ml-auto">
                🖨️ Print All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client Card Preview */}
      <div>
        <h3 className="font-semibold mb-3">💳 Client Card</h3>
        <p className="text-sm text-muted-foreground mb-4">Credit-card sized — print and laminate. Scan to open their dashboard.</p>
        <PrintableClientCard client={client} />
      </div>

      {/* Reward Tickets */}
      {rewards.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">🎫 Reward Tickets</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Print and display — clients can see what they're working toward. Scan a ticket to redeem.
          </p>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {rewards.map((r) => (
              <PrintableRewardTicket key={r.id} reward={r} client={client} />
            ))}
          </div>
        </div>
      )}

      {/* Behavior Reference */}
      {behaviors.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">📋 Behavior Reference Sheet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Quick reference for the team — which behaviors earn how many points.
          </p>
          <Card className="max-w-md">
            <CardContent className="py-0">
              <div className="py-3 border-b font-semibold text-sm">
                ⭐ Behaviors for {client.full_name}
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground uppercase">
                    <th className="text-left py-2 font-medium">Behavior</th>
                    <th className="text-right py-2 font-medium">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {behaviors.map((b) => (
                    <tr key={b.id} className="border-t">
                      <td className="py-2">{b.icon} {b.name}</td>
                      <td className="py-2 text-right text-green-600 font-semibold">+{b.point_value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {rewards.length === 0 && behaviors.length === 0 && (
        <p className="text-muted-foreground text-center py-8">
          Add some behaviors and rewards first — then come back here to print everything.
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// TEAM TAB
// ═══════════════════════════════════════

function TeamTab({ clientId, isOwner }: { clientId: string; isOwner: boolean }) {
  const { user } = useAuth();
  const { refresh: refreshClients } = useClientContext();
  const [staff, setStaff] = useState<any[]>([]);
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [role, setRole] = useState<AppRole>("rbt");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  async function fetchTeam() {
    setLoading(true);
    const [c, s] = await Promise.all([
      supabase.from("clients").select("*").eq("id", clientId).single(),
      supabase.from("client_staff").select("*, profile:profiles(full_name)").eq("client_id", clientId),
    ]);
    setClient(c.data);
    setStaff(s.data ?? []);
    setLoading(false);
  }

  // Re-fetch when clientId changes
  useEffect(() => { fetchTeam(); }, [clientId]);

  // Live search as user types
  useEffect(() => {
    if (searchName.length < 2) { setSearchResults([]); setShowResults(false); return; }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .ilike("full_name", `%${searchName}%`)
        .limit(8);
      // Filter out people already on the team
      const staffIds = new Set(staff.map((s: any) => s.user_id));
      const filtered = (data ?? []).filter((p: any) => !staffIds.has(p.id) && p.id !== user?.id);
      setSearchResults(filtered);
      setShowResults(true);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchName, staff, user]);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function selectUser(p: any) {
    setSelectedUser(p);
    setSearchName(p.full_name);
    setShowResults(false);
    setError("");
  }

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!selectedUser) {
      setError("Select a person from the dropdown.");
      return;
    }
    setAdding(true);
    if (staff.find((s: any) => s.user_id === selectedUser.id)) { setError("Already on the team."); setAdding(false); return; }
    await supabase.from("client_staff").insert({ client_id: clientId, user_id: selectedUser.id, relationship: role });
    setSearchName(""); setSelectedUser(null); setAdding(false); fetchTeam();
  }

  async function removeMember(id: string) {
    await supabase.from("client_staff").delete().eq("id", id);
    fetchTeam();
  }

  async function changeRole(staffId: string, newRole: AppRole) {
    await supabase.from("client_staff").update({ relationship: newRole }).eq("id", staffId);
    fetchTeam();
  }

  async function transferOwnership(newOwnerId: string) {
    await supabase.rpc("transfer_ownership", { p_client_id: clientId, p_new_owner_id: newOwnerId });
    await fetchTeam();
    await refreshClients();
  }

  if (loading) return <p className="text-muted-foreground">Loading team...</p>;

  const roleColors: Record<string, string> = {
    bcba: "bg-purple-100 text-purple-700",
    rbt: "bg-blue-100 text-blue-700",
    parent: "bg-green-100 text-green-700",
  };

  return (
    <div className="space-y-6">
      {/* Printable Credit Card */}
      {client && (
        <Card>
          <CardContent className="py-5">
            <p className="font-medium mb-1">Client Card</p>
            <p className="text-sm text-muted-foreground mb-4">Print and laminate — scan from any phone to pull up their dashboard.</p>
            <PrintableClientCard client={client} />
          </CardContent>
        </Card>
      )}

      {/* Team Members */}
      <Card>
        <CardContent className="py-4">
          <p className="font-medium mb-3">Team Members</p>

          {/* Owner */}
          <div className="flex items-center justify-between py-2 border-b">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                👑
              </div>
              <div>
                <p className="text-sm font-medium">
                  {client?.owner_id === user?.id ? "You" : "Owner"}
                </p>
                <Badge className="text-xs bg-amber-100 text-amber-800">Owner</Badge>
              </div>
            </div>
          </div>

          {/* Staff */}
          {staff.map((s: any) => (
            <StaffRow
              key={s.id}
              staff={s}
              isOwner={isOwner}
              roleColors={roleColors}
              onChangeRole={(newRole) => changeRole(s.id, newRole)}
              onMakeOwner={() => transferOwnership(s.user_id)}
              onRemove={() => removeMember(s.id)}
            />
          ))}
        </CardContent>
      </Card>

      {/* Add member — owner only */}
      {isOwner && (
        <Card>
          <CardContent className="py-4">
            <p className="font-medium mb-3">Add Team Member</p>
            <form onSubmit={addMember} className="flex gap-2 items-end">
              <div className="flex-1 relative" ref={searchRef}>
                <Input
                  value={searchName}
                  onChange={(e) => { setSearchName(e.target.value); setSelectedUser(null); }}
                  onFocus={() => searchResults.length > 0 && setShowResults(true)}
                  placeholder="Start typing a name..."
                  className="h-9"
                  required
                />
                {/* Live search dropdown */}
                {showResults && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                    {searchResults.length === 0 ? (
                      <div className="px-3 py-3 text-sm text-muted-foreground">
                        No users found. They need to create a BXR+ account first.
                      </div>
                    ) : (
                      searchResults.map((p: any) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => selectUser(p)}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-accent transition-colors"
                        >
                          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {p.full_name[0]?.toUpperCase()}
                          </div>
                          <span className="text-sm font-medium">{p.full_name}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
                {selectedUser && (
                  <p className="text-xs text-green-600 mt-1">✓ {selectedUser.full_name} selected</p>
                )}
              </div>
              <select value={role} onChange={(e) => setRole(e.target.value as AppRole)}
                className="rounded-md border border-input bg-background px-2 py-1 text-sm h-9">
                <option value="rbt">RBT</option>
                <option value="parent">Parent</option>
                <option value="bcba">BCBA</option>
              </select>
              <Button type="submit" size="sm" className="h-9" disabled={adding || !selectedUser}>
                {adding ? "..." : "Add"}
              </Button>
            </form>
            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// CLIENT SETTINGS TAB
// ═══════════════════════════════════════

function ClientSettingsTab({ clientId, isOwner }: { clientId: string; isOwner: boolean }) {
  const { refresh: refreshClients } = useClientContext();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    supabase.from("clients").select("*").eq("id", clientId).single().then(({ data }) => {
      setClient(data);
      setName(data?.full_name ?? "");
      setDob(data?.date_of_birth ?? "");
      setLoading(false);
    });
  }, [clientId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setSaved(false);
    await supabase.from("clients").update({
      full_name: name.trim(),
      date_of_birth: dob || null,
    }).eq("id", clientId);
    setSaving(false);
    setSaved(true);
    await refreshClients();
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    // Delete staff links first, then client
    await supabase.from("client_staff").delete().eq("client_id", clientId);
    await supabase.from("behaviors").delete().eq("client_id", clientId);
    await supabase.from("rewards").delete().eq("client_id", clientId);
    await supabase.from("transactions").delete().eq("client_id", clientId);
    await supabase.from("clients").delete().eq("id", clientId);
    await refreshClients();
    persistedTab = "dashboard";
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6 max-w-lg">
      {/* Edit Details */}
      <Card>
        <CardContent className="py-5">
          <h3 className="font-semibold mb-4">Client Details</h3>
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
              <label className="text-sm font-medium">QR Code</label>
              <Input value={client?.qr_code ?? ""} disabled className="bg-muted font-mono text-xs" />
              <p className="text-[11px] text-muted-foreground">Auto-generated. Used for card scanning.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Current Balance</label>
              <Input value={`${client?.balance ?? 0} points`} disabled className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Created</label>
              <Input
                value={client?.created_at ? new Date(client.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : ""}
                disabled className="bg-muted"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              {saved && <span className="text-sm text-green-600">✓ Saved</span>}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone — owner only */}
      {isOwner && (
        <Card className="border-destructive/30">
          <CardContent className="py-5">
            <h3 className="font-semibold text-destructive mb-2">Danger Zone</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Deleting a client removes all their data — behaviors, rewards, transactions, and team assignments. This cannot be undone.
            </p>
            {confirmDelete ? (
              <div className="flex items-center gap-3">
                <p className="text-sm text-destructive font-medium">Are you sure?</p>
                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
                  {deleting ? "Deleting..." : "Yes, Delete Everything"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button variant="destructive" onClick={handleDelete}>
                Delete Client
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// STAFF ROW (with editable role)
// ═══════════════════════════════════════

function StaffRow({ staff, isOwner, roleColors, onChangeRole, onMakeOwner, onRemove }: {
  staff: any;
  isOwner: boolean;
  roleColors: Record<string, string>;
  onChangeRole: (role: AppRole) => void;
  onMakeOwner: () => void;
  onRemove: () => void;
}) {
  const [confirmTransfer, setConfirmTransfer] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  return (
    <div className="flex items-center justify-between py-2.5 border-b last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
          {(staff.profile?.full_name ?? "?")[0].toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-medium">{staff.profile?.full_name ?? "Unknown"}</p>
          {isOwner ? (
            <select
              value={staff.relationship}
              onChange={(e) => onChangeRole(e.target.value as AppRole)}
              className={`text-xs font-medium rounded-full px-2 py-0.5 border-0 cursor-pointer ${roleColors[staff.relationship] ?? ""}`}
            >
              <option value="bcba">BCBA</option>
              <option value="rbt">RBT</option>
              <option value="parent">Parent</option>
            </select>
          ) : (
            <Badge className={`text-xs ${roleColors[staff.relationship] ?? ""}`}>
              {staff.relationship.toUpperCase()}
            </Badge>
          )}
        </div>
      </div>
      {isOwner && (
        <div className="flex gap-1">
          {confirmTransfer ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Transfer ownership?</span>
              <Button variant="default" size="sm" className="h-6 text-xs px-2" onClick={onMakeOwner}>Yes</Button>
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2"
                onClick={() => setConfirmTransfer(false)}>No</Button>
            </div>
          ) : confirmRemove ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-destructive">Remove?</span>
              <Button variant="destructive" size="sm" className="h-6 text-xs px-2" onClick={onRemove}>Yes</Button>
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2"
                onClick={() => setConfirmRemove(false)}>No</Button>
            </div>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setConfirmTransfer(true)} title="Transfer ownership">
                👑
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-muted-foreground hover:text-destructive"
                onClick={() => setConfirmRemove(true)} title="Remove from team">
                ✕
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════

function ItemIcon({ icon, size = "text-xl" }: { icon: string; size?: string }) {
  if (icon.startsWith("http")) {
    return <img src={icon} alt="" className="w-6 h-6 object-contain rounded flex-shrink-0" />;
  }
  return <span className={`${size} flex-shrink-0`}>{icon}</span>;
}

function QuickAwardBtn({ behavior, clientId, onDone, onCelebrate, onOptimisticAward }: { behavior: any; clientId: string; onDone: () => void; onCelebrate?: (x?: number, y?: number, type?: "confetti" | "stars" | "sparkles" | "penalty") => void; onOptimisticAward?: (amount: number) => void }) {
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function go(e?: React.MouseEvent<HTMLButtonElement>) {
    if (!confirming) { setConfirming(true); return; }
    setBusy(true);
    onOptimisticAward?.(behavior.point_value);
    try {
      await awardPoints(clientId, behavior.id, behavior.point_value);
      setFlash(true); setConfirming(false);
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
      variant={confirming ? "default" : "outline"}
      size="sm"
      onClick={go}
      onBlur={() => setTimeout(() => setConfirming(false), 200)}
      disabled={busy}
      className={`transition-all ${flash ? behavior.point_value < 0 ? "ring-2 ring-red-300 bg-red-50" : "ring-2 ring-green-400 bg-green-50" : ""}`}
    >
      {confirming ? (
        <><ItemIcon icon={behavior.icon} size="text-base" /> {behavior.point_value < 0 ? `Remove ${Math.abs(behavior.point_value)}?` : `Award +${behavior.point_value}?`}</>
      ) : (
        <><ItemIcon icon={behavior.icon} size="text-base" /> {behavior.name} <Badge variant={behavior.point_value < 0 ? "destructive" : "secondary"} className="ml-1.5 text-xs">{behavior.point_value > 0 ? "+" : ""}{behavior.point_value}</Badge></>
      )}
    </Button>
  );
}

const JOURNEY_PRESETS = [
  { id: "space", label: "Space Journey", traveler: "🚀", destination: "🌙", theme: "space" },
  { id: "princess", label: "Princess Quest", traveler: "👸", destination: "🐴", theme: "princess" },
  { id: "train", label: "Train Adventure", traveler: "🚂", destination: "🏰", theme: "train" },
  { id: "ocean", label: "Ocean Adventure", traveler: "🧜", destination: "🐚", theme: "ocean" },
  { id: "dino", label: "Dino Trek", traveler: "🦖", destination: "🌋", theme: "dino" },
  { id: "unicorn", label: "Unicorn Trail", traveler: "🦄", destination: "🌈", theme: "unicorn" },
];

function getJourneyPreset(id: string) {
  return JOURNEY_PRESETS.find((p) => p.id === id) ?? JOURNEY_PRESETS[0];
}

function UnifiedRewardPath({ rewards, current, onRedeem, onCelebrate }: {
  rewards: any[];
  current: number;
  onRedeem: (reward: any) => Promise<void>;
  onCelebrate?: (x?: number, y?: number, type?: "confetti" | "stars" | "sparkles" | "penalty") => void;
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [moveImpulse, setMoveImpulse] = useState(0);
  const sorted = [...rewards].sort((a, b) => a.point_cost - b.point_cost);
  const maxCost = Math.max(...sorted.map((r) => r.point_cost), 1);
  const nextReward = sorted.find((r) => current < r.point_cost) ?? null;
  const availableCount = sorted.filter((r) => current >= r.point_cost).length;
  const activeTheme = getJourneyThemeStyles(sorted[0]?.journey_theme ?? getJourneyPreset(sorted[0]?.journey_preset ?? "space").theme);
  const activeTraveler = sorted[0]?.traveler_icon ?? getJourneyPreset(sorted[0]?.journey_preset ?? "space").traveler;
  const avatarPct = Math.min(94, Math.max(6, (current / maxCost) * 100));
  const avatarBottom = `calc(${avatarPct}% - 18px)`;

  useEffect(() => {
    setMoveImpulse((n) => n + 1);
  }, [current]);

  async function handleRedeem(reward: any, e: React.MouseEvent<HTMLButtonElement>) {
    if (confirmingId !== reward.id) { setConfirmingId(reward.id); return; }
    setBusyId(reward.id);
    await onRedeem(reward);
    const rect = e.currentTarget.getBoundingClientRect();
    onCelebrate?.(rect.left + rect.width / 2, rect.top + rect.height / 2);
    setBusyId(null);
    setConfirmingId(null);
  }

  return (
    <Card className={`overflow-hidden ${activeTheme.card}`}>
      <CardContent className="py-5 px-4 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Reward Progress</p>
            <h3 className="text-xl font-bold">{current} points earned</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {availableCount > 0
                ? `${availableCount} reward${availableCount === 1 ? "" : "s"} available now`
                : nextReward
                  ? `${nextReward.point_cost - current} points until the next reward`
                  : "All listed rewards are available"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Next to unlock</p>
            <p className="text-sm font-medium">{nextReward ? `${nextReward.name} · ${nextReward.point_cost} pts` : "Everything unlocked"}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-[140px_1fr] gap-5 items-start">
          <div className="relative h-[520px] md:h-[640px] flex justify-center">
            <div className={`absolute inset-y-4 w-16 rounded-full ${activeTheme.trackBg}`} />
            <div className={`absolute bottom-4 w-16 rounded-full transition-all duration-500 ${activeTheme.trackFill}`} style={{ height: `${avatarPct}%` }} />
            <div className="absolute left-1/2 -translate-x-1/2 z-20 transition-all duration-500 ease-[cubic-bezier(.22,1.4,.36,1)]" style={{ bottom: avatarBottom }}>
              <div className={`w-16 h-16 rounded-3xl bg-background/90 border shadow-md grid place-items-center animate-journey-bob ${moveImpulse ? "animate-avatar-boost" : ""}`}>
                <ItemIcon icon={activeTraveler} size="text-4xl" />
              </div>
            </div>
            {sorted.map((reward) => {
              const y = `calc(${Math.min(96, Math.max(6, (reward.point_cost / maxCost) * 100))}% - 18px)`;
              const unlocked = current >= reward.point_cost;
              const isNext = nextReward?.id === reward.id;
              return (
                <div key={reward.id} className="absolute left-1/2 -translate-x-1/2 w-full flex justify-center" style={{ bottom: y }}>
                  <div className={`w-12 h-12 rounded-2xl border-2 shadow-sm grid place-items-center ${unlocked ? "bg-background border-primary" : "bg-muted border-border"} ${isNext ? "ring-4 ring-primary/15" : ""}`}>
                    <ItemIcon icon={reward.destination_icon ?? reward.icon ?? "🎁"} size="text-2xl" />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-3">
            {sorted.map((reward) => {
              const unlocked = current >= reward.point_cost;
              const isNext = nextReward?.id === reward.id;
              const preset = getJourneyPreset(reward.journey_preset ?? reward.journey_theme ?? "space");
              return (
                <div key={reward.id} className={`rounded-2xl border p-4 transition-all ${unlocked ? "bg-background shadow-sm" : "bg-muted/30"} ${isNext ? "border-primary shadow-md" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex items-start gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-background border grid place-items-center flex-shrink-0">
                        <ItemIcon icon={reward.icon} size="text-2xl" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{reward.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {unlocked ? "Available now" : isNext ? `${reward.point_cost - current} points to unlock` : `${reward.point_cost} points required`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Theme: {preset.label}</p>
                      </div>
                    </div>
                    <Badge className={unlocked ? activeTheme.badge : "bg-muted text-muted-foreground"}>{reward.point_cost} pts</Badge>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="text-xs text-muted-foreground">
                      {unlocked ? "Can be redeemed now" : isNext ? "Closest upcoming reward" : "Keep working toward this reward"}
                    </div>
                    {unlocked ? (
                      <Button size="sm" variant={confirmingId === reward.id ? "destructive" : "default"}
                        onClick={(e) => handleRedeem(reward, e)} disabled={busyId === reward.id}>
                        {busyId === reward.id ? "..." : confirmingId === reward.id ? "Redeem?" : "Redeem"}
                      </Button>
                    ) : (
                      <div className="text-sm font-medium">{Math.max(0, reward.point_cost - current)} left</div>
                    )}
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

function getJourneyThemeStyles(theme: string) {
  const themes: Record<string, { card: string; badge: string; trackBg: string; trackFill: string }> = {
    space: { card: "bg-gradient-to-b from-slate-900/5 to-indigo-500/5", badge: "bg-indigo-100 text-indigo-700", trackBg: "bg-slate-200", trackFill: "bg-gradient-to-t from-violet-600 via-indigo-500 to-sky-400" },
    princess: { card: "bg-gradient-to-b from-pink-50 to-rose-50", badge: "bg-pink-100 text-pink-700", trackBg: "bg-rose-100", trackFill: "bg-gradient-to-t from-pink-400 via-rose-300 to-fuchsia-300" },
    train: { card: "bg-gradient-to-b from-amber-50 to-orange-50", badge: "bg-amber-100 text-amber-700", trackBg: "bg-amber-100", trackFill: "bg-gradient-to-t from-amber-600 via-orange-500 to-yellow-400" },
    ocean: { card: "bg-gradient-to-b from-cyan-50 to-sky-50", badge: "bg-cyan-100 text-cyan-700", trackBg: "bg-cyan-100", trackFill: "bg-gradient-to-t from-cyan-500 via-sky-400 to-blue-300" },
    dino: { card: "bg-gradient-to-b from-lime-50 to-green-50", badge: "bg-lime-100 text-lime-800", trackBg: "bg-lime-100", trackFill: "bg-gradient-to-t from-green-600 via-lime-500 to-emerald-300" },
    unicorn: { card: "bg-gradient-to-b from-violet-50 to-fuchsia-50", badge: "bg-violet-100 text-violet-700", trackBg: "bg-violet-100", trackFill: "bg-gradient-to-t from-violet-500 via-fuchsia-400 to-pink-300" },
  };
  return themes[theme] ?? themes.space;
}

function ProgressCustomizationPanel({ theme, style, animation, onChange }: {
  theme: string; style: string; animation: string;
  onChange: (patch: { reward_bar_theme?: string; reward_bar_style?: string; reward_success_animation?: string }) => Promise<void>;
}) {
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const themes = [
    { id: "rainbow", label: "Rainbow" },
    { id: "stars", label: "Gold Stars" },
    { id: "ocean", label: "Ocean" },
    { id: "candy", label: "Candy" },
    { id: "rocket", label: "Rocket" },
  ];
  const styles = [
    { id: "rounded", label: "Rounded" },
    { id: "pill", label: "Bubble" },
    { id: "ticket", label: "Ticket" },
  ];
  const animations = [
    { id: "confetti", label: "Confetti" },
    { id: "stars", label: "Stars" },
    { id: "sparkles", label: "Sparkles" },
  ];

  async function save(patch: { reward_bar_theme?: string; reward_bar_style?: string; reward_success_animation?: string }, key: string) {
    setSavingKey(key);
    await onChange(patch);
    setTimeout(() => setSavingKey(null), 250);
  }

  return (
    <div className="mb-4 rounded-xl border bg-muted/30 p-4 space-y-4">
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Progress Bar Theme</p>
        <div className="flex flex-wrap gap-2">
          {themes.map((t) => (
            <Button key={t.id} type="button" size="sm" variant={theme === t.id ? "default" : "outline"}
              onClick={() => save({ reward_bar_theme: t.id }, `theme-${t.id}`)}>
              {savingKey === `theme-${t.id}` ? "Saving..." : t.label}
            </Button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Bar Shape</p>
        <div className="flex flex-wrap gap-2">
          {styles.map((s) => (
            <Button key={s.id} type="button" size="sm" variant={style === s.id ? "default" : "outline"}
              onClick={() => save({ reward_bar_style: s.id }, `style-${s.id}`)}>
              {savingKey === `style-${s.id}` ? "Saving..." : s.label}
            </Button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Success Animation</p>
        <div className="flex flex-wrap gap-2">
          {animations.map((a) => (
            <Button key={a.id} type="button" size="sm" variant={animation === a.id ? "default" : "outline"}
              onClick={() => save({ reward_success_animation: a.id }, `anim-${a.id}`)}>
              {savingKey === `anim-${a.id}` ? "Saving..." : a.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

function RewardCelebration({ type, x, y }: { type: "confetti" | "stars" | "sparkles" | "penalty"; x?: number; y?: number }) {
  const fullscreen = x == null || y == null;
  const pieces = Array.from({ length: fullscreen ? 20 : 8 });
  const glyph = type === "confetti" ? ["🎉", "✨", "🎊", "🥳"] : type === "stars" ? ["⭐", "🌟", "💫", "😊"] : type === "penalty" ? ["💥", "⬇️", "⚠️", "😬"] : ["✨", "💖", "⚡", "🌸"];
  const left = x ?? (typeof window !== "undefined" ? window.innerWidth / 2 : 200);
  const top = y ?? (typeof window !== "undefined" ? window.innerHeight / 2 : 240);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-30">
      {pieces.map((_, i) => (
        <span
          key={i}
          className={`absolute ${type === "penalty" ? (fullscreen ? "animate-penalty-screen-pop" : "animate-penalty-pop") : (fullscreen ? "animate-reward-screen-pop" : "animate-reward-pop")} text-xl`}
          style={{
            left: fullscreen ? `${(i * 53) % 100}%` : left,
            top: fullscreen ? `${(i * 29) % 70}%` : top,
            ["--dx" as any]: `${fullscreen ? ((i % 5) - 2) * 30 : (i - 3.5) * 10}px`,
            animationDelay: `${i * 25}ms`,
          }}
        >
          {glyph[i % glyph.length]}
        </span>
      ))}
    </div>
  );
}

function SessionProgressRail({ rewards, current }: { rewards: any[]; current: number }) {
  const [moveImpulse, setMoveImpulse] = useState(0);
  const sorted = [...rewards].sort((a, b) => a.point_cost - b.point_cost);
  const maxCost = Math.max(...sorted.map((r) => r.point_cost), 1);
  const theme = getJourneyThemeStyles(sorted[0]?.journey_theme ?? getJourneyPreset(sorted[0]?.journey_preset ?? "space").theme);
  const traveler = sorted[0]?.traveler_icon ?? getJourneyPreset(sorted[0]?.journey_preset ?? "space").traveler;
  const avatarPct = Math.min(94, Math.max(6, (current / maxCost) * 100));
  const avatarBottom = `calc(${avatarPct}% - 18px)`;

  useEffect(() => {
    setMoveImpulse((n) => n + 1);
  }, [current]);

  return (
    <Card className={`overflow-hidden ${theme.card}`}>
      <CardContent className="py-4 px-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Live Reward Progress</p>
        <p className="text-2xl font-extrabold mb-1">{current}</p>
        <p className="text-xs text-muted-foreground mb-3">Current points</p>
        <div className="mb-3 rounded-xl bg-background/70 border px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Reward status:</span> watch the icon move as points change.
        </div>
        <div className="relative h-[340px] lg:h-[560px] flex justify-center">
          <div className={`absolute inset-y-3 w-14 rounded-full ${theme.trackBg}`} />
          <div className={`absolute bottom-3 w-14 rounded-full transition-all duration-500 ${theme.trackFill}`} style={{ height: `${avatarPct}%` }} />
          <div className="absolute left-1/2 -translate-x-1/2 z-20 transition-all duration-500 ease-[cubic-bezier(.22,1.4,.36,1)]" style={{ bottom: avatarBottom }}>
            <div className={`w-14 h-14 rounded-3xl bg-background/90 border shadow-md grid place-items-center animate-journey-bob ${moveImpulse ? "animate-avatar-boost" : ""}`}>
              <ItemIcon icon={traveler} size="text-3xl" />
            </div>
          </div>
          {sorted.map((reward) => {
            const y = `calc(${Math.min(96, Math.max(6, (reward.point_cost / maxCost) * 100))}% - 14px)`;
            const unlocked = current >= reward.point_cost;
            return (
              <div key={reward.id} className="absolute left-1/2 -translate-x-1/2 w-full flex justify-center" style={{ bottom: y }}>
                <div className={`w-10 h-10 rounded-2xl border-2 shadow-sm grid place-items-center ${unlocked ? "bg-background border-primary" : "bg-muted border-border"}`}>
                  <ItemIcon icon={reward.destination_icon ?? reward.icon ?? "🎁"} size="text-xl" />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function QuickAwardSessionView({ client, behaviors, onClose, onAwarded, onCelebrate, onOptimisticAward }: {
  client: any;
  behaviors: any[];
  onClose: () => void;
  onAwarded: () => Promise<void>;
  onCelebrate: (x?: number, y?: number, type?: "confetti" | "stars" | "sparkles" | "penalty") => void;
  onOptimisticAward: (amount: number) => void;
}) {
  const { rewards } = useClientDetail(client.id);

  return (
    <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur-sm">
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background/90 backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Live Session</p>
            <h2 className="text-lg font-bold">{client.full_name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Tap behaviors to update points and watch reward progress move in real time.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Current balance</p>
              <p className="text-2xl font-extrabold">{client.balance}</p>
            </div>
            <Button variant="outline" onClick={onClose}>Done</Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {behaviors.length === 0 ? (
            <div className="h-full grid place-items-center text-center text-muted-foreground">
              <div>
                <p className="text-lg font-medium">No behaviors yet</p>
                <p className="text-sm mt-1">Add behaviors in the Rewards tab to start a session.</p>
              </div>
            </div>
          ) : (
            <div className="grid lg:grid-cols-[180px_1fr] gap-4 h-full">
              <div className="lg:sticky lg:top-0 self-start">
                {rewards.length > 0 ? (
                  <SessionProgressRail rewards={rewards} current={client.balance} />
                ) : (
                  <Card><CardContent className="py-4 text-sm text-muted-foreground">Add rewards to show progress.</CardContent></Card>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 content-start">
                {behaviors.map((b) => (
                  <QuickAwardSessionCard key={b.id} behavior={b} clientId={client.id} onDone={onAwarded} onCelebrate={onCelebrate} onOptimisticAward={onOptimisticAward} />
                ))}
              </div>
            </div>
          )}
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
  const [pulse, setPulse] = useState(false);

  async function award() {
    setBusy(true);
    onOptimisticAward(behavior.point_value);
    try {
      await awardPoints(clientId, behavior.id, behavior.point_value);
      await onDone();
      onCelebrate(undefined, undefined, behavior.point_value < 0 ? "penalty" : undefined);
      setPulse(true);
      setTimeout(() => setPulse(false), 220);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={award}
      disabled={busy}
      className={`rounded-3xl border bg-card shadow-sm p-6 min-h-[180px] text-left transition-all active:scale-[0.98] hover:shadow-md ${pulse ? behavior.point_value < 0 ? "ring-4 ring-red-200 scale-[1.01]" : "ring-4 ring-primary/20 scale-[1.01]" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 grid place-items-center text-3xl">
          <ItemIcon icon={behavior.icon} size="text-3xl" />
        </div>
        <div className={`rounded-full px-3 py-1 text-sm font-bold ${behavior.point_value < 0 ? "bg-red-100 text-red-700" : "bg-primary text-primary-foreground"}`}>
          {behavior.point_value > 0 ? "+" : ""}{behavior.point_value}
        </div>
      </div>
      <div className="mt-5">
        <p className="text-2xl font-bold leading-tight">{behavior.name}</p>
        <p className="text-sm text-muted-foreground mt-2">Tap anytime during the session to add points fast.</p>
      </div>
    </button>
  );
}
