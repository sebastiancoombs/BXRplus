import starsSoft from "@/assets/animations/stars-soft.json";
import bubblesCalm from "@/assets/animations/bubbles-calm.json";

export type AnimationCatalogItem = {
  id: string;
  label: string;
  tags: string[];
  category: "gain" | "loss" | "unlock";
  theme: string;
  intensity: "calm" | "standard" | "lively";
  glyphs: string[];
  motion: "float" | "burst" | "bloom" | "drift";
  lottieData?: any;
  source: "lottie" | "curated";
};

export const animationCatalog: AnimationCatalogItem[] = [
  // Gain base library
  { id: "stars-soft", label: "Soft Stars", tags: ["stars", "sparkle", "calm"], category: "gain", theme: "stars", intensity: "calm", glyphs: ["⭐", "🌟", "✨", "💫"], motion: "float", lottieData: starsSoft, source: "lottie" },
  { id: "bubbles-calm", label: "Calm Bubbles", tags: ["bubbles", "blue", "soothing"], category: "gain", theme: "bubbles", intensity: "calm", glyphs: ["🫧", "🔵", "✨", "💙"], motion: "drift", lottieData: bubblesCalm, source: "lottie" },
  { id: "flowers-bloom", label: "Flower Bloom", tags: ["flowers", "pink", "pretty"], category: "gain", theme: "flowers", intensity: "standard", glyphs: ["🌸", "🌼", "✨", "💖"], motion: "bloom", source: "curated" },
  { id: "smileys-pop", label: "Happy Smileys", tags: ["smileys", "faces", "fun"], category: "gain", theme: "smileys", intensity: "standard", glyphs: ["😊", "😄", "🥳", "✨"], motion: "burst", source: "curated" },
  { id: "heart-glow", label: "Heart Glow", tags: ["hearts", "love", "pink"], category: "gain", theme: "hearts", intensity: "standard", glyphs: ["💖", "💗", "💕", "✨"], motion: "float", source: "curated" },
  { id: "candy-burst", label: "Candy Burst", tags: ["candy", "sweet", "bright"], category: "gain", theme: "candy", intensity: "lively", glyphs: ["🍬", "🍭", "✨", "🎉"], motion: "burst", source: "curated" },
  { id: "glow-shimmer", label: "Glow Shimmer", tags: ["glow", "shimmer", "minimal"], category: "gain", theme: "glow", intensity: "calm", glyphs: ["✨", "💫", "⭐", "🌟"], motion: "float", source: "curated" },
  { id: "fireworks-sky", label: "Fireworks Sky", tags: ["fireworks", "celebration", "big"], category: "gain", theme: "fireworks", intensity: "lively", glyphs: ["🎆", "🎇", "✨", "🎉"], motion: "burst", source: "curated" },

  // Loss base library
  { id: "soft-fall", label: "Soft Fall", tags: ["loss", "soft", "calm"], category: "loss", theme: "glow", intensity: "calm", glyphs: ["〰️", "⬇️", "·", "⚠️"], motion: "drift", source: "curated" },
  { id: "gentle-cloud", label: "Gentle Cloud", tags: ["loss", "gentle", "soft"], category: "loss", theme: "bubbles", intensity: "calm", glyphs: ["☁️", "🫧", "⬇️", "〰️"], motion: "drift", source: "curated" },
  { id: "warning-drop", label: "Warning Drop", tags: ["loss", "alert", "clear"], category: "loss", theme: "smileys", intensity: "standard", glyphs: ["⚠️", "⬇️", "😕", "〰️"], motion: "burst", source: "curated" },
  { id: "gray-hearts", label: "Gray Hearts", tags: ["loss", "hearts", "soft"], category: "loss", theme: "hearts", intensity: "calm", glyphs: ["🩶", "⬇️", "〰️", "·"], motion: "drift", source: "curated" },
  { id: "petals-fade", label: "Petals Fade", tags: ["loss", "flowers", "gentle"], category: "loss", theme: "flowers", intensity: "calm", glyphs: ["🍂", "⬇️", "〰️", "·"], motion: "drift", source: "curated" },
  { id: "sad-stars", label: "Sad Stars", tags: ["loss", "stars", "dim"], category: "loss", theme: "stars", intensity: "calm", glyphs: ["☆", "⬇️", "〰️", "⚠️"], motion: "drift", source: "curated" },
  { id: "small-oops", label: "Small Oops", tags: ["loss", "oops", "friendly"], category: "loss", theme: "smileys", intensity: "standard", glyphs: ["😕", "😐", "⬇️", "〰️"], motion: "float", source: "curated" },
  { id: "dim-glow", label: "Dim Glow", tags: ["loss", "glow", "minimal"], category: "loss", theme: "glow", intensity: "calm", glyphs: ["·", "〰️", "⬇️", "⚠️"], motion: "float", source: "curated" },

  // Unlock base library
  { id: "unlock-fireworks", label: "Unlock Fireworks", tags: ["unlock", "fireworks", "celebration"], category: "unlock", theme: "fireworks", intensity: "lively", glyphs: ["🎆", "🎇", "✨", "🎉"], motion: "burst", source: "curated" },
  { id: "unlock-hearts", label: "Unlock Hearts", tags: ["unlock", "hearts", "pretty"], category: "unlock", theme: "hearts", intensity: "standard", glyphs: ["💖", "💗", "✨", "💕"], motion: "bloom", source: "curated" },
  { id: "unlock-stars", label: "Unlock Stars", tags: ["unlock", "stars", "sparkle"], category: "unlock", theme: "stars", intensity: "standard", glyphs: ["⭐", "🌟", "✨", "💫"], motion: "float", source: "curated" },
  { id: "unlock-bubbles", label: "Unlock Bubbles", tags: ["unlock", "bubbles", "calm"], category: "unlock", theme: "bubbles", intensity: "calm", glyphs: ["🫧", "✨", "💙", "🌟"], motion: "drift", source: "curated" },
  { id: "unlock-flowers", label: "Unlock Flowers", tags: ["unlock", "flowers", "bloom"], category: "unlock", theme: "flowers", intensity: "standard", glyphs: ["🌸", "🌼", "✨", "💖"], motion: "bloom", source: "curated" },
  { id: "unlock-smileys", label: "Unlock Smileys", tags: ["unlock", "smileys", "happy"], category: "unlock", theme: "smileys", intensity: "standard", glyphs: ["😊", "😄", "✨", "🥳"], motion: "burst", source: "curated" },
  { id: "unlock-candy", label: "Unlock Candy", tags: ["unlock", "candy", "sweet"], category: "unlock", theme: "candy", intensity: "lively", glyphs: ["🍬", "🍭", "✨", "🎉"], motion: "burst", source: "curated" },
  { id: "unlock-glow", label: "Unlock Glow", tags: ["unlock", "glow", "shimmer"], category: "unlock", theme: "glow", intensity: "calm", glyphs: ["✨", "💫", "⭐", "🌟"], motion: "float", source: "curated" },
];

export function searchAnimations(query: string, category?: "gain" | "loss" | "unlock") {
  const q = query.trim().toLowerCase();
  return animationCatalog.filter((item) => {
    if (category && item.category !== category) return false;
    if (!q) return true;
    return item.label.toLowerCase().includes(q) || item.tags.some((t) => t.includes(q)) || item.theme.includes(q);
  });
}

export function getAnimationById(id?: string | null) {
  return animationCatalog.find((item) => item.id === id) ?? null;
}
