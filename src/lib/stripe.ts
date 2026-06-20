import "server-only";
import Stripe from "stripe";

/**
 * Stripe is optional. When STRIPE_SECRET_KEY is not set the app runs in
 * "demo mode": checkout endpoints simulate a successful payment so the full
 * flow is testable without live keys.
 */
export const stripeEnabled = Boolean(process.env.STRIPE_SECRET_KEY);

export const stripe: Stripe | null = stripeEnabled
  ? new Stripe(process.env.STRIPE_SECRET_KEY as string)
  : null;
