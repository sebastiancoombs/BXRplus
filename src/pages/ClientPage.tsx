import { useState } from "react";
import { useClientContext } from "@/contexts/ClientContext";
import { useClientDetail, awardPoints, redeemReward } from "@/hooks/useClients";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PrintableClientCard, PrintableRewardTicket } from "@/components/PrintableCard";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/types/database";

type Tab = "dashboard" | "rewards" | "team";

export default function ClientPage() {
  const { activeClient, clients, loading } = useClientContext();
  const [tab, setTab] = useState<Tab>("dashboard");

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
    { key: "team", label: "Team", icon: "👥" },
  ];

  return (
    <div className="min-h-screen">
      {/* Client name + tabs */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="py-4">
            <h1 className="text-xl font-bold">{activeClient.full_name}</h1>
            <p className="text-sm text-muted-foreground">
              {activeClient.balance} points
              {activeClient.isOwner && " · Owner"}
              {activeClient.myRole && !activeClient.isOwner && ` · ${activeClient.myRole.toUpperCase()}`}
            </p>
          </div>
          <div className="flex gap-1 -mb-px">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                  tab === t.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
                )}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-5xl mx-auto px-6 py-6">
        {tab === "dashboard" && <DashboardTab clientId={activeClient.id} />}
        {tab === "rewards" && <RewardsTab clientId={activeClient.id} client={activeClient} />}
        {tab === "team" && <TeamTab clientId={activeClient.id} isOwner={activeClient.isOwner} />}
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

  async function handleRefresh() { await refresh(); await refreshClients(); }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (!client) return null;

  return (
    <div className="space-y-6">
      {/* Balance + Quick Award */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1 bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
          <CardContent className="py-6 text-center">
            <p className="text-sm opacity-80 uppercase tracking-wider">Balance</p>
            <p className="text-5xl font-bold mt-1">{client.balance}</p>
            <p className="text-sm opacity-80 mt-1">points</p>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardContent className="py-4">
            <p className="text-sm font-medium text-muted-foreground mb-3">Quick Award</p>
            {behaviors.length === 0 ? (
              <p className="text-sm text-muted-foreground">Add behaviors in the Rewards tab to start awarding points.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {behaviors.map((b) => (
                  <QuickAwardBtn key={b.id} behavior={b} clientId={client.id} onDone={handleRefresh} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Thermometers */}
      {rewards.length > 0 && (
        <Card>
          <CardContent className="py-5">
            <p className="text-sm font-medium text-muted-foreground mb-4">Progress Toward Rewards</p>
            <div className="space-y-4">
              {rewards.map((r) => {
                const pct = Math.min(100, (client.balance / r.point_cost) * 100);
                return (
                  <ThermometerRow key={r.id} icon={r.icon} name={r.name} current={client.balance}
                    goal={r.point_cost} pct={pct} canRedeem={client.balance >= r.point_cost}
                    onRedeem={async () => { await redeemReward(client.id, r.id); handleRefresh(); }}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions */}
      <Card>
        <CardContent className="py-5">
          <p className="text-sm font-medium text-muted-foreground mb-4">Transaction History</p>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No transactions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Date</th>
                    <th className="pb-2 pr-4 font-medium">Description</th>
                    <th className="pb-2 pr-4 font-medium text-right">Credit</th>
                    <th className="pb-2 pr-4 font-medium text-right">Debit</th>
                    <th className="pb-2 font-medium text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn) => (
                    <tr key={txn.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 pr-4 whitespace-nowrap text-muted-foreground">
                        {new Date(txn.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        <span className="block text-xs">
                          {new Date(txn.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="font-medium">
                          {txn.type === "credit" ? txn.behavior?.name ?? "Points awarded" : txn.reward?.name ?? "Reward redeemed"}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {txn.type === "credit" ? <span className="text-green-600 font-medium">+{txn.amount}</span> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {txn.type === "debit" ? <span className="text-red-500 font-medium">−{txn.amount}</span> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-3 text-right font-mono font-medium">{txn.balance_after}</td>
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
// REWARDS TAB
// ═══════════════════════════════════════

function RewardsTab({ clientId, client }: { clientId: string; client: any }) {
  const { behaviors, rewards, loading, refresh } = useClientDetail(clientId);

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-8">
      {/* Behaviors */}
      <div>
        <h3 className="font-semibold mb-3">⭐ Behaviors <span className="text-muted-foreground font-normal text-sm">— what earns points</span></h3>
        <AddItemForm type="behavior" clientId={clientId} onAdded={refresh} />
        {behaviors.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-4">
            {behaviors.map((b) => (
              <Card key={b.id}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{b.icon}</span>
                    <div>
                      <p className="font-medium text-sm">{b.name}</p>
                      <Badge variant="secondary" className="text-xs">+{b.point_value}</Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive"
                    onClick={async () => { await supabase.from("behaviors").update({ is_active: false }).eq("id", b.id); refresh(); }}>
                    ✕
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Rewards */}
      <div>
        <h3 className="font-semibold mb-3">🎁 Rewards <span className="text-muted-foreground font-normal text-sm">— what points buy</span></h3>
        <AddItemForm type="reward" clientId={clientId} onAdded={refresh} />
        {rewards.length > 0 && (
          <>
            {/* Reward cards with remove */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-4">
              {rewards.map((r) => (
                <Card key={r.id}>
                  <CardContent className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{r.icon}</span>
                      <div>
                        <p className="font-medium text-sm">{r.name}</p>
                        <Badge className="text-xs">{r.point_cost} pts</Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive"
                      onClick={async () => { await supabase.from("rewards").update({ is_active: false }).eq("id", r.id); refresh(); }}>
                      ✕
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Printable reward tickets */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                🖨️ Printable Reward Tickets <span className="font-normal">— print these out so clients can see and choose what to work toward</span>
              </h4>
              <div className="flex flex-wrap gap-6">
                {rewards.map((r) => (
                  <PrintableRewardTicket key={r.id} reward={r} client={client} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AddItemForm({ type, clientId, onAdded }: { type: "behavior" | "reward"; clientId: string; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [value, setValue] = useState(type === "reward" ? 10 : 1);
  const [icon, setIcon] = useState(type === "reward" ? "🎁" : "⭐");
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
        is_active: true, description: null, created_by: null,
      });
    }
    setName(""); setValue(type === "reward" ? 10 : 1); setBusy(false);
    onAdded();
  }

  return (
    <form onSubmit={submit} className="flex gap-2 items-center">
      <Input value={icon} onChange={(e) => setIcon(e.target.value)} className="w-12 text-center text-lg h-9" />
      <Input value={name} onChange={(e) => setName(e.target.value)}
        placeholder={type === "behavior" ? "e.g. Followed instructions" : "e.g. iPad time"}
        className="flex-1 h-9" required />
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">{type === "behavior" ? "+" : ""}</span>
        <Input type="number" min={1} value={value} onChange={(e) => setValue(+e.target.value)} className="w-16 h-9" />
        <span className="text-xs text-muted-foreground">pts</span>
      </div>
      <Button type="submit" size="sm" className="h-9" disabled={busy}>Add</Button>
    </form>
  );
}

// ═══════════════════════════════════════
// TEAM TAB
// ═══════════════════════════════════════

function TeamTab({ clientId, isOwner }: { clientId: string; isOwner: boolean }) {
  const { user } = useAuth();
  const [staff, setStaff] = useState<any[]>([]);
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState("");
  const [role, setRole] = useState<AppRole>("rbt");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

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

  useState(() => { fetchTeam(); });

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setAdding(true);
    const { data: found } = await supabase.from("profiles").select("id, full_name")
      .ilike("full_name", `%${searchName}%`).limit(1).single();
    if (!found) { setError("No user found. They need to create an account first."); setAdding(false); return; }
    if (staff.find((s: any) => s.user_id === found.id)) { setError("Already on the team."); setAdding(false); return; }
    await supabase.from("client_staff").insert({ client_id: clientId, user_id: found.id, relationship: role });
    setSearchName(""); setAdding(false); fetchTeam();
  }

  async function removeMember(id: string) {
    await supabase.from("client_staff").delete().eq("id", id);
    fetchTeam();
  }

  async function transferOwnership(newOwnerId: string) {
    await supabase.rpc("transfer_ownership", { p_client_id: clientId, p_new_owner_id: newOwnerId });
    // Refresh
    window.location.reload();
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
            <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                  {(s.profile?.full_name ?? "?")[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">{s.profile?.full_name ?? "Unknown"}</p>
                  <Badge className={`text-xs ${roleColors[s.relationship] ?? ""}`}>
                    {s.relationship.toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-1">
                {isOwner && s.relationship === "bcba" && (
                  <Button variant="ghost" size="sm" className="text-xs"
                    onClick={() => transferOwnership(s.user_id)}>
                    Make Owner
                  </Button>
                )}
                {isOwner && (
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive"
                    onClick={() => removeMember(s.id)}>
                    ✕
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Add member — owner only */}
      {isOwner && (
        <Card>
          <CardContent className="py-4">
            <p className="font-medium mb-3">Add Team Member</p>
            <form onSubmit={addMember} className="flex gap-2 items-center">
              <Input value={searchName} onChange={(e) => setSearchName(e.target.value)}
                placeholder="Search by name..." className="flex-1 h-9" required />
              <select value={role} onChange={(e) => setRole(e.target.value as AppRole)}
                className="rounded-md border border-input bg-background px-2 py-1 text-sm h-9">
                <option value="rbt">RBT</option>
                <option value="parent">Parent</option>
                <option value="bcba">BCBA</option>
              </select>
              <Button type="submit" size="sm" className="h-9" disabled={adding}>
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
// SHARED COMPONENTS
// ═══════════════════════════════════════

function QuickAwardBtn({ behavior, clientId, onDone }: { behavior: any; clientId: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function go() {
    if (!confirming) { setConfirming(true); return; }
    setBusy(true);
    await awardPoints(clientId, behavior.id, behavior.point_value);
    setFlash(true); setConfirming(false);
    setTimeout(() => setFlash(false), 600);
    onDone(); setBusy(false);
  }

  return (
    <Button
      variant={confirming ? "default" : "outline"}
      size="sm"
      onClick={go}
      onBlur={() => setTimeout(() => setConfirming(false), 200)}
      disabled={busy}
      className={`transition-all ${flash ? "ring-2 ring-green-400 bg-green-50" : ""}`}
    >
      {confirming ? (
        <>{behavior.icon} Award +{behavior.point_value}?</>
      ) : (
        <>{behavior.icon} {behavior.name} <Badge variant="secondary" className="ml-1.5 text-xs">+{behavior.point_value}</Badge></>
      )}
    </Button>
  );
}

function ThermometerRow({ icon, name, current, goal, pct, canRedeem, onRedeem }: {
  icon: string; name: string; current: number; goal: number; pct: number; canRedeem: boolean; onRedeem: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const barColor = pct >= 100 ? "bg-green-500" : pct >= 60 ? "bg-yellow-500" : pct >= 30 ? "bg-orange-400" : "bg-red-400";

  async function handleRedeem() {
    if (!confirming) { setConfirming(true); return; }
    setBusy(true);
    await onRedeem();
    setConfirming(false);
    setBusy(false);
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-2xl w-8 text-center flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium truncate">{name}</span>
          <span className="text-xs text-muted-foreground">{current} / {goal}</span>
        </div>
        <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      {canRedeem ? (
        <Button
          size="sm"
          variant={confirming ? "destructive" : "default"}
          onClick={handleRedeem}
          onBlur={() => setTimeout(() => setConfirming(false), 200)}
          disabled={busy}
          className="flex-shrink-0"
        >
          {busy ? "..." : confirming ? `Spend ${goal} pts?` : "Redeem"}
        </Button>
      ) : (
        <span className="text-xs text-muted-foreground w-16 text-right flex-shrink-0">{goal - current} to go</span>
      )}
    </div>
  );
}
