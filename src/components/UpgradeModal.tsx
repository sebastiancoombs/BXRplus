import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { startCheckout } from "@/lib/billing";
import { Sparkles, X, Check } from "lucide-react";

const PERKS = [
  "Unlimited clients on your caseload",
  "Same one-tap workflow your team already knows",
  "All future BXR+ features included",
  "Cancel anytime — your data stays put",
];

export function UpgradeModal({
  open,
  onOpenChange,
  reason,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");

  async function go() {
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
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-card border shadow-2xl p-6 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">
              <Sparkles className="w-3 h-3" /> Upgrade to BXR+ Pro
            </div>
            <Dialog.Close asChild>
              <button className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          <Dialog.Title className="text-2xl font-bold">
            {reason ?? "Add another client with Pro"}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">
            Free covers one program for life. Pro unlocks the rest of your caseload — RBTs and parents you invite still pay nothing.
          </Dialog.Description>

          <ul className="mt-5 space-y-2">
            {PERKS.map((p) => (
              <li key={p} className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>{p}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex rounded-lg border p-1 bg-muted/40">
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billing === "monthly"
                  ? "bg-card shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              $7 / month
            </button>
            <button
              type="button"
              onClick={() => setBilling("yearly")}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billing === "yearly"
                  ? "bg-card shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              $59 / year <span className="text-xs opacity-70">(save 30%)</span>
            </button>
          </div>

          <Button onClick={go} disabled={busy} className="w-full mt-5" size="lg">
            {busy ? "Redirecting to Stripe…" : "Continue to checkout"}
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Secured by Stripe. Cancel anytime from your billing page.
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
