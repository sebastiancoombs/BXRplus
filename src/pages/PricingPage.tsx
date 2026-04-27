import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { startCheckout } from "@/lib/billing";
import { Check } from "lucide-react";

const PRO_FEATURES = [
  "Unlimited clients",
  "Unlimited team members (RBTs and parents)",
  "Real-time point ledger and reinforcement schedules",
  "QR scan-to-award and public session screen",
  "Custom behaviors, rewards, and animations",
  "Reward journey paths and progress visuals",
  "Full transaction history and audit trail",
  "All future BXR+ features included",
];

const FREE_FEATURES = [
  "1 client (full features, no time limit)",
  "Unlimited team members (RBTs and parents)",
  "Every Pro feature, scoped to your one program",
];

export default function PricingPage() {
  const { user } = useAuth();
  const { isPro } = useSubscription();
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function onUpgrade() {
    if (!user) {
      navigate("/login?mode=register&next=/pricing");
      return;
    }
    setBusy(true);
    try {
      await startCheckout(billing);
    } catch (err) {
      console.error(err);
      alert("Could not start checkout. Try again in a moment.");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold flex items-center gap-2">
            🏆 <span>BXR<span className="text-primary">+</span></span>
          </Link>
          <nav className="flex items-center gap-3">
            {user ? (
              <Link to="/dashboard"><Button variant="ghost" size="sm">Dashboard</Button></Link>
            ) : (
              <>
                <Link to="/login"><Button variant="ghost" size="sm">Sign In</Button></Link>
                <Link to="/login?mode=register"><Button size="sm">Start Free</Button></Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Simple pricing for ABA teams</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            One free program for life. Unlock the rest of your caseload for less than a coffee a week.
          </p>
        </div>

        <div className="mt-10 flex justify-center">
          <div className="inline-flex rounded-full border p-1 bg-card">
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                billing === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBilling("yearly")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                billing === "yearly" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              Yearly <span className="ml-1 text-xs opacity-80">save 30%</span>
            </button>
          </div>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
          {/* Free */}
          <PlanCard
            name="Free Forever"
            price="$0"
            cadence="always"
            description="Try BXR+ with one real client. Full features, no time limit."
            features={FREE_FEATURES}
            cta={
              user ? (
                <Button variant="outline" className="w-full" onClick={() => navigate("/dashboard")}>
                  Go to dashboard
                </Button>
              ) : (
                <Link to="/login?mode=register" className="block">
                  <Button variant="outline" className="w-full">Create free account</Button>
                </Link>
              )
            }
          />

          {/* Pro */}
          <PlanCard
            highlight
            name="BXR+ Pro"
            price={billing === "yearly" ? "$59" : "$7"}
            cadence={billing === "yearly" ? "per year" : "per month"}
            subnote={
              billing === "yearly"
                ? "$4.92/mo, billed annually"
                : "or $59/yr — save 30%"
            }
            description="Unlock your whole caseload. One BCBA, every program, every team member."
            features={PRO_FEATURES}
            cta={
              isPro ? (
                <Button variant="outline" className="w-full" onClick={() => navigate("/billing")}>
                  Manage subscription
                </Button>
              ) : (
                <Button className="w-full" onClick={onUpgrade} disabled={busy}>
                  {busy ? "Redirecting…" : `Upgrade to Pro`}
                </Button>
              )
            }
          />
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Have a promo code? Enter it on the Stripe checkout page. Need a comp account for a clinic, school, or training program?{" "}
          <a href="mailto:hello@bxrplus.app" className="underline hover:text-foreground">Email us</a>.
        </p>

        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Common questions</h2>
          <div className="space-y-6">
            <Faq q="Do RBTs and parents pay anything?">
              No. Only the BCBA who owns the program has a subscription. RBTs and parents
              you invite get full access to every client they're on the team for.
            </Faq>
            <Faq q="What happens if I cancel?">
              Your data stays put. You drop back to the Free plan: your first client keeps
              working as normal, additional clients are read-only until you upgrade again.
            </Faq>
            <Faq q="Can I switch between monthly and yearly later?">
              Yes — manage everything from the Stripe customer portal in your billing
              settings. Prorations are automatic.
            </Faq>
            <Faq q="Is BXR+ HIPAA compliant?">
              We follow Supabase security best practices (RLS, encrypted at rest and in
              transit) and don't store PHI beyond first names. If you need a BAA for clinic
              use, email us and we'll work with you.
            </Faq>
          </div>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-muted-foreground">
          🏆 BXR+ © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}

function PlanCard({
  name,
  price,
  cadence,
  subnote,
  description,
  features,
  cta,
  highlight,
}: {
  name: string;
  price: string;
  cadence: string;
  subnote?: string;
  description: string;
  features: string[];
  cta: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-card p-8 flex flex-col ${
        highlight ? "ring-2 ring-primary shadow-lg" : ""
      }`}
    >
      <div>
        <h3 className="text-xl font-bold">{name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        <div className="mt-6 flex items-baseline gap-2">
          <span className="text-4xl font-bold">{price}</span>
          <span className="text-sm text-muted-foreground">{cadence}</span>
        </div>
        {subnote && <p className="mt-1 text-xs text-muted-foreground">{subnote}</p>}
      </div>
      <ul className="mt-8 space-y-3 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-8">{cta}</div>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold mb-1">{q}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}
