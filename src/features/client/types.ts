export type ClientTabKey =
  | "dashboard"
  | "rewards"
  | "data"
  | "printables"
  | "team"
  | "settings";

export const CLIENT_TABS: { key: ClientTabKey; label: string; icon: string }[] = [
  { key: "dashboard", label: "Overview", icon: "📊" },
  { key: "rewards", label: "Programs", icon: "🎁" },
  { key: "data", label: "Progress", icon: "📈" },
  { key: "printables", label: "Materials", icon: "🖨️" },
  { key: "team", label: "Support Team", icon: "👥" },
  { key: "settings", label: "Program Settings", icon: "✏️" },
];
