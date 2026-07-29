import { useState } from "react";
import { useClientContext } from "@/contexts/ClientContext";
import { ClientPageHeader } from "@/features/client/components/ClientPageHeader";
import type { ClientTabKey } from "@/features/client/types";
import DashboardTab from "@/features/client/tabs/DashboardTab";
import RewardsTab from "@/features/client/tabs/RewardsTab";
import DataTab from "@/features/client/tabs/DataTab";
import PrintablesTab from "@/features/client/tabs/PrintablesTab";
import SessionNotesTab from "@/features/client/tabs/SessionNotesTab";
import SettingsTab from "@/features/client/tabs/SettingsTab";
import MobileBehaviorNavigation from "@/components/behavior-zone/MobileBehaviorNavigation";

type ClientMeta = {
  id: string;
  full_name: string;
  balance: number;
  isOwner: boolean;
  myRole: string | null;
};

let persistedTab: ClientTabKey = "dashboard";

export default function ClientPage() {
  const { activeClient, clients, loading, createClient } = useClientContext();
  const [tab, setTabState] = useState<ClientTabKey>(persistedTab);
  const [newClientName, setNewClientName] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);

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
          <p className="text-muted-foreground mb-4">Add your first learner to get started.</p>
          <form
            className="flex gap-2"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!newClientName.trim()) return;
              setCreatingClient(true);
              await createClient(newClientName.trim());
              setCreatingClient(false);
              setNewClientName("");
            }}
          >
            <input
              value={newClientName}
              onChange={(event) => setNewClientName(event.target.value)}
              placeholder="Learner name"
              className="h-10 flex-1 rounded-lg border bg-background px-3 text-sm"
              required
            />
            <button className="h-10 rounded-lg bg-primary px-4 text-sm text-primary-foreground" disabled={creatingClient}>
              {creatingClient ? "Adding…" : "Add"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!activeClient) return null;

  const client = activeClient as ClientMeta;

  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      <ClientPageHeader
        clientName={client.full_name}
        balance={client.balance}
        isOwner={client.isOwner}
        myRole={client.myRole}
        tab={tab}
        onTabChange={setTab}
      />

      <div className="h-full w-full px-3 py-3 sm:px-4 md:px-6 md:py-6 2xl:px-10">
        {tab === "dashboard" && <DashboardTab clientId={client.id} />}
        {tab === "rewards" && <RewardsTab clientId={client.id} />}
        {tab === "data" && <DataTab clientId={client.id} clientName={client.full_name} />}
        {tab === "notes" && <SessionNotesTab clientId={client.id} clientName={client.full_name} />}
        {tab === "printables" && <PrintablesTab clientId={client.id} client={client} />}
        {tab === "settings" && <SettingsTab clientId={client.id} isOwner={client.isOwner} onResetTab={() => setTab("dashboard")} />}
      </div>
      <MobileBehaviorNavigation activeTab={tab} onTabChange={setTab} />
    </div>
  );
}
