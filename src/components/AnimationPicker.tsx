import IconPicker from "@/components/IconPicker";

export default function AnimationPicker({
  value,
  category,
  onChange,
  label,
}: {
  value?: string | null;
  category: "gain" | "loss" | "unlock";
  onChange: (id: string) => void;
  label?: string;
}) {
  const fallback = category === "loss" ? "⚠️" : "⭐";

  return (
    <div className="space-y-2 min-w-0">
      {label && <p className="text-xs font-medium text-muted-foreground">{label}</p>}
      <div className="rounded-2xl border bg-background p-3 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0">
            <IconPicker value={value || fallback} onChange={onChange} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">Selected: {value || fallback}</p>
            <p className="text-[11px] text-muted-foreground break-words">
              {category === "loss" ? "Shown when points are removed." : "Shown when points are added."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
