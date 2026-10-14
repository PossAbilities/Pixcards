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

/**
 * Demo mode is for local testing only. In production a missing Stripe key must
 * stop checkout, not hand out orders and upgrades for free.
 */
export const paymentsUnavailable =
  !stripeEnabled && process.env.NODE_ENV === "production";

export const PAYMENTS_UNAVAILABLE =
  "Payments aren't available right now, so nothing has been charged. Please try again later.";
