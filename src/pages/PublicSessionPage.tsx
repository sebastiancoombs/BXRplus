import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { awardPoints, redeemReward } from "@/hooks/useClients";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function PublicSessionPage() {
  const [params] = useSearchParams();
  const qr = params.get("qr");
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [confirmingReward, setConfirmingReward] = useState<any | null>(null);

  async function load() {
    if (!qr) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("get_client_session_by_qr", { p_qr_code: qr });
    if (!error) setSession(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [qr]);

  const client = session?.client;
  const behaviors = session?.behaviors ?? [];
  const rewards = useMemo(() => [...(session?.rewards ?? [])].sort((a, b) => a.point_cost - b.point_cost), [session]);
  const balance = client?.balance ?? 0;

  async function applyBehavior(behavior: any) {
    if (!client) return;
    await awardPoints(client.id, behavior.id, behavior.point_value);
    await load();
  }

  async function confirmReward() {
    if (!confirmingReward || !client) return;
    await redeemReward(client.id, confirmingReward.id);
    setConfirmingReward(null);
    await load();
  }

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading session…</div>;
  if (!client) return <div className="min-h-screen grid place-items-center text-muted-foreground">Session not found.</div>;

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6 overflow-x-hidden">
      <div className="max-w-6xl mx-auto space-y-5 md:space-y-6">
        <div className="rounded-3xl border bg-gradient-to-br from-background via-background to-primary/5 p-4 sm:p-5 md:p-7 shadow-sm overflow-hidden">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Live Session</p>
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-end justify-between gap-4 mt-2">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight break-words">{client.full_name}</h1>
              <p className="text-sm text-muted-foreground mt-2">Tap a behavior to add or remove points. Tap a reward to redeem when it is available.</p>
            </div>
            <div className="rounded-3xl bg-card border px-5 py-4 text-center shadow-sm min-w-[140px] w-full sm:w-auto">
              <p className="text-xs text-muted-foreground">Current points</p>
              <p className="text-4xl sm:text-5xl font-extrabold mt-1">{balance}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:gap-6 xl:grid-cols-[1.15fr_0.85fr] items-start">
          <section className="rounded-3xl border bg-card p-5 md:p-6 shadow-sm space-y-4">
            <div>
              <p className="text-sm font-semibold">Behaviors</p>
              <p className="text-xs text-muted-foreground mt-1">Tap once to add or remove points quickly during a session.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
              {behaviors.map((b: any) => (
                <button key={b.id} type="button" onClick={() => applyBehavior(b)} className="rounded-3xl border bg-background p-4 md:p-5 text-left shadow-sm hover:shadow-md transition-all active:scale-[0.98] min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-3xl sm:text-4xl flex-shrink-0">{b.icon}</div>
                    <Badge variant={b.point_value < 0 ? "destructive" : "secondary"} className="flex-shrink-0">{b.point_value > 0 ? "+" : ""}{b.point_value}</Badge>
                  </div>
                  <p className="text-lg sm:text-xl font-bold mt-4 leading-tight break-words">{b.name}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border bg-card p-5 md:p-6 shadow-sm space-y-4">
            <div>
              <p className="text-sm font-semibold">Rewards</p>
              <p className="text-xs text-muted-foreground mt-1">Available rewards light up automatically when enough points are earned.</p>
            </div>
            <div className="space-y-3">
              {rewards.map((r: any) => {
                const available = balance >= r.point_cost;
                return (
                  <div key={r.id} className={`rounded-2xl border p-4 ${available ? "bg-background shadow-sm" : "bg-muted/30"}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="text-3xl flex-shrink-0">{r.icon}</div>
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{r.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">{available ? "Available now" : `${r.point_cost - balance} points to unlock`}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <Badge>{r.point_cost} pts</Badge>
                        {available && (
                          <div className="mt-2">
                            <Button size="sm" onClick={() => setConfirmingReward(r)}>Redeem</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>


        {confirmingReward && (
          <div className="fixed inset-0 bg-black/40 z-50 grid place-items-center p-4">
            <Card className="w-full max-w-md rounded-3xl"><CardContent className="py-6 text-center space-y-4">
              <div className="text-5xl">{confirmingReward.icon}</div>
              <div>
                <p className="text-xl font-bold">{confirmingReward.name}</p>
                <p className="text-sm text-muted-foreground mt-1">Redeem this reward for {confirmingReward.point_cost} points?</p>
              </div>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Button variant="outline" onClick={() => setConfirmingReward(null)}>Cancel</Button>
                <Button onClick={confirmReward}>Confirm</Button>
              </div>
            </CardContent></Card>
          </div>
        )}
      </div>
    </div>
  );
}
