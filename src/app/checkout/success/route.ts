import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { appUrl } from "@/lib/constants";

/**
 * Stripe redirects here after a successful Checkout. We verify the session,
 * fulfil the purchase (mark order paid / grant Pro), then redirect the user.
 */
export async function GET(req: NextRequest) {
  const sessionId = new URL(req.url).searchParams.get("session_id");
  if (!sessionId || !stripeEnabled || !stripe) {
    return NextResponse.redirect(`${appUrl()}/dashboard`);
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === "paid") {
      const kind = session.metadata?.kind;
      if (kind === "order" && session.metadata?.orderId) {
        await prisma.order.update({
          where: { id: session.metadata.orderId },
          data: { status: "PAID" },
        });
        return NextResponse.redirect(`${appUrl()}/dashboard/orders?success=1`);
      }
      if (kind === "pro" && session.metadata?.userId) {
        await prisma.user.update({
          where: { id: session.metadata.userId },
          data: { plan: "PRO", proSince: new Date() },
        });
        return NextResponse.redirect(`${appUrl()}/dashboard?upgraded=1`);
      }
    }
  } catch {
    // fall through
  }
  return NextResponse.redirect(`${appUrl()}/dashboard`);
}
