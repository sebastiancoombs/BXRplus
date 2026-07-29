import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { Subscription } from "@/types/database";

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();
    setSubscription(data ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const isComped =
    !!subscription?.comped_until &&
    new Date(subscription.comped_until) > new Date();

  const isPro =
    isComped ||
    subscription?.status === "active" ||
    subscription?.status === "trialing";

  return { subscription, loading, refresh: fetch, isPro, isComped };
}
