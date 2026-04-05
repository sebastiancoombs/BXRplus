import { useState } from "react";
import { useClients, useClientDetail, awardPoints, redeemReward } from "@/hooks/useClients";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const { clients, loading } = useClients();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Auto-select first client
  const activeId = selectedId ?? clients[0]?.id ?? null;

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (clients.length === 0)
    return (
      <div className="text-center py-20">
        <p className="text-4xl mb-4">👋</p>
        <p className="text-lg font-medium">No clients yet</p>
        <p className="text-muted-foreground">Ask your BCBA to add you to a client.</p>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        {/* Client selector */}
        {clients.length > 1 && (
          <select
            value={activeId ?? ""}
            onChange={(e) => setSelectedId(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </select>
        )}
      </div>

      {activeId && <ClientDashboardContent clientId={activeId} />}
    </div>
  );
}

function ClientDashboardContent({ clientId }: { clientId: string }) {
  const { client, behaviors, rewards, transactions, loading, refresh } = useClientDetail(clientId);

  if (loading) return <p className="text-muted-foreground">Loading client data...</p>;
  if (!client) return <p>Client not found.</p>;

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

        {/* Quick Award Buttons */}
        <Card className="md:col-span-2">
          <CardContent className="py-4">
            <p className="text-sm font-medium text-muted-foreground mb-3">Quick Award</p>
            {behaviors.length === 0 ? (
              <p className="text-sm text-muted-foreground">No behaviors configured yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {behaviors.map((b) => (
                  <QuickAwardBtn key={b.id} behavior={b} clientId={client.id} onDone={refresh} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reward Thermometers */}
      <Card>
        <CardContent className="py-5">
          <p className="text-sm font-medium text-muted-foreground mb-4">Progress Toward Rewards</p>
          {rewards.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rewards configured yet.</p>
          ) : (
            <div className="space-y-4">
              {rewards.map((r) => {
                const pct = Math.min(100, (client.balance / r.point_cost) * 100);
                const canRedeem = client.balance >= r.point_cost;
                return (
                  <ThermometerRow
                    key={r.id}
                    icon={r.icon}
                    name={r.name}
                    current={client.balance}
                    goal={r.point_cost}
                    pct={pct}
                    canRedeem={canRedeem}
                    onRedeem={async () => {
                      await redeemReward(client.id, r.id);
                      refresh();
                    }}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction History Table */}
      <Card>
        <CardContent className="py-5">
          <p className="text-sm font-medium text-muted-foreground mb-4">Transaction History</p>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
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
                        {new Date(txn.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                        <span className="block text-xs">
                          {new Date(txn.created_at).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="font-medium">
                          {txn.type === "credit"
                            ? txn.behavior?.name ?? "Points awarded"
                            : txn.reward?.name ?? "Reward redeemed"}
                        </span>
                        {txn.note && (
                          <span className="block text-xs text-muted-foreground">{txn.note}</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {txn.type === "credit" ? (
                          <span className="text-green-600 font-medium">+{txn.amount}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {txn.type === "debit" ? (
                          <span className="text-red-500 font-medium">−{txn.amount}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
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

// ── Quick award button ──
function QuickAwardBtn({
  behavior,
  clientId,
  onDone,
}: {
  behavior: any;
  clientId: string;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);

  async function go() {
    setBusy(true);
    try {
      await awardPoints(clientId, behavior.id, behavior.point_value);
      setFlash(true);
      setTimeout(() => setFlash(false), 500);
      onDone();
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
      className={`transition-all ${flash ? "ring-2 ring-green-400 bg-green-50" : ""}`}
    >
      {behavior.icon} {behavior.name}
      <Badge variant="secondary" className="ml-1.5 text-xs">
        +{behavior.point_value}
      </Badge>
    </Button>
  );
}

// ── Thermometer progress row ──
function ThermometerRow({
  icon,
  name,
  current,
  goal,
  pct,
  canRedeem,
  onRedeem,
}: {
  icon: string;
  name: string;
  current: number;
  goal: number;
  pct: number;
  canRedeem: boolean;
  onRedeem: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  async function handleRedeem() {
    setBusy(true);
    await onRedeem();
    setBusy(false);
  }

  // Color gradient based on progress
  const barColor =
    pct >= 100 ? "bg-green-500" : pct >= 60 ? "bg-yellow-500" : pct >= 30 ? "bg-orange-400" : "bg-red-400";

  return (
    <div className="flex items-center gap-4">
      <span className="text-2xl w-8 text-center flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium truncate">{name}</span>
          <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
            {current} / {goal}
          </span>
        </div>
        {/* Thermometer */}
        <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      {canRedeem ? (
        <Button size="sm" onClick={handleRedeem} disabled={busy} className="flex-shrink-0">
          {busy ? "..." : "Redeem"}
        </Button>
      ) : (
        <span className="text-xs text-muted-foreground flex-shrink-0 w-16 text-right">
          {goal - current} to go
        </span>
      )}
    </div>
  );
}
