import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold flex items-center gap-2">
            🏆 <span>BXR<span className="text-primary">+</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/login?mode=register">
              <Button size="sm">Get Started</Button>
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
              Built for ABA professionals
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
              Reward systems that
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"> actually work</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl">
              BXR+ gives BCBAs, RBTs, and parents a shared token economy — track behaviors,
              award points, and let clients earn real rewards. Like ClassDojo, built for ABA.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link to="/login?mode=register">
                <Button size="lg" className="text-base px-8 py-6">
                  Create Free Account
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button variant="outline" size="lg" className="text-base px-8 py-6">
                  See How It Works
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 md:py-28 border-t">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">How it works</h2>
          <p className="text-center text-muted-foreground mb-16 max-w-xl mx-auto">
            Three roles, one shared system. Everyone sees the same client progress in real time.
          </p>
          <div className="grid gap-8 md:grid-cols-3">
            <StepCard
              step="1"
              icon="👥"
              title="Set up your team"
              description="BCBAs create clients and invite RBTs and parents. Everyone gets access to the same dashboard."
            />
            <StepCard
              step="2"
              icon="⭐"
              title="Award points"
              description="Tap a behavior button to award points instantly. Scan the client's QR card from any phone."
            />
            <StepCard
              step="3"
              icon="🎁"
              title="Redeem rewards"
              description="Clients see thermometer progress toward their rewards. Hit the goal? Redeem with one tap."
            />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 md:py-28 bg-muted/30 border-t">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Everything you need</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard icon="💳" title="QR Card Scanning" desc="Each client gets a printable QR card. Scan to pull up their dashboard instantly." />
            <FeatureCard icon="📊" title="Bank-Style Ledger" desc="Full transaction history with credits, debits, dates, and running balance — like a bank statement." />
            <FeatureCard icon="🌡️" title="Progress Thermometers" desc="Color-coded progress bars show how close each client is to earning their next reward." />
            <FeatureCard icon="👨‍👩‍👧" title="Multi-Role Access" desc="BCBAs, RBTs, and parents all see the same data. BCBAs manage teams and assignments." />
            <FeatureCard icon="🔒" title="Role-Based Permissions" desc="BCBAs manage the team. Everyone can award points and create rewards." />
            <FeatureCard icon="📱" title="Works on Any Device" desc="Responsive design — works on phones, tablets, and desktops. No app to install." />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28 border-t">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Create your account in 30 seconds. Add your first client and start awarding points today.
          </p>
          <Link to="/login?mode=register">
            <Button size="lg" className="text-base px-10 py-6">
              Create Free Account
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} BXR+. Built for the ABA community.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link to="/login" className="hover:text-foreground transition-colors">Sign In</Link>
            <Link to="/login?mode=register" className="hover:text-foreground transition-colors">Register</Link>
          </div>
        </div>
      </footer>
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
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-3 hover:shadow-md transition-shadow">
      <span className="text-3xl">{icon}</span>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
