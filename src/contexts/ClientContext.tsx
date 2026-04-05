import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { Client, AppRole } from "@/types/database";

interface ClientWithRole extends Client {
  myRole: AppRole | null; // user's relationship to this client
}

interface ClientState {
  clients: ClientWithRole[];
  activeClient: ClientWithRole | null;
  setActiveClientId: (id: string) => void;
  loading: boolean;
  refresh: () => Promise<void>;
}

const ClientContext = createContext<ClientState | null>(null);

export function ClientProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientWithRole[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setClients([]); setLoading(false); return; }
    setLoading(true);

    // Get all client_staff rows for this user, with the client data
    const { data: staffRows } = await supabase
      .from("client_staff")
      .select("client_id, relationship, client:clients(*)")
      .eq("user_id", user.id);

    const list: ClientWithRole[] = (staffRows ?? [])
      .filter((r: any) => r.client)
      .map((r: any) => ({
        ...r.client,
        myRole: r.relationship as AppRole,
      }))
      .sort((a: ClientWithRole, b: ClientWithRole) => a.full_name.localeCompare(b.full_name));

    setClients(list);
    setActiveId((prev) => {
      if (prev && list.find((c) => c.id === prev)) return prev;
      return list[0]?.id ?? null;
    });
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const activeClient = clients.find((c) => c.id === activeId) ?? null;

  return (
    <ClientContext.Provider
      value={{
        clients,
        activeClient,
        setActiveClientId: setActiveId,
        loading,
        refresh: fetch,
      }}
    >
      {children}
    </ClientContext.Provider>
  );
}

export function useClientContext() {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error("useClientContext must be inside ClientProvider");
  return ctx;
}
