import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { Client } from "@/types/database";

interface ClientState {
  clients: Client[];
  activeClient: Client | null;
  setActiveClientId: (id: string) => void;
  loading: boolean;
  refresh: () => Promise<void>;
}

const ClientContext = createContext<ClientState | null>(null);

export function ClientProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setClients([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.from("clients").select("*").order("full_name");
    const list = data ?? [];
    setClients(list);
    // Keep current selection if still valid, else pick first
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
