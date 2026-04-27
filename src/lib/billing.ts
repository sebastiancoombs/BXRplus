import { supabase } from "@/lib/supabase";

export type CheckoutPlan = "monthly" | "yearly";

export class BillingNotReadyError extends Error {
  constructor() {
    super("billing_not_ready");
    this.name = "BillingNotReadyError";
  }
}

async function callFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    // Edge function not deployed yet (or Stripe price IDs not configured).
    // Surface a typed error so callers can show a friendly "coming soon" UI.
    const message = error.message ?? "";
    const looksUnconfigured =
      /Function not found|not_configured|FunctionsHttpError|404/i.test(message);
    if (looksUnconfigured) throw new BillingNotReadyError();
    throw error;
  }
  if (data?.error) {
    if (data.error === "stripe price not configured") throw new BillingNotReadyError();
    throw new Error(data.error);
  }
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
