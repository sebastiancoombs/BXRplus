import { Outlet, useSearchParams } from "react-router-dom";
import Sidebar from "@/components/Sidebar";

export default function AppLayout() {
  const [searchParams] = useSearchParams();
  const embedded = searchParams.get("embed") === "true";

  if (embedded) {
    return (
      <main className="h-screen w-full overflow-y-auto bg-background">
        <Outlet />
      </main>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
