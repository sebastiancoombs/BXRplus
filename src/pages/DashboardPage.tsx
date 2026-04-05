import { useState } from "react";
import { Link } from "react-router-dom";
import { useClientContext } from "@/contexts/ClientContext";
import { useClientDetail, awardPoints, redeemReward } from "@/hooks/useClients";
import ClientHeader from "@/components/ClientHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const { activeClient, clients, loading } = useClientContext();

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  // Empty state — no clients at all
  if (clients.length === 0)
    return (
      <div className="text-center py-20 max-w-md mx-auto">
        <p className="text-5xl mb-6">🏆</p>
        <h2 className="text-2xl font-bold mb-2">Welcome to BXR+</h2>
        <p className="text-muted-foreground mb-8">
          Start by adding your first client. You can set up their behaviors and rewards right after.
        </p>
        <Link to="/team">
          <Button size="lg">+ Add Your First Client</Button>
        </Link>
      </div>
    );

  if (!activeClient) return null;

  return (
    <div>
      <ClientHeader />
      <ClientDashboardContent clientId={activeClient.id} />
    </div>
  );
}

function ClientDashboardContent({ clientId }: { clientId: string }) {
  const { client, behaviors, rewards, transactions, loading, refresh } = useClientDetail(clientId);
  const { refresh: refreshClients } = useClientContext();

  async function handleRefresh() {
    await refresh();
    await refreshClients();
  }

  if (loading) return <p className="text-muted-foreground">Loading client data...</p>;
  if (!client) return <p>Client not found.</p>;

  const hasBehaviors = behaviors.length > 0;
  const hasRewards = rewards.length > 0;
  const isNewClient = !hasBehaviors && !hasRewards && transactions.length === 0;

  return (
    <div className="space-y-6">
      {/* Onboarding nudge for new clients */}
      {isNewClient && (
        <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
          <CardContent className="py-5">
            <h3 className="font-semibold mb-2">Get started with {client.full_name}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Set up some behaviors to award points for, and rewards they can earn.
            </p>
            <div className="flex gap-3">
              <Link to="/rewards">
                <Button size="sm" variant="outline">⭐ Add Behaviors</Button>
              </Link>
              <Link to="/rewards">
                <Button size="sm" variant="outline">🎁 Add Rewards</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

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
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Quick Award</p>
              {hasBehaviors && (
                <Link to="/rewards" className="text-xs text-primary hover:underline">
                  Edit behaviors →
                </Link>
              )}
            </div>
            {!hasBehaviors ? (
              <Link to="/rewards" className="block">
                <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer">
                  <p className="text-sm text-muted-foreground">
                    <span className="text-lg block mb-1">⭐</span>
                    Add behaviors to start awarding points
                  </p>
                </div>
              </Link>
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

      {/* Reward Thermometers */}
      <Card>
        <CardContent className="py-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-muted-foreground">Progress Toward Rewards</p>
            <Link to="/rewards" className="text-xs text-primary hover:underline">
              {hasRewards ? "Edit rewards →" : "Add rewards →"}
            </Link>
          </div>
          {!hasRewards ? (
            <Link to="/rewards" className="block">
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer">
                <p className="text-sm text-muted-foreground">
                  <span className="text-lg block mb-1">🎁</span>
                  Add rewards so {client.full_name} has something to work toward
                </p>
              </div>
            </Link>
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
                      handleRefresh();
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
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm">No transactions yet.</p>
              {hasBehaviors && (
                <p className="text-xs mt-1">Award some points above to see them here.</p>
              )}
            </div>
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
