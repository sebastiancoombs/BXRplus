import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Client, Behavior, Reward, Transaction } from "@/types/database";

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("clients").select("*").order("full_name");
    setClients(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { clients, loading, refresh: fetch };
}

export function useClientDetail(clientId: string | undefined) {
  const [client, setClient] = useState<Client | null>(null);
  const [behaviors, setBehaviors] = useState<Behavior[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);

    const [clientRes, behaviorRes, rewardRes, txnRes] = await Promise.all([
      supabase.from("clients").select("*").eq("id", clientId).single(),
      supabase.from("behaviors").select("*").eq("client_id", clientId).eq("is_active", true).order("name"),
      supabase.from("rewards").select("*").eq("client_id", clientId).eq("is_active", true).order("point_cost"),
      supabase
        .from("transactions")
        .select("*, behavior:behaviors(*), reward:rewards(*)")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    setClient(clientRes.data);
    setBehaviors(behaviorRes.data ?? []);
    setRewards(rewardRes.data ?? []);
    setTransactions(txnRes.data ?? []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetch(); }, [fetch]);
  return { client, behaviors, rewards, transactions, loading, refresh: fetch };
}

export function useClientByQR(qrCode: string | undefined) {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!qrCode) { setLoading(false); return; }
    supabase
      .from("clients")
      .select("*")
      .eq("qr_code", qrCode)
      .single()
      .then(({ data }) => {
        setClient(data);
        setLoading(false);
      });
  }, [qrCode]);

  return { client, loading };
}

export async function awardPoints(clientId: string, behaviorId: string, amount: number, note?: string) {
  const { data, error } = await supabase.rpc("award_points", {
    p_client_id: clientId,
    p_behavior_id: behaviorId,
    p_amount: amount,
    p_note: note ?? null,
  });
  if (error) throw error;
  return data;
}

export async function redeemReward(clientId: string, rewardId: string, note?: string) {
  const { data, error } = await supabase.rpc("redeem_reward", {
    p_client_id: clientId,
    p_reward_id: rewardId,
    p_note: note ?? null,
  });
  if (error) throw error;
  return data;
}
