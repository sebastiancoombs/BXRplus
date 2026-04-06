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

const gain: AnimationCatalogItem[] = [
  { id: "stars-soft", label: "Soft Stars", tags: ["stars", "sparkle", "calm"], category: "gain", theme: "stars", intensity: "calm", glyphs: ["⭐", "🌟", "✨", "💫"], motion: "float", lottieData: starsSoft },
  { id: "stars-party", label: "Party Stars", tags: ["stars", "celebration", "bright"], category: "gain", theme: "stars", intensity: "lively", glyphs: ["⭐", "🌟", "✨", "🎉"], motion: "burst" },
  { id: "sparkle-rain", label: "Sparkle Rain", tags: ["sparkles", "rain", "magic"], category: "gain", theme: "stars", intensity: "standard", glyphs: ["✨", "💫", "⭐", "🌟"], motion: "drift" },
  { id: "gold-twinkle", label: "Gold Twinkle", tags: ["gold", "twinkle", "calm"], category: "gain", theme: "stars", intensity: "calm", glyphs: ["⭐", "✨", "🌟", "💛"], motion: "float" },
  { id: "bubbles-calm", label: "Calm Bubbles", tags: ["bubbles", "blue", "soothing"], category: "gain", theme: "bubbles", intensity: "calm", glyphs: ["🫧", "🔵", "✨", "💙"], motion: "drift", lottieData: bubblesCalm },
  { id: "bubble-pop", label: "Bubble Pop", tags: ["bubbles", "fun", "light"], category: "gain", theme: "bubbles", intensity: "standard", glyphs: ["🫧", "💧", "✨", "🔵"], motion: "burst" },
  { id: "ocean-bubbles", label: "Ocean Bubbles", tags: ["ocean", "water", "calm"], category: "gain", theme: "bubbles", intensity: "calm", glyphs: ["🫧", "🌊", "💙", "✨"], motion: "drift" },
  { id: "flower-bloom", label: "Flower Bloom", tags: ["flowers", "pink", "pretty"], category: "gain", theme: "flowers", intensity: "standard", glyphs: ["🌸", "🌼", "✨", "💖"], motion: "bloom" },
  { id: "petal-float", label: "Petal Float", tags: ["flowers", "petals", "calm"], category: "gain", theme: "flowers", intensity: "calm", glyphs: ["🌸", "🌺", "🍃", "✨"], motion: "drift" },
  { id: "garden-party", label: "Garden Party", tags: ["flowers", "bright", "happy"], category: "gain", theme: "flowers", intensity: "lively", glyphs: ["🌼", "🌸", "🌺", "🎉"], motion: "burst" },
  { id: "happy-smileys", label: "Happy Smileys", tags: ["smileys", "faces", "fun"], category: "gain", theme: "smileys", intensity: "standard", glyphs: ["😊", "😄", "🥳", "✨"], motion: "burst" },
  { id: "soft-smiles", label: "Soft Smiles", tags: ["smileys", "calm", "friendly"], category: "gain", theme: "smileys", intensity: "calm", glyphs: ["😊", "🙂", "✨", "💫"], motion: "float" },
  { id: "laugh-burst", label: "Laugh Burst", tags: ["smileys", "laugh", "excited"], category: "gain", theme: "smileys", intensity: "lively", glyphs: ["😄", "😁", "🥳", "🎉"], motion: "burst" },
  { id: "fireworks-sky", label: "Fireworks Sky", tags: ["fireworks", "celebration", "big"], category: "gain", theme: "fireworks", intensity: "lively", glyphs: ["🎆", "🎇", "✨", "🎉"], motion: "burst" },
  { id: "mini-fireworks", label: "Mini Fireworks", tags: ["fireworks", "quick", "reward"], category: "gain", theme: "fireworks", intensity: "standard", glyphs: ["🎇", "✨", "⭐", "🎉"], motion: "burst" },
  { id: "heart-glow", label: "Heart Glow", tags: ["hearts", "love", "pink"], category: "gain", theme: "hearts", intensity: "standard", glyphs: ["💖", "💗", "💕", "✨"], motion: "float" },
  { id: "heart-bloom", label: "Heart Bloom", tags: ["hearts", "cute", "sweet"], category: "gain", theme: "hearts", intensity: "lively", glyphs: ["💖", "💞", "💗", "🎉"], motion: "bloom" },
  { id: "candy-burst", label: "Candy Burst", tags: ["candy", "sweet", "bright"], category: "gain", theme: "candy", intensity: "lively", glyphs: ["🍬", "🍭", "✨", "🎉"], motion: "burst" },
  { id: "sweet-sprinkles", label: "Sweet Sprinkles", tags: ["candy", "sprinkles", "fun"], category: "gain", theme: "candy", intensity: "standard", glyphs: ["🍬", "🍭", "🌈", "✨"], motion: "drift" },
  { id: "glow-shimmer", label: "Glow Shimmer", tags: ["glow", "shimmer", "minimal"], category: "gain", theme: "glow", intensity: "calm", glyphs: ["✨", "💫", "⭐", "🌟"], motion: "float" },
];

