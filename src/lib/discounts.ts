import "server-only";
import { prisma } from "./db";
import type { DiscountScope } from "@prisma/client";

export type DiscountResult =
  | { valid: false; reason: string }
  | {
      valid: true;
      codeId: string;
      code: string;
      amountOffCents: number;
      finalCents: number;
    };

/**
 * Validate a discount code for a given purchase. `scope` is the thing being
 * bought ("PRO" or "CARD"); a code with scope ALL matches both.
 */
export async function validateDiscount(
  rawCode: string,
  scope: Extract<DiscountScope, "PRO" | "CARD">,
  amountCents: number,
  userId: string,
): Promise<DiscountResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { valid: false, reason: "Enter a code." };

  const dc = await prisma.discountCode.findUnique({ where: { code } });
  if (!dc || !dc.active) {
    return { valid: false, reason: "That code isn't valid." };
  }
  if (dc.expiresAt && dc.expiresAt.getTime() < Date.now()) {
    return { valid: false, reason: "That code has expired." };
  }
  if (dc.maxRedemptions !== null && dc.timesRedeemed >= dc.maxRedemptions) {
    return { valid: false, reason: "That code has been fully redeemed." };
  }
  if (dc.scope !== "ALL" && dc.scope !== scope) {
    return {
      valid: false,
      reason:
        dc.scope === "PRO"
          ? "That code only applies to Pro upgrades."
          : "That code only applies to card orders.",
    };
  }
  const already = await prisma.discountRedemption.findUnique({
    where: { codeId_userId: { codeId: dc.id, userId } },
  });
  if (already) {
    return { valid: false, reason: "You've already used this code." };
  }

  const amountOff =
    dc.type === "PERCENT"
      ? Math.floor((amountCents * Math.min(100, dc.value)) / 100)
      : Math.min(dc.value, amountCents);
  const finalCents = Math.max(0, amountCents - amountOff);

  return {
    valid: true,
    codeId: dc.id,
    code: dc.code,
    amountOffCents: amountOff,
    finalCents,
  };
}

/** Record a redemption and bump the counter (idempotent on the unique pair). */
export async function recordRedemption(
  codeId: string,
  userId: string,
  context: "pro" | "order",
  amountOffCents: number,
): Promise<void> {
  try {
    await prisma.$transaction([
      prisma.discountRedemption.create({
        data: { codeId, userId, context, amountOffCents },
      }),
      prisma.discountCode.update({
        where: { id: codeId },
        data: { timesRedeemed: { increment: 1 } },
      }),
    ]);
  } catch {
    // unique constraint (already redeemed) — ignore
  }
}
