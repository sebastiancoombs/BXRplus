import Stripe from "https://esm.sh/stripe@17.4.0?target=denonext";

const secret = Deno.env.get("STRIPE_SECRET_KEY");
if (!secret) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(secret, {
  apiVersion: "2024-11-20.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

export const PRICE_MONTHLY = Deno.env.get("STRIPE_PRICE_MONTHLY") ?? "";
export const PRICE_YEARLY = Deno.env.get("STRIPE_PRICE_YEARLY") ?? "";
export const APP_URL = Deno.env.get("APP_URL") ?? "https://bxrplus.app";
