// Creates a Stripe Checkout session for the logged-in BCBA.
//
// Request body: { plan: "monthly" | "yearly" }
// Response: { url: string } — frontend window.location = url
//
// Reuses an existing stripe_customer_id if the caller already has one;
// otherwise lets Stripe create a new customer at checkout time and links
// it back via the webhook.

import { corsHeaders } from "../_shared/cors.ts";
import { stripe, PRICE_MONTHLY, PRICE_YEARLY, APP_URL } from "../_shared/stripe.ts";
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

    const { plan } = await req.json();
    const priceId = plan === "yearly" ? PRICE_YEARLY : PRICE_MONTHLY;
    if (!priceId) {
      return json({ error: "stripe price not configured" }, 500);
    }

    const admin = serviceClient();
    const { data: sub } = await admin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("owner_id", user.id)
      .maybeSingle();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer: sub?.stripe_customer_id ?? undefined,
      customer_email: sub?.stripe_customer_id ? undefined : user.email,
      client_reference_id: user.id,
      allow_promotion_codes: true,
      success_url: `${APP_URL}/billing?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/pricing?status=canceled`,
      subscription_data: {
        metadata: { owner_id: user.id },
      },
      metadata: { owner_id: user.id },
    });

    return json({ url: session.url });
  } catch (err) {
    console.error("create-checkout-session error", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
