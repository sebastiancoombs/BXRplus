import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { awardPoints, redeemReward } from "@/hooks/useClients";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { playEmojiBurst } from "@/lib/bursts";

export default function PublicSessionPage() {
  const [params] = useSearchParams();
  const qr = params.get("qr");
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [redeemingRewardId, setRedeemingRewardId] = useState<string | null>(null);
  const [pointsFlash, setPointsFlash] = useState<null | "gain" | "loss">(null);

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
  const positiveBehaviors = behaviors.filter((b: any) => b.point_value >= 0);
  const negativeBehaviors = behaviors.filter((b: any) => b.point_value < 0);
  const nextReward = rewards.find((r: any) => balance < r.point_cost) ?? null;
  const availableRewards = rewards.filter((r: any) => balance >= r.point_cost).length;

  async function applyBehavior(behavior: any) {
    if (!client) return;
    const isLoss = behavior.point_value < 0;
    const burstEmoji = isLoss ? behavior.feedback_loss_animation_id : behavior.feedback_gain_animation_id;
    setPointsFlash(isLoss ? "loss" : "gain");
    setTimeout(() => setPointsFlash(null), 500);
    await playEmojiBurst({ emoji: burstEmoji, mode: isLoss ? "loss" : "gain" });
    await awardPoints(client.id, behavior.id, behavior.point_value);
    await load();
  }

  async function redeemNow(reward: any) {
    if (!client) return;
    setRedeemingRewardId(reward.id);
    setPointsFlash("loss");
    setTimeout(() => setPointsFlash(null), 500);
    await playEmojiBurst({ emoji: reward.icon || "🎁", mode: "loss", count: 16 });
    await redeemReward(client.id, reward.id);
    setRedeemingRewardId(null);
    await load();
  }

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Opening session…</div>;
  if (!client) return <div className="min-h-screen grid place-items-center text-muted-foreground">Session not found.</div>;

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6 overflow-x-hidden relative">
      <div className="max-w-6xl mx-auto space-y-5 md:space-y-6">
        <div className="rounded-3xl border bg-gradient-to-br from-background via-background to-primary/5 p-4 sm:p-5 md:p-7 shadow-sm overflow-hidden">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Session Mode</p>
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-end justify-between gap-4 mt-2">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight break-words">{client.full_name}</h1>
              <p className="text-sm text-muted-foreground mt-2">Tap a behavior to add or remove points. Tap a reward to redeem when it is available.</p>
            </div>
            <div className="rounded-3xl bg-card border px-5 py-4 text-center shadow-sm min-w-[140px] w-full sm:w-auto">
              <p className="text-xs text-muted-foreground">Points available</p>
              <p className={`text-4xl sm:text-5xl font-extrabold mt-1 transition-all ${pointsFlash === "gain" ? "text-green-600 scale-110" : pointsFlash === "loss" ? "text-red-500 scale-95" : ""}`}>{balance}</p>
            </div>
          </div>
        </div>

        <div className="sticky top-0 z-20 rounded-2xl border bg-background/90 backdrop-blur px-4 py-3 shadow-sm">
          <div className="grid grid-cols-3 gap-3 items-center text-center">
            <div>
              <p className="text-[11px] text-muted-foreground">Current</p>
              <p className="text-lg font-extrabold">{balance}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Available</p>
              <p className="text-lg font-extrabold">{availableRewards}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Next</p>
              <p className="text-sm font-bold truncate">{nextReward ? `${Math.max(0, nextReward.point_cost - balance)} left` : "Ready"}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:gap-6 xl:grid-cols-[1.15fr_0.85fr] items-start">
          <section className="rounded-3xl border bg-card p-5 md:p-6 shadow-sm space-y-5">
            <div>
              <p className="text-sm font-semibold">Session Actions</p>
              <p className="text-xs text-muted-foreground mt-1">Tap once for fast reinforcement. Positive and negative actions are separated for clarity.</p>
            </div>

            {positiveBehaviors.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Add Points</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                  {positiveBehaviors.map((b: any) => (
                    <button key={b.id} type="button" onClick={() => applyBehavior(b)} className="rounded-3xl border bg-background p-4 md:p-5 text-left shadow-sm hover:shadow-md transition-all active:scale-[0.98] min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-3xl sm:text-4xl flex-shrink-0">{b.icon}</div>
                        <Badge variant="secondary" className="flex-shrink-0">+{b.point_value}</Badge>
                      </div>
                      <p className="text-lg sm:text-xl font-bold mt-4 leading-tight break-words">{b.name}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {negativeBehaviors.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Remove Points</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                  {negativeBehaviors.map((b: any) => (
                    <button key={b.id} type="button" onClick={() => applyBehavior(b)} className="rounded-3xl border bg-background p-4 md:p-5 text-left shadow-sm hover:shadow-md transition-all active:scale-[0.98] min-w-0 border-red-200/70">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-3xl sm:text-4xl flex-shrink-0">{b.icon}</div>
                        <Badge variant="destructive" className="flex-shrink-0">{b.point_value}</Badge>
                      </div>
                      <p className="text-lg sm:text-xl font-bold mt-4 leading-tight break-words">{b.name}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-3xl border bg-card p-5 md:p-6 shadow-sm space-y-4 xl:sticky xl:top-24">
            <div>
              <p className="text-sm font-semibold">Rewards</p>
              <p className="text-xs text-muted-foreground mt-1">See what is available now and what is next to unlock.</p>
            </div>
            <div className="rounded-2xl bg-muted/40 p-3 text-xs text-muted-foreground space-y-2">
              <p>
                {availableRewards > 0
                  ? `${availableRewards} reward${availableRewards === 1 ? " is" : "s are"} available now.`
                  : nextReward
                    ? `${Math.max(0, nextReward.point_cost - balance)} more point${Math.max(0, nextReward.point_cost - balance) === 1 ? "" : "s"} until ${nextReward.name}.`
                    : "All rewards are currently available."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Behavior animations enabled</Badge>
              </div>
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
                          <p className="text-xs text-muted-foreground mt-1">{available ? "Ready to redeem" : `${r.point_cost - balance} more points needed`}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <Badge>{r.point_cost} pts</Badge>
                        {available && (
                          <div className="mt-2">
                            <Button size="sm" onClick={() => redeemNow(r)} disabled={redeemingRewardId === r.id}>
                              {redeemingRewardId === r.id ? "Redeeming..." : "Redeem"}
                            </Button>
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

      </div>
    </div>
  );
}


