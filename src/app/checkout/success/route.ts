import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { appUrl } from "@/lib/constants";
import { recordRedemption } from "@/lib/discounts";

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
      const meta = session.metadata ?? {};
      const kind = meta.kind;
      const codeId = meta.discountCodeId;
      const amountOff = meta.discountAmount ? Number(meta.discountAmount) : 0;

      if (kind === "order" && meta.orderId) {
        await prisma.order.update({
          where: { id: meta.orderId },
          data: { status: "PAID" },
        });
        if (codeId) {
          const order = await prisma.order.findUnique({
            where: { id: meta.orderId },
            select: { userId: true },
          });
          if (order) await recordRedemption(codeId, order.userId, "order", amountOff);
        }
        return NextResponse.redirect(`${appUrl()}/dashboard/orders?success=1`);
      }
      if (kind === "pro" && meta.userId) {
        await prisma.user.update({
          where: { id: meta.userId },
          data: { plan: "PRO", proSince: new Date(), proUntil: null },
        });
        if (codeId) await recordRedemption(codeId, meta.userId, "pro", amountOff);
        return NextResponse.redirect(`${appUrl()}/dashboard?upgraded=1`);
      }
    }
  } catch {
    // fall through
  }
  return NextResponse.redirect(`${appUrl()}/dashboard`);
}
