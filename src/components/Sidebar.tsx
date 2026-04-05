import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useClientContext } from "@/contexts/ClientContext";
import { cn } from "@/lib/utils";

const allNav = [
  { path: "/dashboard", label: "Dashboard", icon: "📊", roles: ["bcba", "rbt", "parent"] },
  { path: "/rewards", label: "Rewards", icon: "🎁", roles: ["bcba", "rbt", "parent"] },
  { path: "/team", label: "Team Management", icon: "👥", roles: ["bcba"] },
  { path: "/scan", label: "Scan Card", icon: "📷", roles: ["bcba", "rbt", "parent"] },
  { path: "/profile", label: "Profile", icon: "⚙️", roles: ["bcba", "rbt", "parent"] },
];

export default function Sidebar() {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const { clients, activeClient, setActiveClientId } = useClientContext();
  const role = profile?.role ?? "rbt";
  const navItems = allNav.filter((n) => n.roles.includes(role));

  return (
    <aside className="w-64 border-r bg-card min-h-screen flex flex-col">
      {/* Brand */}
      <div className="p-5 border-b">
        <h1 className="text-xl font-bold flex items-center gap-2">
          🏆 <span>BXR<span className="text-primary">+</span></span>
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Token Economy System</p>
      </div>

      {/* Client Switcher */}
      {clients.length > 0 && (
        <div className="p-3 border-b">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2 px-1">
            Client
          </p>
          {clients.length === 1 ? (
            <div className="flex items-center gap-2.5 px-2 py-1.5">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                {activeClient?.full_name[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{activeClient?.full_name}</p>
                <p className="text-xs text-muted-foreground">{activeClient?.balance} pts</p>
              </div>
            </div>
          ) : (
            <div className="space-y-0.5">
              {clients.map((c) => {
                const active = c.id === activeClient?.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveClientId(c.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-accent"
                    )}
                  >
                    <div
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {c.full_name[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.full_name}</p>
                      <p className="text-[11px] text-muted-foreground">{c.balance} pts</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* User Info */}
      <div className="px-4 py-3 border-b">
        <p className="font-medium text-sm truncate">{profile?.full_name ?? "User"}</p>
        <p className="text-xs text-muted-foreground capitalize">{role}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map((item) => {
          const active = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Sign Out */}
      <div className="p-3 border-t">
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors w-full"
        >
          <span className="text-lg">🚪</span>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
