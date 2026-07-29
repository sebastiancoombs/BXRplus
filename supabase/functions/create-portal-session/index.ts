// Creates a Stripe Customer Portal session so a paying BCBA can
// update payment method, cancel, switch plans, or download invoices —
// all on Stripe-hosted UI.
//
// Response: { url: string }

import { corsHeaders } from "../_shared/cors.ts";
import { stripe, APP_URL } from "../_shared/stripe.ts";
import { userClient, serviceClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supa = userClient(req);
    const { data: userData } = await supa.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return json({ error: "not authenticated" }, 401);
    }

    const admin = serviceClient();
    const { data: sub } = await admin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!sub?.stripe_customer_id) {
      return json({ error: "no Stripe customer for this user" }, 400);
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${APP_URL}/billing`,
    });

    return json({ url: session.url });
  } catch (err) {
    console.error("create-portal-session error", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
