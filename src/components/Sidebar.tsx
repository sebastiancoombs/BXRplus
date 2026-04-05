import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useClientContext } from "@/contexts/ClientContext";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: "📊" },
  { path: "/rewards", label: "Rewards", icon: "🎁" },
  { path: "/team", label: "Team", icon: "👥" },
  { path: "/scan", label: "Scan Card", icon: "📷" },
  { path: "/profile", label: "Profile", icon: "⚙️" },
];

const roleBadge: Record<string, { label: string; color: string }> = {
  bcba: { label: "BCBA", color: "bg-purple-100 text-purple-700" },
  rbt: { label: "RBT", color: "bg-blue-100 text-blue-700" },
  parent: { label: "Parent", color: "bg-green-100 text-green-700" },
};

export default function Sidebar() {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const { clients, activeClient, setActiveClientId } = useClientContext();

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
      <div className="p-3 border-b">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2 px-1">
          {clients.length === 0 ? "No Clients Yet" : "Clients"}
        </p>
        {clients.length === 0 ? (
          <Link
            to="/team"
            className="flex items-center gap-2 px-2 py-2 rounded-md text-sm text-primary hover:bg-primary/5 transition-colors"
          >
            <span>+</span> Add your first client
          </Link>
        ) : (
          <div className="space-y-0.5 max-h-48 overflow-y-auto">
            {clients.map((c) => {
              const active = c.id === activeClient?.id;
              const badge = roleBadge[c.myRole ?? ""] ?? null;
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
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{c.full_name}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-muted-foreground">{c.balance} pts</span>
                      {badge && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badge.color}`}>
                          {badge.label}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* User Info */}
      <div className="px-4 py-3 border-b">
        <p className="font-medium text-sm truncate">{profile?.full_name ?? "User"}</p>
        <p className="text-xs text-muted-foreground">
          {clients.length} client{clients.length !== 1 ? "s" : ""}
        </p>
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
