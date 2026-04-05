import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { Client, AppRole } from "@/types/database";

interface ClientWithMeta extends Client {
  isOwner: boolean;
  myRole: AppRole | null; // from client_staff, null if owner-only
}

interface ClientState {
  clients: ClientWithMeta[];
  activeClient: ClientWithMeta | null;
  setActiveClientId: (id: string) => void;
  loading: boolean;
  refresh: () => Promise<void>;
  createClient: (name: string, dob?: string) => Promise<void>;
}

const ClientContext = createContext<ClientState | null>(null);

export function ClientProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientWithMeta[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchClients = useCallback(async () => {
    if (!user) { setClients([]); setLoading(false); return; }
    setLoading(true);

    // Get all clients I can see (owned + shared via client_staff)
    const { data: allClients } = await supabase
      .from("clients")
      .select("*")
      .order("full_name");

    // Get my staff relationships
    const { data: myStaff } = await supabase
      .from("client_staff")
      .select("client_id, relationship")
      .eq("user_id", user.id);

    const staffMap = new Map<string, AppRole>();
    (myStaff ?? []).forEach((s: any) => staffMap.set(s.client_id, s.relationship));

    const list: ClientWithMeta[] = (allClients ?? []).map((c: any) => ({
      ...c,
      isOwner: c.owner_id === user.id,
      myRole: staffMap.get(c.id) ?? null,
    }));

    setClients(list);
    setActiveId((prev) => {
      if (prev && list.find((c) => c.id === prev)) return prev;
      return list[0]?.id ?? null;
    });
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const createClient = async (name: string, dob?: string) => {
    if (!user) return;
    await supabase.from("clients").insert({
      full_name: name,
      date_of_birth: dob || null,
      avatar_url: null,
      owner_id: user.id,
    });
    await fetchClients();
  };

  const activeClient = clients.find((c) => c.id === activeId) ?? null;

  return (
    <ClientContext.Provider value={{
      clients, activeClient, setActiveClientId: setActiveId,
      loading, refresh: fetchClients, createClient,
    }}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClientContext() {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error("useClientContext must be inside ClientProvider");
  return ctx;
}
