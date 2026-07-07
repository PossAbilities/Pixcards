import "server-only";
import { prisma } from "./db";
import { recordRedemption } from "./discounts";
import { sendOrderReceipt, sendProWelcome } from "./email/dispatch";
import { recordEvent } from "./events";

type Meta = Record<string, string | null | undefined> | null | undefined;

/**
 * Fulfil a paid Stripe Checkout from its metadata. Idempotent — safe to run
 * from both the success redirect and the webhook (whichever lands first).
 * Receipts only fire on the first PAID/PRO transition so the double-call
 * doesn't double-email.
 */
export async function fulfillCheckout(meta: Meta): Promise<void> {
  if (!meta) return;
  const kind = meta.kind;
  const codeId = meta.discountCodeId || undefined;
  const amountOff = meta.discountAmount ? Number(meta.discountAmount) : 0;

  if (kind === "order" && meta.orderId) {
    const order = await prisma.order.findUnique({
      where: { id: meta.orderId },
      select: { userId: true },
    });
    if (!order) return;
    // Atomic first-transition: only the write that actually flips PENDING→PAID
    // returns count 1, so the redemption is recorded exactly once even if the
    // webhook and the success redirect both fire.
    const res = await prisma.order.updateMany({
      where: { id: meta.orderId, status: { not: "PAID" } },
      data: { status: "PAID" },
    });
    if (res.count === 1) {
      if (codeId) await recordRedemption(codeId, order.userId, "order", amountOff);
      await recordEvent({
        type: "ORDER_PAID",
        title: "Card order paid",
        meta: { orderId: meta.orderId, userId: order.userId },
      });
      await sendOrderReceipt(meta.orderId);
    }
    return;
  }

  if (kind === "pro" && meta.userId) {
    const res = await prisma.user.updateMany({
      where: { id: meta.userId, plan: { not: "PRO" } },
      data: { plan: "PRO", proSince: new Date(), proUntil: null },
    });
    if (res.count === 1) {
      if (codeId) await recordRedemption(codeId, meta.userId, "pro", amountOff);
      await recordEvent({
        type: "PRO_UPGRADE",
        title: "User upgraded to Pro",
        meta: { userId: meta.userId },
      });
      await sendProWelcome(meta.userId);
    }
  }
}
