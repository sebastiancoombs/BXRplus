import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AppLayout() {
  const { profile, signOut } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: "/clients", label: "👥 Clients" },
    { path: "/scan", label: "📷 Scan" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/clients" className="font-bold text-lg flex items-center gap-2">
            🏆 Token Economy
          </Link>
          <nav className="flex items-center gap-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`text-sm font-medium transition-colors ${
                  location.pathname.startsWith(item.path)
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <div className="flex items-center gap-2 ml-4">
              {profile && (
                <Badge variant="outline" className="capitalize">
                  {profile.role}
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={signOut}>
                Sign Out
              </Button>
            </div>
          </nav>
        </div>
      </header>

      {/* Page Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
