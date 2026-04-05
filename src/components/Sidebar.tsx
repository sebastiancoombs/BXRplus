import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
  const role = profile?.role ?? "rbt";

  const navItems = allNav.filter((n) => n.roles.includes(role));

  return (
    <aside className="w-64 border-r bg-card min-h-screen flex flex-col">
      {/* Brand */}
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold flex items-center gap-2">
          🏆 <span>BXR<span className="text-primary">+</span></span>
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Token Economy System</p>
      </div>

      {/* User Info */}
      <div className="p-4 border-b">
        <p className="font-medium text-sm truncate">{profile?.full_name ?? "User"}</p>
        <p className="text-xs text-muted-foreground capitalize">{role}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
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
