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

type Tab = "dashboard" | "rewards" | "team" | "printables";

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
    { key: "printables", label: "Printables", icon: "🖨️" },
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
        {tab === "rewards" && <RewardsTab clientId={activeClient.id} />}
        {tab === "printables" && <PrintablesTab clientId={activeClient.id} client={activeClient} />}
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

function RewardsTab({ clientId }: { clientId: string }) {
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
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const table = type === "behavior" ? "behaviors" : "rewards";
  const valueField = type === "behavior" ? "point_value" : "point_cost";

  async function save() {
    setBusy(true);
    await supabase.from(table).update({ name, icon, [valueField]: value }).eq("id", item.id);
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
          <div className="flex gap-2">
            <Input value={icon} onChange={(e) => setIcon(e.target.value)} className="w-12 text-center text-lg h-8" />
            <Input value={name} onChange={(e) => setName(e.target.value)} className="flex-1 h-8 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{type === "behavior" ? "+" : ""}</span>
            <Input type="number" min={1} value={value} onChange={(e) => setValue(+e.target.value)} className="w-20 h-8 text-sm" />
            <span className="text-xs text-muted-foreground">pts</span>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs" onClick={save} disabled={busy}>
              {busy ? "..." : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group">
      <CardContent className="py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{item.icon}</span>
            <div>
              <p className="font-medium text-sm">{item.name}</p>
              <Badge variant={type === "behavior" ? "secondary" : "default"} className="text-xs">
                {type === "behavior" ? `+${item.point_value}` : `${item.point_cost} pts`}
              </Badge>
            </div>
          </div>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Print All Materials</h3>
              <p className="text-sm text-muted-foreground">
                Client card, reward tickets, and behavior reference — ready to print and laminate.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Copies:</label>
                <Input type="number" min={1} max={20} value={copies} onChange={(e) => setCopies(Math.max(1, +e.target.value))}
                  className="w-16 h-9 text-center" />
              </div>
              <Button onClick={handlePrintAll} size="lg">
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
          <div className="flex flex-wrap gap-6">
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
