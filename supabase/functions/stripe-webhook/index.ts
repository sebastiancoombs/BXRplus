// Stripe webhook handler — single source of truth for subscription state.
//
// Configure Stripe to POST to this function URL. The webhook signing
// secret must be set as STRIPE_WEBHOOK_SECRET on the function.
//
// Events handled:
//   checkout.session.completed       → upsert customer + initial subscription
//   customer.subscription.created    → reconcile
//   customer.subscription.updated    → reconcile
//   customer.subscription.deleted    → mark canceled
//   invoice.payment_failed           → mark past_due

import Stripe from "https://esm.sh/stripe@17.4.0?target=denonext";
import { stripe, PRICE_MONTHLY, PRICE_YEARLY } from "../_shared/stripe.ts";
import { serviceClient } from "../_shared/supabase.ts";

const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

function planFromPriceId(priceId: string | null | undefined): string {
  if (priceId && priceId === PRICE_YEARLY) return "pro_yearly";
  if (priceId && priceId === PRICE_MONTHLY) return "pro_monthly";
  return "pro_monthly";
}

async function reconcile(subscription: Stripe.Subscription) {
  const admin = serviceClient();
  const ownerId =
    (subscription.metadata?.owner_id as string | undefined) ?? null;

  if (!ownerId) {
    console.warn("subscription has no owner_id metadata", subscription.id);
    return;
  }

  const item = subscription.items.data[0];
  const priceId = item?.price?.id ?? null;

  await admin.from("subscriptions").upsert(
    {
      owner_id: ownerId,
      stripe_customer_id:
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      plan: planFromPriceId(priceId),
      current_period_end: new Date(
        subscription.current_period_end * 1000
      ).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "owner_id" }
  );
}

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("missing signature", { status: 400 });

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("invalid signature", err);
    return new Response(`invalid signature: ${(err as Error).message}`, {
      status: 400,
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subId = session.subscription as string | null;
        const ownerId =
          (session.metadata?.owner_id as string | undefined) ??
          (session.client_reference_id as string | undefined) ??
          null;

        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          // Make sure metadata.owner_id is set on the subscription itself
          // so future events can find the user.
          if (ownerId && !sub.metadata?.owner_id) {
            await stripe.subscriptions.update(subId, {
              metadata: { ...sub.metadata, owner_id: ownerId },
            });
            sub.metadata = { ...sub.metadata, owner_id: ownerId };
          }
          await reconcile(sub);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await reconcile(sub);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const admin = serviceClient();
        await admin
          .from("subscriptions")
          .update({
            status: "canceled",
            plan: "free",
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", sub.id);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string | null;
        if (subId) {
          const admin = serviceClient();
          await admin
            .from("subscriptions")
            .update({
              status: "past_due",
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", subId);
        }
        break;
      }

      default:
        // ignore everything else
        break;
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("webhook handler error", event.type, err);
    return new Response((err as Error).message, { status: 500 });
  }
});
