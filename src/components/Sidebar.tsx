import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useClientContext } from "@/contexts/ClientContext";
import { useSubscription } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UpgradeModal } from "@/components/UpgradeModal";

const navItems = [
  { path: "/dashboard", label: "Overview", icon: "📊" },
  { path: "/scan", label: "Scan Code", icon: "📷" },
  { path: "/profile", label: "My Profile", icon: "⚙️" },
  { path: "/billing", label: "Billing", icon: "💳" },
];

const FREE_CLIENT_LIMIT = 1;

export default function Sidebar() {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const { clients, activeClient, setActiveClientId, createClient } = useClientContext();
  const { isPro } = useSubscription();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const ownedCount = clients.filter((c) => c.isOwner).length;
  const atFreeCap = !isPro && ownedCount >= FREE_CLIENT_LIMIT;

  function requestAdd() {
    if (atFreeCap) {
      setShowUpgrade(true);
      return;
    }
    setAdding((v) => !v);
  }

  // Auto-collapse on small screens
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 768px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) setCollapsed(true);
    };
    handler(mql);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Close mobile overlay on navigation
  useEffect(() => { setMobileOpen(false); }, [location.pathname, activeClient?.id]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    await createClient(newName.trim());
    setNewName("");
    setAdding(false);
    setBusy(false);
  }

  const sidebarContent = (
    <aside className={cn(
      "border-r bg-card h-screen flex flex-col transition-all duration-200 flex-shrink-0",
      collapsed ? "w-16" : "w-60"
    )}>
      {/* Brand + Collapse Toggle */}
      <div className={cn("flex items-center border-b", collapsed ? "p-2 justify-center" : "p-4 justify-between")}>
        {collapsed ? (
          <button onClick={() => setCollapsed(false)} className="text-xl" title="Expand sidebar">🏆</button>
        ) : (
          <>
            <h1 className="text-xl font-bold">🏆 BXR<span className="text-primary">+</span></h1>
            <button
              onClick={() => setCollapsed(true)}
              className="text-muted-foreground hover:text-foreground transition-colors text-sm"
              title="Collapse sidebar"
            >
              ◀
            </button>
          </>
        )}
      </div>

      {/* Client List */}
      <div className={cn("flex-1 overflow-y-auto", collapsed ? "p-1" : "p-3")}>
        {!collapsed && (
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Learners</p>
            <button onClick={requestAdd} className="text-xs text-primary hover:underline">
              {adding ? "Cancel" : atFreeCap ? "+ Add (Pro)" : "+ Add"}
            </button>
          </div>
        )}

        {/* Inline add form (expanded only) */}
        {adding && !collapsed && (
          <form onSubmit={handleAdd} className="mb-3">
            <div className="flex gap-1.5">
              <Input value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="Learner name..." className="h-8 text-xs" autoFocus required />
              <Button type="submit" size="sm" className="h-8 px-2 text-xs" disabled={busy}>
                {busy ? "..." : "Add"}
              </Button>
            </div>
          </form>
        )}

        {/* Client pills / icons */}
        {clients.length === 0 && !adding ? (
          collapsed ? (
            <button onClick={() => { setCollapsed(false); requestAdd(); }}
              className="w-10 h-10 mx-auto rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
              title={atFreeCap ? "Upgrade to add another client" : "Add client"}>
              +
            </button>
          ) : (
            <button onClick={requestAdd}
              className="w-full text-left px-3 py-4 rounded-lg border-2 border-dashed text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors">
              Add your first learner
            </button>
          )
        ) : (
          <div className={cn("space-y-0.5", collapsed && "flex flex-col items-center")}>
            {clients.map((c) => {
              const active = c.id === activeClient?.id;
              if (collapsed) {
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveClientId(c.id)}
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-all",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                    title={`${c.full_name} — ${c.balance} pts`}
                  >
                    {c.full_name[0]?.toUpperCase()}
                  </button>
                );
              }
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveClientId(c.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors",
                    active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"
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
                    <p className={cn("text-[11px]", active ? "text-white/70" : "text-muted-foreground")}>
                      {c.balance} pts
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Add button when collapsed */}
        {collapsed && clients.length > 0 && (
          <button
            onClick={() => { setCollapsed(false); requestAdd(); }}
            className="w-10 h-10 mx-auto mt-1 rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
            title={atFreeCap ? "Upgrade to add another client" : "Add client"}
          >
            +
          </button>
        )}
      </div>

      {/* Bottom nav + user */}
      <div className={cn("border-t", collapsed ? "p-1 space-y-0.5" : "p-3 space-y-0.5")}>
        {navItems.map((item) => {
          const active = location.pathname.startsWith(item.path);
          if (collapsed) {
            return (
              <Link key={item.path} to={item.path}
                className={cn(
                  "w-10 h-10 mx-auto rounded-lg flex items-center justify-center transition-colors",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
                title={item.label}>
                <span className="text-base">{item.icon}</span>
              </Link>
            );
          }
          return (
            <Link key={item.path} to={item.path}
              className={cn(
                "flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
                active && "bg-primary text-primary-foreground"
              )}>
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

        {collapsed ? (
          <button onClick={signOut}
            className="w-10 h-10 mx-auto rounded-lg flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            title="Sign out">🚪</button>
        ) : (
          <div className="flex items-center justify-between px-2.5 py-2 mt-1">
            <p className="text-xs text-muted-foreground truncate">{profile?.full_name}</p>
            <button onClick={signOut} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
              Sign out
            </button>
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 w-10 h-10 rounded-lg bg-card border shadow-sm flex items-center justify-center"
      >
        ☰
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="relative z-50 w-60">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:block">
        {sidebarContent}
      </div>

      <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} />
    </>
  );
}
