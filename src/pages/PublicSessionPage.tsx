import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { awardPoints, redeemReward } from "@/hooks/useClients";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAnimationById } from "@/lib/animationCatalog";
import { motion } from "framer-motion";
import Lottie from "lottie-react";

export default function PublicSessionPage() {
  const [params] = useSearchParams();
  const qr = params.get("qr");
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [confirmingReward, setConfirmingReward] = useState<any | null>(null);
  const [feedback, setFeedback] = useState<null | { type: "gain" | "loss"; tick: number; theme?: string; intensity?: string; mode?: string; animationId?: string }>(null);
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
    const behaviorTheme = behavior.feedback_theme ?? client.session_feedback_theme ?? "stars";
    const behaviorIntensity = behavior.feedback_intensity ?? client.session_feedback_intensity ?? "standard";
    const behaviorMode = behavior.feedback_mode ?? client.session_feedback_mode ?? "playful";
    const animationId = isLoss ? behavior.feedback_loss_animation_id : behavior.feedback_gain_animation_id;
    setFeedback({ type: isLoss ? "loss" : "gain", tick: Date.now(), theme: behaviorTheme, intensity: behaviorIntensity, mode: behaviorMode, animationId } as any);
    setPointsFlash(isLoss ? "loss" : "gain");
    setTimeout(() => setPointsFlash(null), 500);
    await awardPoints(client.id, behavior.id, behavior.point_value);
    await load();
  }

  async function confirmReward() {
    if (!confirmingReward || !client) return;
    setFeedback({ type: "loss", tick: Date.now() });
    setPointsFlash("loss");
    setTimeout(() => setPointsFlash(null), 500);
    await redeemReward(client.id, confirmingReward.id);
    setConfirmingReward(null);
    await load();
  }

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading session…</div>;
  if (!client) return <div className="min-h-screen grid place-items-center text-muted-foreground">Session not found.</div>;

  const feedbackTheme = client.session_feedback_theme ?? "stars";
  const feedbackIntensity = client.session_feedback_intensity ?? "standard";
  const feedbackMode = client.session_feedback_mode ?? "playful";

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6 overflow-x-hidden relative">
      {feedback && <SessionFeedbackBurst type={feedback.type} theme={feedback.theme ?? feedbackTheme} intensity={feedback.intensity ?? feedbackIntensity} mode={feedback.mode ?? feedbackMode} animationId={feedback.animationId} key={feedback.tick} />}
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
                <Badge variant="secondary">Theme: {feedbackTheme}</Badge>
                <Badge variant="secondary">Intensity: {feedbackIntensity}</Badge>
                <Badge variant="secondary">Mode: {feedbackMode}</Badge>
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


function SessionFeedbackBurst({ type, theme, intensity, mode, animationId }: {
  type: "gain" | "loss";
  theme: string;
  intensity: string;
  mode: string;
  animationId?: string;
}) {
  const preset = animationId ? getAnimationById(animationId) : null;
  const count = (preset?.intensity ?? intensity) === "calm" ? 10 : (preset?.intensity ?? intensity) === "lively" ? 26 : 18;
  const glyphSets: Record<string, { gain: string[]; loss: string[] }> = {
    stars: { gain: ["⭐", "🌟", "✨", "💫"], loss: ["☆", "⬇️", "⚠️", "〰️"] },
    bubbles: { gain: ["🫧", "✨", "🔵", "💙"], loss: ["🫧", "⬇️", "⚪", "〰️"] },
    flowers: { gain: ["🌸", "🌼", "✨", "💖"], loss: ["🍂", "⬇️", "〰️", "⚠️"] },
    smileys: { gain: ["😊", "😄", "✨", "🥳"], loss: ["😕", "😐", "⬇️", "〰️"] },
    fireworks: { gain: ["🎆", "🎇", "✨", "🎉"], loss: ["💨", "⬇️", "〰️", "⚠️"] },
    hearts: { gain: ["💖", "💗", "✨", "💕"], loss: ["🩶", "⬇️", "〰️", "⚠️"] },
    candy: { gain: ["🍬", "🍭", "✨", "🎉"], loss: ["🫥", "⬇️", "〰️", "⚠️"] },
    glow: { gain: ["✨", "💫", "⭐", "🌟"], loss: ["〰️", "⬇️", "⚠️", "·"] },
  };
  const set = glyphSets[preset?.theme ?? theme] ?? glyphSets.stars;
  const glyphs = preset?.glyphs ?? (type === "gain" ? set.gain : set.loss);
  const animClass = type === "gain" ? ((preset?.motion === "float" || mode === "calm") ? "animate-session-gain-calm" : "animate-session-gain") : "animate-session-loss";

  if (preset?.lottieData) {
    return (
      <div className="pointer-events-none fixed inset-0 z-40 grid place-items-center">
        <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: [0.9, 1.08, 1], opacity: [0, 1, 0] }} transition={{ duration: 1.2, ease: "easeOut" }} className="w-48 h-48 sm:w-56 sm:h-56">
          <Lottie animationData={preset.lottieData} loop={false} autoplay style={{ width: "100%", height: "100%" }} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className={`absolute text-2xl ${animClass}`} style={{ left: `${(i * 37) % 100}%`, top: `${(i * 19) % 80}%`, animationDelay: `${i * 25}ms` }}>
          {glyphs[i % glyphs.length]}
        </span>
      ))}
    </div>
  );
}
