"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useShellAccess() {
  const [behaviorOnly, setBehaviorOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadAccess() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (active) setLoading(false);
        return;
      }

      const [{ data: ownedClients }, { data: staffRoles }] = await Promise.all([
        supabase.from("clients").select("id").eq("owner_id", user.id).limit(1),
        supabase.from("client_staff").select("relationship").eq("user_id", user.id),
      ]);

      const hasOwnedClient = (ownedClients?.length ?? 0) > 0;
      const hasRestrictedRole = (staffRoles ?? []).some(
        ({ relationship }) => relationship === "rbt" || relationship === "parent",
      );

      if (active) {
        setBehaviorOnly(!hasOwnedClient && hasRestrictedRole);
        setLoading(false);
      }
    }

    void loadAccess();
    return () => { active = false; };
  }, []);

  return { behaviorOnly, loading };
}
