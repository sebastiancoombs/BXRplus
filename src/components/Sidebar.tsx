import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useClientContext } from "@/contexts/ClientContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Sidebar() {
  const { profile, signOut } = useAuth();
  const { clients, activeClient, setActiveClientId, createClient } = useClientContext();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    await createClient(newName.trim());
    setNewName("");
    setAdding(false);
    setBusy(false);
  }

  return (
    <aside className="w-60 border-r bg-card min-h-screen flex flex-col">
      {/* Brand */}
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold">
          🏆 BXR<span className="text-primary">+</span>
        </h1>
      </div>

      {/* Client List */}
      <div className="flex-1 p-3 overflow-y-auto">
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
            Clients
          </p>
          <button
            onClick={() => setAdding(!adding)}
            className="text-xs text-primary hover:underline"
          >
            {adding ? "Cancel" : "+ Add"}
          </button>
        </div>

        {/* Inline add form */}
        {adding && (
          <form onSubmit={handleAdd} className="mb-3">
            <div className="flex gap-1.5">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Client name..."
                className="h-8 text-xs"
                autoFocus
                required
              />
              <Button type="submit" size="sm" className="h-8 px-2 text-xs" disabled={busy}>
                {busy ? "..." : "Add"}
              </Button>
            </div>
          </form>
        )}

        {/* Client pills */}
        {clients.length === 0 && !adding ? (
          <button
            onClick={() => setAdding(true)}
            className="w-full text-left px-3 py-4 rounded-lg border-2 border-dashed text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
          >
            Add your first client to get started
          </button>
        ) : (
          <div className="space-y-0.5">
            {clients.map((c) => {
              const active = c.id === activeClient?.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveClientId(c.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-accent"
                  )}
                >
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                    active ? "bg-white/20" : "bg-muted text-muted-foreground"
                  )}>
                    {c.full_name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{c.full_name}</p>
                    <p className={cn(
                      "text-[11px]",
                      active ? "text-white/70" : "text-muted-foreground"
                    )}>
                      {c.balance} pts
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom: user + nav links */}
      <div className="border-t p-3 space-y-1">
        <a
          href="/scan"
          className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          📷 Scan Card
        </a>
        <a
          href="/profile"
          className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          ⚙️ Settings
        </a>
        <div className="flex items-center justify-between px-2.5 py-2">
          <p className="text-xs text-muted-foreground truncate">{profile?.full_name}</p>
          <button
            onClick={signOut}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
