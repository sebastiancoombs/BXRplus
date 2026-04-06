import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAnimationById, searchAnimations } from "@/lib/animationCatalog";

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
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const results = useMemo(() => searchAnimations(query, category), [query, category]);
  const current = getAnimationById(value);

  return (
    <div className="space-y-2">
      {label && <p className="text-xs text-muted-foreground">{label}</p>}
      <Button type="button" variant="outline" className="w-full justify-between" onClick={() => setOpen((v) => !v)}>
        <span>{current ? current.label : `Choose ${category} animation`}</span>
        <span className="text-xs text-muted-foreground">{open ? "Close" : "Browse"}</span>
      </Button>
      {open && (
        <div className="rounded-xl border bg-background p-3 space-y-3">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search animations..." className="h-8" />
          <div className="grid gap-2 max-h-56 overflow-y-auto">
            {results.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => { onChange(item.id); setOpen(false); }}
                className={`w-full rounded-xl border px-3 py-2 text-left hover:bg-accent ${value === item.id ? "border-primary bg-primary/5" : ""}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground">{item.tags.join(" · ")}</p>
                  </div>
                  <div className="text-lg">{item.glyphs[0]}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
