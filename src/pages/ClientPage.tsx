import { useState } from "react";
import { useClientContext } from "@/contexts/ClientContext";
import { ClientPageHeader } from "@/features/client/components/ClientPageHeader";
import type { ClientTabKey } from "@/features/client/types";
import DashboardTab from "@/features/client/tabs/DashboardTab";
import RewardsTab from "@/features/client/tabs/RewardsTab";
import DataTab from "@/features/client/tabs/DataTab";
import PrintablesTab from "@/features/client/tabs/PrintablesTab";
import TeamTab from "@/features/client/tabs/TeamTab";
import SettingsTab from "@/features/client/tabs/SettingsTab";

type ClientMeta = {
  id: string;
  full_name: string;
  balance: number;
  isOwner: boolean;
  myRole: string | null;
};

let persistedTab: ClientTabKey = "dashboard";

export default function ClientPage() {
  const { activeClient, clients, loading } = useClientContext();
  const [tab, setTabState] = useState<ClientTabKey>(persistedTab);

  const setTab = (nextTab: ClientTabKey) => {
    persistedTab = nextTab;
    setTabState(nextTab);
  };

  if (loading) return <p className="text-muted-foreground p-6">Loading...</p>;

  if (clients.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-sm">
          <p className="text-5xl mb-6">🏆</p>
          <h2 className="text-2xl font-bold mb-2">Welcome to BXR+</h2>
          <p className="text-muted-foreground">
            Add your first client using the sidebar to get started.
          </p>
        </div>
      </div>
    );
  }

  if (!activeClient) return null;

  const client = activeClient as ClientMeta;

  return (
    <div className="min-h-screen">
      <ClientPageHeader
        clientName={client.full_name}
        balance={client.balance}
        isOwner={client.isOwner}
        myRole={client.myRole}
        tab={tab}
        onTabChange={setTab}
      />

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 md:py-6">
        {tab === "dashboard" && <DashboardTab clientId={client.id} />}
        {tab === "rewards" && <RewardsTab clientId={client.id} />}
        {tab === "data" && <DataTab clientId={client.id} clientName={client.full_name} />}
        {tab === "printables" && <PrintablesTab clientId={client.id} client={client} />}
        {tab === "team" && <TeamTab clientId={client.id} isOwner={client.isOwner} />}
        {tab === "settings" && <SettingsTab clientId={client.id} isOwner={client.isOwner} onResetTab={() => setTab("dashboard")} />}
      </div>
    </div>
  );
}
