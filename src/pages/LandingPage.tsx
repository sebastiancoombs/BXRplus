import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useDocumentHead } from "@/hooks/useDocumentHead";

export default function LandingPage() {
  useDocumentHead({
    title: "BXR+ — Token Economy Software for ABA Teams (BCBA, RBT, Parent)",
    description:
      "BXR+ is a shared token-economy app for ABA care teams. Track behaviors, award points, and deliver reinforcement consistently across clinic, school, and home. Free for one client, forever.",
    canonical: "https://bxrplus.app/",
  });
  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold flex items-center gap-2">
            🏆 <span>BXR<span className="text-primary">+</span></span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
            <a href="#for-your-team" className="hover:text-foreground transition-colors">For Your Team</a>
            <a href="#why-bxr" className="hover:text-foreground transition-colors">Why BXR+</a>
            <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/login?mode=register">
              <Button size="sm">Start Free</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50" />
        <div className="relative max-w-6xl mx-auto px-6 py-24 md:py-36">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              Designed by BCBAs, for BCBAs
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
              The token economy your
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"> clients deserve</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl">
              Stop managing reinforcement with sticky notes and spreadsheets.
              BXR+ gives your whole care team — BCBAs, RBTs, and parents — one
              shared system to track points, deliver reinforcement on time, and
              actually see what's working.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link to="/login?mode=register">
                <Button size="lg" className="text-base px-8 py-6">
                  Create Your Program — Free
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button variant="outline" size="lg" className="text-base px-8 py-6">
                  See How It Works
                </Button>
              </a>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              No credit card required. Set up in under 5 minutes.
            </p>
          </div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="py-16 border-t bg-muted/20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Sound familiar?</h2>
          <div className="grid gap-4 md:grid-cols-3 mt-8 text-left">
            <PainPoint
              emoji="📋"
              text="You're tracking tokens on paper that gets lost between sessions"
            />
            <PainPoint
              emoji="🤷"
              text="Parents don't know what their child earned today — or what they're working toward"
            />
            <PainPoint
              emoji="⏰"
              text="Reinforcement gets delayed because no one remembered the balance"
            />
          </div>
          <p className="mt-10 text-lg text-muted-foreground">
            Inconsistent reinforcement leads to inconsistent outcomes.
            <span className="font-medium text-foreground"> BXR+ fixes the system, not the people.</span>
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 md:py-28 border-t">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Simple for everyone on the team</h2>
          <p className="text-center text-muted-foreground mb-16 max-w-xl mx-auto">
            If your team can tap a phone screen, they can run a token economy.
          </p>
          <div className="grid gap-10 md:grid-cols-3">
            <StepCard
              step="1"
              icon="👥"
              title="Add your clients and team"
              description="Create a client profile, then invite their RBTs and parents. Everyone gets instant access — no training manual needed."
            />
            <StepCard
              step="2"
              icon="📱"
              title="Award points in real time"
              description="See a target behavior? One tap. Scan the client's QR card or open their dashboard — points are recorded instantly with a timestamp."
            />
            <StepCard
              step="3"
              icon="🎁"
              title="Reinforce on schedule"
              description="Clients see exactly how close they are to each reward. When they hit the goal, anyone on the team can deliver reinforcement — no guesswork."
            />
          </div>
        </div>
      </section>

      {/* For Your Team */}
      <section id="for-your-team" className="py-20 md:py-28 bg-muted/30 border-t">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">One system, every perspective</h2>
          <div className="grid gap-8 md:grid-cols-3">
            <RoleCard
              icon="🎓"
              role="For BCBAs"
              points={[
                "Set up token economies in minutes, not meetings",
                "See every point awarded across all your clients",
                "Know exactly which reinforcers are driving behavior change",
                "Manage your entire RBT and parent team from one dashboard",
              ]}
            />
            <RoleCard
              icon="⭐"
              role="For RBTs"
              points={[
                "Award points with one tap — no paper, no counting",
                "See the reinforcement menu so you never have to ask",
                "Know the client's balance before every session starts",
                "Consistent delivery across every session, every technician",
              ]}
            />
            <RoleCard
              icon="💜"
              role="For Parents"
              points={[
                "See what your child earned today — in real time",
                "Add your own rewards at home to keep momentum going",
                "Understand the program without jargon or guesswork",
                "Same system at the clinic, at school, and at home",
              ]}
            />
          </div>
        </div>
      </section>

      {/* Why BXR+ */}
      <section id="why-bxr" className="py-20 md:py-28 border-t">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Why programs fail — and how BXR+ prevents it</h2>
          <p className="text-center text-muted-foreground mb-16 max-w-2xl mx-auto">
            Token economies break when reinforcement is late, inconsistent, or invisible to the people delivering it.
            BXR+ removes every one of those failure points.
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            <CompareCard
              bad="Points tracked on paper get lost or miscounted"
              good="Every point is timestamped and stored permanently — no lost data"
            />
            <CompareCard
              bad="RBTs don't know the current balance at session start"
              good="Balance is visible the moment they scan the QR card"
            />
            <CompareCard
              bad="Parents are out of the loop until the next meeting"
              good="Parents see credits and debits in real time from their phone"
            />
            <CompareCard
              bad="Reinforcement gets delayed because nobody tracked progress"
              good="Thermometer bars show exactly when a reward is ready to deliver"
            />
            <CompareCard
              bad="Each tech runs the economy slightly differently"
              good="One shared system — same behaviors, same values, same rewards"
            />
            <CompareCard
              bad="BCBAs spend time reconciling messy data"
              good="Clean transaction history, filterable by date, ready for reports"
            />
          </div>
        </div>
      </section>

      {/* Social Proof / Trust */}
      <section className="py-16 border-t bg-muted/20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-lg italic text-muted-foreground">
            "If you can't measure it, you can't reinforce it consistently.
            BXR+ makes the measurement automatic so your team can focus on the behavior."
          </p>
          <p className="mt-4 text-sm font-medium">— Built on OBM principles</p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28 border-t">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Start running better token economies today</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Create your account, add your first client, and invite your team.
            Your first token can be awarded in under five minutes.
          </p>
          <Link to="/login?mode=register">
            <Button size="lg" className="text-base px-10 py-6">
              Create Your Free Program
            </Button>
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">
            Free to use. No contracts. Cancel anytime.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-bold text-foreground">🏆 BXR+</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
            <a href="#for-your-team" className="hover:text-foreground transition-colors">For Your Team</a>
            <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <Link to="/login" className="hover:text-foreground transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Components ──

function PainPoint({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-card border">
      <span className="text-xl flex-shrink-0 mt-0.5">{emoji}</span>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function StepCard({ step, icon, title, description }: { step: string; icon: string; title: string; description: string }) {
  return (
    <div className="text-center space-y-4">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl">
        {icon}
      </div>
      <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold">
        {step}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function RoleCard({ icon, role, points }: { icon: string; role: string; points: string[] }) {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{icon}</span>
        <h3 className="text-lg font-bold">{role}</h3>
      </div>
      <ul className="space-y-3">
        {points.map((p, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CompareCard({ bad, good }: { bad: string; good: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-start gap-2 text-sm">
        <span className="text-red-400 mt-0.5 flex-shrink-0">✗</span>
        <span className="text-muted-foreground line-through decoration-muted-foreground/40">{bad}</span>
      </div>
      <div className="flex items-start gap-2 text-sm">
        <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
        <span className="font-medium">{good}</span>
      </div>
    </div>
  );
}
