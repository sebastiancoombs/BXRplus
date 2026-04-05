import { useState } from "react";
import { useClients, useClientDetail } from "@/hooks/useClients";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function RewardsPage() {
  const { clients, loading } = useClients();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeId = selectedId ?? clients[0]?.id ?? null;

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (clients.length === 0)
    return <p className="text-muted-foreground">No clients assigned.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Rewards & Behaviors</h1>
        {clients.length > 1 && (
          <select
            value={activeId ?? ""}
            onChange={(e) => setSelectedId(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.full_name}</option>
            ))}
          </select>
        )}
      </div>
      {activeId && <RewardsContent clientId={activeId} />}
    </div>
  );
}

function RewardsContent({ clientId }: { clientId: string }) {
  const { behaviors, rewards, loading, refresh } = useClientDetail(clientId);

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <Tabs defaultValue="rewards">
      <TabsList>
        <TabsTrigger value="rewards">🎁 Rewards</TabsTrigger>
        <TabsTrigger value="behaviors">⭐ Behaviors</TabsTrigger>
      </TabsList>

      <TabsContent value="rewards" className="space-y-4 mt-4">
        <AddRewardForm clientId={clientId} onAdded={refresh} />
        {rewards.length === 0 ? (
          <p className="text-muted-foreground">No rewards yet. Add one above.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rewards.map((r) => (
              <Card key={r.id}>
                <CardContent className="py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{r.icon}</span>
                    <Badge>{r.point_cost} pts</Badge>
                  </div>
                  <p className="font-medium">{r.name}</p>
                  {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        await supabase.from("rewards").update({ is_active: false }).eq("id", r.id);
                        refresh();
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="behaviors" className="space-y-4 mt-4">
        <AddBehaviorForm clientId={clientId} onAdded={refresh} />
        {behaviors.length === 0 ? (
          <p className="text-muted-foreground">No behaviors yet. Add one above.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {behaviors.map((b) => (
              <Card key={b.id}>
                <CardContent className="py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{b.icon}</span>
                    <Badge variant="secondary">+{b.point_value} pts</Badge>
                  </div>
                  <p className="font-medium">{b.name}</p>
                  {b.description && <p className="text-sm text-muted-foreground">{b.description}</p>}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      await supabase.from("behaviors").update({ is_active: false }).eq("id", b.id);
                      refresh();
                    }}
                  >
                    Remove
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

function AddRewardForm({ clientId, onAdded }: { clientId: string; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [cost, setCost] = useState(10);
  const [icon, setIcon] = useState("🎁");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    await supabase.from("rewards").insert({
      client_id: clientId,
      name,
      point_cost: cost,
      icon,
      description: desc || null,
      is_active: true,
      created_by: null,
    });
    setName("");
    setCost(10);
    setDesc("");
    setBusy(false);
    onAdded();
  }

  return (
    <Card>
      <CardContent className="py-4">
        <form onSubmit={submit} className="flex flex-wrap gap-3 items-end">
          <div className="w-16 space-y-1">
            <Label className="text-xs">Icon</Label>
            <Input value={icon} onChange={(e) => setIcon(e.target.value)} className="text-center text-xl" />
          </div>
          <div className="flex-1 min-w-[180px] space-y-1">
            <Label className="text-xs">Reward Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. iPad Time" required />
          </div>
          <div className="w-24 space-y-1">
            <Label className="text-xs">Point Cost</Label>
            <Input type="number" min={1} value={cost} onChange={(e) => setCost(+e.target.value)} />
          </div>
          <div className="flex-1 min-w-[140px] space-y-1">
            <Label className="text-xs">Description (optional)</Label>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="15 minutes of iPad" />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? "Adding..." : "Add Reward"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function AddBehaviorForm({ clientId, onAdded }: { clientId: string; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [points, setPoints] = useState(1);
  const [icon, setIcon] = useState("⭐");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    await supabase.from("behaviors").insert({
      client_id: clientId,
      name,
      point_value: points,
      icon,
      description: desc || null,
      is_active: true,
      created_by: null,
    });
    setName("");
    setPoints(1);
    setDesc("");
    setBusy(false);
    onAdded();
  }

  return (
    <Card>
      <CardContent className="py-4">
        <form onSubmit={submit} className="flex flex-wrap gap-3 items-end">
          <div className="w-16 space-y-1">
            <Label className="text-xs">Icon</Label>
            <Input value={icon} onChange={(e) => setIcon(e.target.value)} className="text-center text-xl" />
          </div>
          <div className="flex-1 min-w-[180px] space-y-1">
            <Label className="text-xs">Behavior Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Followed Instructions" required />
          </div>
          <div className="w-24 space-y-1">
            <Label className="text-xs">Points</Label>
            <Input type="number" min={1} value={points} onChange={(e) => setPoints(+e.target.value)} />
          </div>
          <div className="flex-1 min-w-[140px] space-y-1">
            <Label className="text-xs">Description (optional)</Label>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Complied with verbal prompt" />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? "Adding..." : "Add Behavior"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
