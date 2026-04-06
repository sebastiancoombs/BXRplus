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
};

export const animationCatalog: AnimationCatalogItem[] = [
  { id: "stars-soft", label: "Soft Stars", tags: ["stars", "sparkle", "calm"], category: "gain", theme: "stars", intensity: "calm", glyphs: ["⭐", "🌟", "✨", "💫"], motion: "float", lottieData: starsSoft },
  { id: "stars-party", label: "Party Stars", tags: ["stars", "celebration", "bright"], category: "gain", theme: "stars", intensity: "lively", glyphs: ["⭐", "🌟", "✨", "🎉"], motion: "burst" },
  { id: "bubbles-calm", label: "Calm Bubbles", tags: ["bubbles", "blue", "soothing"], category: "gain", theme: "bubbles", intensity: "calm", glyphs: ["🫧", "🔵", "✨", "💙"], motion: "drift", lottieData: bubblesCalm },
  { id: "flowers-bloom", label: "Flower Bloom", tags: ["flowers", "pink", "pretty"], category: "gain", theme: "flowers", intensity: "standard", glyphs: ["🌸", "🌼", "✨", "💖"], motion: "bloom" },
  { id: "smileys-pop", label: "Happy Smileys", tags: ["smileys", "faces", "fun"], category: "gain", theme: "smileys", intensity: "standard", glyphs: ["😊", "😄", "🥳", "✨"], motion: "burst" },
  { id: "hearts-glow", label: "Heart Glow", tags: ["hearts", "love", "pink"], category: "gain", theme: "hearts", intensity: "standard", glyphs: ["💖", "💗", "💕", "✨"], motion: "float" },
  { id: "candy-burst", label: "Candy Burst", tags: ["candy", "sweet", "bright"], category: "gain", theme: "candy", intensity: "lively", glyphs: ["🍬", "🍭", "✨", "🎉"], motion: "burst" },
  { id: "glow-shimmer", label: "Glow Shimmer", tags: ["glow", "shimmer", "minimal"], category: "gain", theme: "glow", intensity: "calm", glyphs: ["✨", "💫", "⭐", "🌟"], motion: "float" },

  { id: "soft-fall", label: "Soft Fall", tags: ["loss", "soft", "calm"], category: "loss", theme: "glow", intensity: "calm", glyphs: ["〰️", "⬇️", "·", "⚠️"], motion: "drift" },
  { id: "gentle-cloud", label: "Gentle Cloud", tags: ["loss", "gentle", "soft"], category: "loss", theme: "bubbles", intensity: "calm", glyphs: ["☁️", "🫧", "⬇️", "〰️"], motion: "drift" },
  { id: "warning-drop", label: "Warning Drop", tags: ["loss", "alert", "clear"], category: "loss", theme: "smileys", intensity: "standard", glyphs: ["⚠️", "⬇️", "😕", "〰️"], motion: "burst" },

  { id: "unlock-fireworks", label: "Unlock Fireworks", tags: ["unlock", "fireworks", "celebration"], category: "unlock", theme: "fireworks", intensity: "lively", glyphs: ["🎆", "🎇", "✨", "🎉"], motion: "burst" },
  { id: "unlock-hearts", label: "Unlock Hearts", tags: ["unlock", "hearts", "pretty"], category: "unlock", theme: "hearts", intensity: "standard", glyphs: ["💖", "💗", "✨", "💕"], motion: "bloom" },
  { id: "unlock-stars", label: "Unlock Stars", tags: ["unlock", "stars", "sparkle"], category: "unlock", theme: "stars", intensity: "standard", glyphs: ["⭐", "🌟", "✨", "💫"], motion: "float" },
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