const loss: AnimationCatalogItem[] = [
  { id: "soft-fall", label: "Soft Fall", tags: ["loss", "soft", "calm"], category: "loss", theme: "glow", intensity: "calm", glyphs: ["〰️", "⬇️", "·", "⚠️"], motion: "drift" },
  { id: "gentle-cloud", label: "Gentle Cloud", tags: ["loss", "gentle", "soft"], category: "loss", theme: "bubbles", intensity: "calm", glyphs: ["☁️", "🫧", "⬇️", "〰️"], motion: "drift" },
  { id: "warning-drop", label: "Warning Drop", tags: ["loss", "alert", "clear"], category: "loss", theme: "smileys", intensity: "standard", glyphs: ["⚠️", "⬇️", "😕", "〰️"], motion: "burst" },
  { id: "sad-stars", label: "Sad Stars", tags: ["loss", "stars", "dim"], category: "loss", theme: "stars", intensity: "calm", glyphs: ["☆", "⬇️", "〰️", "⚠️"], motion: "drift" },
  { id: "dim-glow", label: "Dim Glow", tags: ["loss", "glow", "minimal"], category: "loss", theme: "glow", intensity: "calm", glyphs: ["·", "〰️", "⬇️", "⚠️"], motion: "float" },
  { id: "soft-rain", label: "Soft Rain", tags: ["loss", "rain", "gentle"], category: "loss", theme: "bubbles", intensity: "calm", glyphs: ["💧", "⬇️", "〰️", "·"], motion: "drift" },
  { id: "quiet-warning", label: "Quiet Warning", tags: ["loss", "warning", "soft"], category: "loss", theme: "smileys", intensity: "standard", glyphs: ["⚠️", "😐", "⬇️", "〰️"], motion: "float" },
  { id: "gray-hearts", label: "Gray Hearts", tags: ["loss", "hearts", "soft"], category: "loss", theme: "hearts", intensity: "calm", glyphs: ["🩶", "⬇️", "〰️", "·"], motion: "drift" },
  { id: "petals-fade", label: "Petals Fade", tags: ["loss", "flowers", "gentle"], category: "loss", theme: "flowers", intensity: "calm", glyphs: ["🍂", "⬇️", "〰️", "·"], motion: "drift" },
  { id: "bubble-sink", label: "Bubble Sink", tags: ["loss", "bubbles", "down"], category: "loss", theme: "bubbles", intensity: "standard", glyphs: ["🫧", "⬇️", "⚪", "〰️"], motion: "drift" },
  { id: "quiet-candy", label: "Quiet Candy", tags: ["loss", "candy", "soft"], category: "loss", theme: "candy", intensity: "calm", glyphs: ["🫥", "⬇️", "〰️", "·"], motion: "drift" },
  { id: "soft-clouds", label: "Soft Clouds", tags: ["loss", "clouds", "gray"], category: "loss", theme: "glow", intensity: "calm", glyphs: ["☁️", "〰️", "⬇️", "·"], motion: "float" },
  { id: "small-oops", label: "Small Oops", tags: ["loss", "oops", "friendly"], category: "loss", theme: "smileys", intensity: "standard", glyphs: ["😕", "😐", "⬇️", "〰️"], motion: "float" },
  { id: "down-stars", label: "Down Stars", tags: ["loss", "stars", "drop"], category: "loss", theme: "stars", intensity: "standard", glyphs: ["☆", "💫", "⬇️", "〰️"], motion: "burst" },
  { id: "mist-fade", label: "Mist Fade", tags: ["loss", "mist", "minimal"], category: "loss", theme: "glow", intensity: "calm", glyphs: ["·", "·", "⬇️", "〰️"], motion: "drift" },
  { id: "gentle-zigzag", label: "Gentle Zigzag", tags: ["loss", "zigzag", "clear"], category: "loss", theme: "glow", intensity: "standard", glyphs: ["〰️", "⚠️", "⬇️", "·"], motion: "float" },
  { id: "faded-smile", label: "Faded Smile", tags: ["loss", "smileys", "soft"], category: "loss", theme: "smileys", intensity: "calm", glyphs: ["🙂", "😐", "⬇️", "·"], motion: "drift" },
  { id: "blue-drop", label: "Blue Drop", tags: ["loss", "blue", "calm"], category: "loss", theme: "bubbles", intensity: "calm", glyphs: ["💧", "🩵", "⬇️", "〰️"], motion: "drift" },
  { id: "soft-alert", label: "Soft Alert", tags: ["loss", "alert", "calm"], category: "loss", theme: "glow", intensity: "standard", glyphs: ["⚠️", "·", "⬇️", "〰️"], motion: "float" },
  { id: "quiet-fall", label: "Quiet Fall", tags: ["loss", "fall", "gentle"], category: "loss", theme: "glow", intensity: "calm", glyphs: ["⬇️", "〰️", "·", "⚪"], motion: "drift" },
];

