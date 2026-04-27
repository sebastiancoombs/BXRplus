import { supabase } from "@/lib/supabase";

export type CheckoutPlan = "monthly" | "yearly";

async function callFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export async function startCheckout(plan: CheckoutPlan) {
  const { url } = await callFunction<{ url: string }>(
    "create-checkout-session",
    { plan }
  );
  if (!url) throw new Error("Stripe did not return a checkout URL");
  window.location.href = url;
}

export async function openCustomerPortal() {
  const { url } = await callFunction<{ url: string }>(
    "create-portal-session",
    {}
  );
  if (!url) throw new Error("Stripe did not return a portal URL");
  window.location.href = url;
}
