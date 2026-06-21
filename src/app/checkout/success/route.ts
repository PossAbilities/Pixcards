import { NextRequest, NextResponse } from "next/server";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { appUrl } from "@/lib/constants";
import { fulfillCheckout } from "@/lib/fulfill";

/**
 * Stripe redirects here after Checkout. We verify the session, fulfil the
 * purchase, then redirect. (The webhook is the backup if this redirect is
 * missed — fulfilment is idempotent.)
 */
export async function GET(req: NextRequest) {
  const sessionId = new URL(req.url).searchParams.get("session_id");
  if (!sessionId || !stripeEnabled || !stripe) {
    return NextResponse.redirect(`${appUrl()}/dashboard`);
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === "paid") {
      await fulfillCheckout(session.metadata);
      if (session.metadata?.kind === "order") {
        return NextResponse.redirect(`${appUrl()}/dashboard/orders?success=1`);
      }
      if (session.metadata?.kind === "pro") {
        return NextResponse.redirect(`${appUrl()}/dashboard?upgraded=1`);
      }
    }
  } catch {
    // fall through
  }
  return NextResponse.redirect(`${appUrl()}/dashboard`);
}
