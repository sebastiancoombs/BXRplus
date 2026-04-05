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

export default function Sidebar() {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const { clients, activeClient, setActiveClientId } = useClientContext();

  return (
    <aside className="w-60 border-r bg-card min-h-screen flex flex-col">
      {/* Brand */}
      <div className="p-5 border-b">
        <h1 className="text-xl font-bold flex items-center gap-2">
          🏆 <span>BXR<span className="text-primary">+</span></span>
        </h1>
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
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Quick client pills — compact, visual */}
      {clients.length > 1 && (
        <div className="px-3 pb-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 px-1">
            Clients
          </p>
          <div className="space-y-0.5">
            {clients.map((c) => {
              const active = c.id === activeClient?.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveClientId(c.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors text-xs",
                    active
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                    active ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
                    {c.full_name[0]?.toUpperCase()}
                  </div>
                  <span className="truncate">{c.full_name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* User + Sign Out */}
      <div className="p-3 border-t space-y-1">
        <div className="px-2 py-1.5">
          <p className="font-medium text-sm truncate">{profile?.full_name ?? "User"}</p>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors w-full"
        >
          🚪 Sign Out
        </button>
      </div>
    </aside>
  );
}
