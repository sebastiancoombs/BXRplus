import JSConfetti from "js-confetti";

let instance: JSConfetti | null = null;

function getInstance() {
  if (typeof window === "undefined") return null;
  if (!instance) instance = new JSConfetti();
  return instance;
}

export type BurstMode = "gain" | "loss";

export async function playEmojiBurst({
  emoji,
  mode = "gain",
  count,
}: {
  emoji?: string | null;
  mode?: BurstMode;
  count?: number;
}) {
  const jsConfetti = getInstance();
  if (!jsConfetti) return;

  const chosen = emoji?.trim() || (mode === "loss" ? "⚠️" : "⭐");

  await jsConfetti.addConfetti({
    emojis: [chosen],
    emojiSize: mode === "loss" ? 42 : 50,
    confettiNumber: count ?? (mode === "loss" ? 18 : 28),
  });
}
