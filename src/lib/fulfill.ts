import "server-only";
import { prisma } from "./db";
import { recordRedemption } from "./discounts";

type Meta = Record<string, string | null | undefined> | null | undefined;

/**
 * Fulfil a paid Stripe Checkout from its metadata. Idempotent — safe to run
 * from both the success redirect and the webhook (whichever lands first).
 */
export async function fulfillCheckout(meta: Meta): Promise<void> {
  if (!meta) return;
  const kind = meta.kind;
  const codeId = meta.discountCodeId || undefined;
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
    return;
  }

  if (kind === "pro" && meta.userId) {
    await prisma.user.update({
      where: { id: meta.userId },
      data: { plan: "PRO", proSince: new Date(), proUntil: null },
    });
    if (codeId) await recordRedemption(codeId, meta.userId, "pro", amountOff);
  }
}
