import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { fulfillCheckout } from "@/lib/fulfill";

/**
 * Stripe webhook — the reliable fulfilment path. Configure a webhook in the
 * Stripe dashboard pointing at /api/stripe/webhook for the
 * `checkout.session.completed` event, and set STRIPE_WEBHOOK_SECRET.
 */
export async function POST(req: NextRequest) {
  if (!stripeEnabled || !stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 400 });
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not set" }, { status: 400 });
  }
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === "paid") {
      await fulfillCheckout(session.metadata);
    }
  }

  return NextResponse.json({ received: true });
}
