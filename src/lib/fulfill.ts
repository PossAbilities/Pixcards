import "server-only";
import { prisma } from "./db";
import { recordRedemption } from "./discounts";
import { sendOrderReceipt, sendProWelcome } from "./email/dispatch";

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
      select: { userId: true, status: true },
    });
    if (!order) return;
    const firstTransition = order.status !== "PAID";
    await prisma.order.update({
      where: { id: meta.orderId },
      data: { status: "PAID" },
    });
    if (codeId) await recordRedemption(codeId, order.userId, "order", amountOff);
    if (firstTransition) await sendOrderReceipt(meta.orderId);
    return;
  }

  if (kind === "pro" && meta.userId) {
    const user = await prisma.user.findUnique({
      where: { id: meta.userId },
      select: { plan: true },
    });
    if (!user) return;
    const firstTransition = user.plan !== "PRO";
    await prisma.user.update({
      where: { id: meta.userId },
      data: { plan: "PRO", proSince: new Date(), proUntil: null },
    });
    if (codeId) await recordRedemption(codeId, meta.userId, "pro", amountOff);
    if (firstTransition) await sendProWelcome(meta.userId);
  }
}
