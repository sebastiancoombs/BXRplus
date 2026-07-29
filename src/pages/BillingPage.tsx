import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { openCustomerPortal, startCheckout } from "@/lib/billing";
import { ArrowLeft, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";

export default function BillingPage() {
  const { user } = useAuth();
  const { subscription, loading, refresh, isPro, isComped } = useSubscription();
  const [params] = useSearchParams();
  const [busy, setBusy] = useState(false);

  // After Stripe Checkout success, the webhook should have written by now —
  // but we re-poll for a few seconds in case it's slightly behind.
  useEffect(() => {
    if (params.get("status") !== "success") return;
    let cancelled = false;
    let tries = 0;
    const tick = async () => {
      if (cancelled) return;
      await refresh();
      tries += 1;
      if (tries < 5 && !isPro) setTimeout(tick, 1500);
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [params, refresh, isPro]);

  if (!user) {
    return (
      <div className="p-8">
        <Link to="/login"><Button>Sign in</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to dashboard
      </Link>

      <h1 className="text-3xl font-bold mb-2">Billing</h1>
      <p className="text-muted-foreground mb-8">
        Manage your BXR+ subscription. Your team — RBTs and parents — never pay.
      </p>

      {params.get("status") === "success" && (
        <Banner kind="success">
          Payment received. Welcome to BXR+ Pro.
        </Banner>
      )}
      {params.get("status") === "canceled" && (
        <Banner kind="warn">Checkout canceled — no charge was made.</Banner>
      )}

      {loading ? (
        <div className="rounded-xl border bg-card p-6">Loading…</div>
      ) : (
        <div className="rounded-xl border bg-card p-6 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">
                  {isPro ? "BXR+ Pro" : "Free Forever"}
                </h2>
                {isComped && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 text-purple-700 px-2.5 py-0.5 text-xs font-medium">
                    <Sparkles className="w-3 h-3" /> Comp
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {isComped
                  ? `Free Pro access${
                      subscription?.comped_until
                        ? ` until ${new Date(subscription.comped_until).toLocaleDateString()}`
                        : ""
                    }${
                      subscription?.comped_reason ? ` — ${subscription.comped_reason}` : ""
                    }.`
                  : isPro
                  ? subscription?.plan === "pro_yearly"
                    ? "Billed yearly. Renews automatically."
                    : "Billed monthly. Renews automatically."
                  : "1 client, full features, no time limit."}
              </p>
              {subscription?.current_period_end && isPro && !isComped && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Next renewal: {new Date(subscription.current_period_end).toLocaleDateString()}
                  {subscription.cancel_at_period_end ? " (cancels at period end)" : ""}
                </p>
              )}
            </div>

            <div className="text-right">
              {isPro && subscription?.stripe_customer_id ? (
                <Button
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await openCustomerPortal();
                    } catch (e) {
                      console.error(e);
                      alert("Could not open billing portal.");
                      setBusy(false);
                    }
                  }}
                  disabled={busy}
                >
                  Manage subscription
                </Button>
              ) : isComped ? (
                <span className="text-sm text-muted-foreground italic">
                  Thanks for being here early 💜
                </span>
              ) : (
                <Link to="/pricing"><Button>See plans</Button></Link>
              )}
            </div>
          </div>

          {!isPro && (
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-2">Upgrade to BXR+ Pro</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Unlimited clients. $7/mo or $59/yr — save ~30% paying yearly.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await startCheckout("monthly");
                    } catch (e) {
                      console.error(e);
                      alert("Could not start checkout.");
                      setBusy(false);
                    }
                  }}
                  disabled={busy}
                >
                  $7 / month
                </Button>
                <Button
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await startCheckout("yearly");
                    } catch (e) {
                      console.error(e);
                      alert("Could not start checkout.");
                      setBusy(false);
                    }
                  }}
                  disabled={busy}
                >
                  $59 / year
                </Button>
              </div>
            </div>
          )}

          {subscription?.status === "past_due" && (
            <Banner kind="warn">
              Last payment failed. Update your card to keep Pro access.
            </Banner>
          )}
        </div>
      )}
    </div>
  );
}

function Banner({
  kind,
  children,
}: {
  kind: "success" | "warn";
  children: React.ReactNode;
}) {
  const styles =
    kind === "success"
      ? "bg-green-50 text-green-800 border-green-200"
      : "bg-amber-50 text-amber-800 border-amber-200";
  const Icon = kind === "success" ? CheckCircle2 : AlertTriangle;
  return (
    <div className={`mb-6 rounded-lg border px-4 py-3 flex items-start gap-2 ${styles}`}>
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <span className="text-sm">{children}</span>
    </div>
  );
}
