"use client";

import { useClientContext } from "@/contexts/ClientContext";
import TeamTab from "@/features/client/tabs/TeamTab";

export default function SupportTeamPage() {
  const { clients, activeClient, setActiveClientId, loading } = useClientContext();

  if (loading) return <p className="p-6 text-muted-foreground">Loading support team…</p>;
  if (!activeClient) return <p className="p-6 text-muted-foreground">Add a learner in Behavior Zone first.</p>;

  return (
    <div className="h-full overflow-y-auto bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">BXR+</p>
            <h1 className="text-3xl font-bold">Support Team</h1>
          </div>
          {clients.length > 1 && (
            <select
              value={activeClient.id}
              onChange={(event) => setActiveClientId(event.target.value)}
              className="h-10 rounded-lg border bg-background px-3"
              aria-label="Select learner"
            >
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.full_name}</option>
              ))}
            </select>
          )}
        </div>
        <TeamTab clientId={activeClient.id} isOwner={activeClient.isOwner} />
      </div>
    </div>
  );
}
