import { useState, useRef, useEffect } from "react";
import { useClientContext } from "@/contexts/ClientContext";
import { cn } from "@/lib/utils";

const roleBadge: Record<string, { label: string; color: string }> = {
  bcba: { label: "BCBA", color: "bg-purple-100 text-purple-700" },
  rbt: { label: "RBT", color: "bg-blue-100 text-blue-700" },
  parent: { label: "Parent", color: "bg-green-100 text-green-700" },
};

export default function ClientHeader() {
  const { clients, activeClient, setActiveClientId } = useClientContext();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!activeClient || clients.length <= 1) {
    // Single client or none — just show the name, no dropdown
    if (!activeClient) return null;
    const badge = roleBadge[activeClient.myRole ?? ""];
    return (
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
          {activeClient.full_name[0]?.toUpperCase()}
        </div>
        <div>
          <h2 className="text-lg font-bold leading-tight">{activeClient.full_name}</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{activeClient.balance} points</span>
            {badge && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badge.color}`}>
                {badge.label}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  const badge = roleBadge[activeClient.myRole ?? ""];

  return (
    <div className="relative mb-6" ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 px-3 py-2.5 -mx-3 rounded-xl hover:bg-accent transition-colors w-full text-left group"
      >
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary flex-shrink-0">
          {activeClient.full_name[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold leading-tight truncate">{activeClient.full_name}</h2>
            <svg
              className={cn(
                "w-4 h-4 text-muted-foreground transition-transform flex-shrink-0",
                open && "rotate-180"
              )}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{activeClient.balance} points</span>
            {badge && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badge.color}`}>
                {badge.label}
              </span>
            )}
          </div>
        </div>
        <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          Switch
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-xl shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
          {clients.map((c) => {
            const isActive = c.id === activeClient.id;
            const cBadge = roleBadge[c.myRole ?? ""];
            return (
              <button
                key={c.id}
                onClick={() => { setActiveClientId(c.id); setOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                  isActive ? "bg-primary/5" : "hover:bg-accent"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
                  isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {c.full_name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm truncate", isActive ? "font-semibold" : "font-medium")}>
                    {c.full_name}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">{c.balance} pts</span>
                    {cBadge && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cBadge.color}`}>
                        {cBadge.label}
                      </span>
                    )}
                  </div>
                </div>
                {isActive && (
                  <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