const unlock: AnimationCatalogItem[] = [
  { id: "unlock-fireworks", label: "Unlock Fireworks", tags: ["unlock", "fireworks", "celebration"], category: "unlock", theme: "fireworks", intensity: "lively", glyphs: ["🎆", "🎇", "✨", "🎉"], motion: "burst" },
  { id: "unlock-hearts", label: "Unlock Hearts", tags: ["unlock", "hearts", "pretty"], category: "unlock", theme: "hearts", intensity: "standard", glyphs: ["💖", "💗", "✨", "💕"], motion: "bloom" },
  { id: "unlock-stars", label: "Unlock Stars", tags: ["unlock", "stars", "sparkle"], category: "unlock", theme: "stars", intensity: "standard", glyphs: ["⭐", "🌟", "✨", "💫"], motion: "float" },
  { id: "unlock-bubbles", label: "Unlock Bubbles", tags: ["unlock", "bubbles", "calm"], category: "unlock", theme: "bubbles", intensity: "calm", glyphs: ["🫧", "✨", "💙", "🌟"], motion: "drift" },
  { id: "unlock-flowers", label: "Unlock Flowers", tags: ["unlock", "flowers", "bloom"], category: "unlock", theme: "flowers", intensity: "standard", glyphs: ["🌸", "🌼", "✨", "💖"], motion: "bloom" },
  { id: "unlock-smileys", label: "Unlock Smileys", tags: ["unlock", "smileys", "happy"], category: "unlock", theme: "smileys", intensity: "standard", glyphs: ["😊", "😄", "✨", "🥳"], motion: "burst" },
  { id: "unlock-candy", label: "Unlock Candy", tags: ["unlock", "candy", "sweet"], category: "unlock", theme: "candy", intensity: "lively", glyphs: ["🍬", "🍭", "✨", "🎉"], motion: "burst" },
  { id: "unlock-glow", label: "Unlock Glow", tags: ["unlock", "glow", "shimmer"], category: "unlock", theme: "glow", intensity: "calm", glyphs: ["✨", "💫", "⭐", "🌟"], motion: "float" },
  { id: "unlock-rainbow", label: "Unlock Rainbow", tags: ["unlock", "rainbow", "bright"], category: "unlock", theme: "candy", intensity: "lively", glyphs: ["🌈", "✨", "💖", "🎉"], motion: "burst" },
  { id: "unlock-garden", label: "Unlock Garden", tags: ["unlock", "flowers", "garden"], category: "unlock", theme: "flowers", intensity: "standard", glyphs: ["🌸", "🌺", "🌼", "✨"], motion: "bloom" },
  { id: "unlock-gold", label: "Unlock Gold", tags: ["unlock", "gold", "stars"], category: "unlock", theme: "stars", intensity: "standard", glyphs: ["⭐", "✨", "💛", "🌟"], motion: "float" },
  { id: "unlock-sweet", label: "Unlock Sweet", tags: ["unlock", "sweet", "candy"], category: "unlock", theme: "candy", intensity: "standard", glyphs: ["🍭", "🍬", "✨", "💖"], motion: "bloom" },
  { id: "unlock-love", label: "Unlock Love", tags: ["unlock", "hearts", "cute"], category: "unlock", theme: "hearts", intensity: "standard", glyphs: ["💗", "💕", "💖", "✨"], motion: "float" },
  { id: "unlock-sparkle-burst", label: "Unlock Sparkle Burst", tags: ["unlock", "sparkles", "burst"], category: "unlock", theme: "stars", intensity: "lively", glyphs: ["✨", "💫", "⭐", "🎉"], motion: "burst" },
  { id: "unlock-cloud-nine", label: "Unlock Cloud Nine", tags: ["unlock", "cloud", "calm"], category: "unlock", theme: "bubbles", intensity: "calm", glyphs: ["☁️", "✨", "💙", "🫧"], motion: "drift" },
  { id: "unlock-party", label: "Unlock Party", tags: ["unlock", "party", "big"], category: "unlock", theme: "fireworks", intensity: "lively", glyphs: ["🎉", "🎊", "🎆", "✨"], motion: "burst" },
  { id: "unlock-fairy", label: "Unlock Fairy", tags: ["unlock", "magic", "sparkle"], category: "unlock", theme: "glow", intensity: "standard", glyphs: ["✨", "🧚", "💫", "⭐"], motion: "float" },
  { id: "unlock-sunshine", label: "Unlock Sunshine", tags: ["unlock", "sun", "bright"], category: "unlock", theme: "stars", intensity: "standard", glyphs: ["☀️", "✨", "🌟", "💛"], motion: "bloom" },
  { id: "unlock-ocean", label: "Unlock Ocean", tags: ["unlock", "ocean", "blue"], category: "unlock", theme: "bubbles", intensity: "calm", glyphs: ["🌊", "🫧", "✨", "💙"], motion: "drift" },
  { id: "unlock-finale", label: "Unlock Finale", tags: ["unlock", "finale", "big"], category: "unlock", theme: "fireworks", intensity: "lively", glyphs: ["🎆", "🎇", "🎉", "✨"], motion: "burst" },
];

export const animationCatalog: AnimationCatalogItem[] = [...gain, ...loss, ...unlock];

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
