import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useClientDetail, awardPoints, redeemReward } from "@/hooks/useClients";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QRCodeSVG } from "qrcode.react";

export default function ClientDashboard() {
  const { clientId } = useParams<{ clientId: string }>();
  const { client, behaviors, rewards, transactions, loading, refresh } = useClientDetail(clientId);

  if (loading) return <p className="text-muted-foreground p-8">Loading...</p>;
  if (!client) return <p className="p-8">Client not found.</p>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link to="/clients" className="text-sm text-muted-foreground hover:underline">
            ← Back to Clients
          </Link>
          <h1 className="text-2xl font-bold mt-1">{client.full_name}</h1>
        </div>
        <Card className="text-center p-4">
          <QRCodeSVG value={client.qr_code} size={100} />
          <p className="text-xs text-muted-foreground mt-2">Scan to award</p>
        </Card>
      </div>

      {/* Balance Card */}
      <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
        <CardContent className="py-8 text-center">
          <p className="text-sm opacity-80 uppercase tracking-wider">Current Balance</p>
          <p className="text-6xl font-bold mt-2">{client.balance}</p>
          <p className="text-sm opacity-80 mt-1">points</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="award">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="award">⭐ Award</TabsTrigger>
          <TabsTrigger value="redeem">🎁 Redeem</TabsTrigger>
          <TabsTrigger value="history">📜 History</TabsTrigger>
          <TabsTrigger value="manage">⚙️ Manage</TabsTrigger>
        </TabsList>

        {/* Award Tab */}
        <TabsContent value="award" className="space-y-4">
          <h3 className="font-semibold text-lg">Award Points</h3>
          {behaviors.length === 0 ? (
            <p className="text-muted-foreground">No behaviors set up yet. Go to Manage to add some.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {behaviors.map((b) => (
                <BehaviorButton key={b.id} behavior={b} clientId={client.id} onAwarded={refresh} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Redeem Tab */}
        <TabsContent value="redeem" className="space-y-4">
          <h3 className="font-semibold text-lg">Redeem Rewards</h3>
          {rewards.length === 0 ? (
            <p className="text-muted-foreground">No rewards set up yet. Go to Manage to add some.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {rewards.map((r) => (
                <RewardCard
                  key={r.id}
                  reward={r}
                  clientId={client.id}
                  balance={client.balance}
                  onRedeemed={refresh}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-3">
          <h3 className="font-semibold text-lg">Transaction History</h3>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground">No transactions yet.</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((txn) => (
                <Card key={txn.id}>
                  <CardContent className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {txn.type === "credit"
                          ? `⭐ ${txn.behavior?.name ?? "Points earned"}`
                          : `🎁 ${txn.reward?.name ?? "Reward redeemed"}`}
                      </p>
                      {txn.note && <p className="text-sm text-muted-foreground">{txn.note}</p>}
                      <p className="text-xs text-muted-foreground">
                        {new Date(txn.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-lg font-bold ${
                          txn.type === "credit" ? "text-green-600" : "text-red-500"
                        }`}
                      >
                        {txn.type === "credit" ? "+" : "−"}{txn.amount}
                      </span>
                      <p className="text-xs text-muted-foreground">bal: {txn.balance_after}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Manage Tab */}
        <TabsContent value="manage" className="space-y-6">
          <ManageBehaviors clientId={client.id} behaviors={behaviors} onUpdate={refresh} />
          <ManageRewards clientId={client.id} rewards={rewards} onUpdate={refresh} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Award behavior button ──
function BehaviorButton({
  behavior,
  clientId,
  onAwarded,
}: {
  behavior: any;
  clientId: string;
  onAwarded: () => void;
}) {
  const [awarding, setAwarding] = useState(false);
  const [flash, setFlash] = useState(false);

  async function handleAward() {
    setAwarding(true);
    try {
      await awardPoints(clientId, behavior.id, behavior.point_value);
      setFlash(true);
      setTimeout(() => setFlash(false), 600);
      onAwarded();
    } catch (err) {
      console.error(err);
    } finally {
      setAwarding(false);
    }
  }

  return (
    <Button
      variant="outline"
      className={`h-auto py-4 flex flex-col items-center gap-1 transition-all ${
        flash ? "ring-2 ring-green-400 bg-green-50" : ""
      }`}
      onClick={handleAward}
      disabled={awarding}
    >
      <span className="text-2xl">{behavior.icon}</span>
      <span className="font-medium">{behavior.name}</span>
      <Badge variant="secondary">+{behavior.point_value} pts</Badge>
    </Button>
  );
}

// ── Redeem reward card ──
function RewardCard({
  reward,
  clientId,
  balance,
  onRedeemed,
}: {
  reward: any;
  clientId: string;
  balance: number;
  onRedeemed: () => void;
}) {
  const [redeeming, setRedeeming] = useState(false);
  const canAfford = balance >= reward.point_cost;
  const progress = Math.min(100, (balance / reward.point_cost) * 100);

  async function handleRedeem() {
    if (!canAfford) return;
    setRedeeming(true);
    try {
      await redeemReward(clientId, reward.id);
      onRedeemed();
    } catch (err) {
      console.error(err);
    } finally {
      setRedeeming(false);
    }
  }

  return (
    <Card className={!canAfford ? "opacity-60" : ""}>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-2xl">{reward.icon}</span>
          <Badge>{reward.point_cost} pts</Badge>
        </div>
        <p className="font-medium">{reward.name}</p>
        {reward.description && (
          <p className="text-sm text-muted-foreground">{reward.description}</p>
        )}
        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {balance} / {reward.point_cost} points
        </p>
        <Button
          size="sm"
          className="w-full"
          onClick={handleRedeem}
          disabled={!canAfford || redeeming}
        >
          {redeeming ? "Redeeming..." : canAfford ? "Redeem" : `Need ${reward.point_cost - balance} more`}
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Manage Behaviors ──
function ManageBehaviors({
  clientId,
  behaviors,
  onUpdate,
}: {
  clientId: string;
  behaviors: any[];
  onUpdate: () => void;
}) {
  const [name, setName] = useState("");
  const [points, setPoints] = useState(1);
  const [icon, setIcon] = useState("⭐");
  const [adding, setAdding] = useState(false);

  async function addBehavior(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    await supabase.from("behaviors").insert({
      client_id: clientId,
      name,
      point_value: points,
      icon,
      is_active: true,
      description: null,
      created_by: null,
    });
    setName("");
    setPoints(1);
    setAdding(false);
    onUpdate();
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Behaviors (earn points)</h3>
      <form onSubmit={addBehavior} className="flex gap-2 items-end">
        <div className="w-16 space-y-1">
          <Label className="text-xs">Icon</Label>
          <Input value={icon} onChange={(e) => setIcon(e.target.value)} className="text-center text-xl" />
        </div>
        <div className="flex-1 space-y-1">
          <Label className="text-xs">Behavior Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Followed Instructions" />
        </div>
        <div className="w-20 space-y-1">
          <Label className="text-xs">Points</Label>
          <Input type="number" min={1} value={points} onChange={(e) => setPoints(+e.target.value)} />
        </div>
        <Button type="submit" disabled={adding}>Add</Button>
      </form>
      <div className="flex flex-wrap gap-2">
        {behaviors.map((b) => (
          <Badge key={b.id} variant="outline" className="text-sm py-1 px-3">
            {b.icon} {b.name} (+{b.point_value})
          </Badge>
        ))}
      </div>
    </div>
  );
}

// ── Manage Rewards ──
function ManageRewards({
  clientId,
  rewards,
  onUpdate,
}: {
  clientId: string;
  rewards: any[];
  onUpdate: () => void;
}) {
  const [name, setName] = useState("");
  const [cost, setCost] = useState(10);
  const [icon, setIcon] = useState("🎁");
  const [adding, setAdding] = useState(false);

  async function addReward(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    await supabase.from("rewards").insert({
      client_id: clientId,
      name,
      point_cost: cost,
      icon,
      is_active: true,
      description: null,
      created_by: null,
    });
    setName("");
    setCost(10);
    setAdding(false);
    onUpdate();
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Rewards (spend points)</h3>
      <form onSubmit={addReward} className="flex gap-2 items-end">
        <div className="w-16 space-y-1">
          <Label className="text-xs">Icon</Label>
          <Input value={icon} onChange={(e) => setIcon(e.target.value)} className="text-center text-xl" />
        </div>
        <div className="flex-1 space-y-1">
          <Label className="text-xs">Reward Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. iPad Time (15 min)" />
        </div>
        <div className="w-20 space-y-1">
          <Label className="text-xs">Cost</Label>
          <Input type="number" min={1} value={cost} onChange={(e) => setCost(+e.target.value)} />
        </div>
        <Button type="submit" disabled={adding}>Add</Button>
      </form>
      <div className="flex flex-wrap gap-2">
        {rewards.map((r) => (
          <Badge key={r.id} variant="outline" className="text-sm py-1 px-3">
            {r.icon} {r.name} ({r.point_cost} pts)
          </Badge>
        ))}
      </div>
    </div>
  );
}
