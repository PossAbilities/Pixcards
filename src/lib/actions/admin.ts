"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { ORDER_STATUSES } from "@/lib/constants";
import { generateCardCode } from "@/lib/cards";
import { sendOrderShipped } from "@/lib/email/dispatch";
import { recordEvent } from "@/lib/events";
import type { OrderStatus, Plan, Role } from "@prisma/client";

async function requireAdminUser() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") throw new Error("Forbidden");
  return user;
}

export type AdminResult = { ok: boolean; error?: string };

export async function updateOrderStatus(
  orderId: string,
  status: string,
  trackingNumber?: string,
): Promise<AdminResult> {
  await requireAdminUser();
  if (!ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number])) {
    return { ok: false, error: "Invalid status" };
  }
  const prev = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true },
  });
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: status as OrderStatus,
      ...(trackingNumber !== undefined ? { trackingNumber } : {}),
    },
  });
  // Email the customer the first time an order is marked shipped.
  if (status === "SHIPPED" && prev?.status !== "SHIPPED") {
    await sendOrderShipped(orderId);
  }
  if (prev && prev.status !== status) {
    await recordEvent({
      type: "ORDER_STATUS",
      title: `Order ${orderId.slice(-8).toUpperCase()} → ${status}`,
      meta: { orderId, from: prev.status, to: status },
    });
  }
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  revalidatePath("/dashboard/orders");
  return { ok: true };
}

/**
 * Delete an order. Also removes its un-encoded cards (so a team/test order
 * can be cleanly re-placed); any already-encoded cards are kept but unlinked.
 */
export async function deleteOrder(orderId: string): Promise<AdminResult> {
  await requireAdminUser();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { cards: true },
  });
  if (!order) return { ok: false, error: "Order not found." };

  await prisma.card.deleteMany({
    where: { orderId, encoded: false },
  });
  await prisma.order.delete({ where: { id: orderId } });

  await recordEvent({
    type: "ORDER_STATUS",
    title: `Order ${orderId.slice(-8).toUpperCase()} deleted`,
    meta: { orderId, cards: order.cards.length },
  });
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  revalidatePath("/dashboard/orders");
  return { ok: true };
}

export async function setUserPlan(
  userId: string,
  plan: Plan,
): Promise<AdminResult> {
  await requireAdminUser();
  await prisma.user.update({
    where: { id: userId },
    data: {
      plan,
      proSince: plan === "PRO" ? new Date() : null,
    },
  });
  revalidatePath("/admin/users");
  return { ok: true };
}

/** Manually grant Pro. durationDays = null → lifetime; complimentary → free grant. */
export async function grantPro(
  userId: string,
  durationDays: number | null,
  complimentary: boolean,
): Promise<AdminResult> {
  await requireAdminUser();
  const proUntil =
    durationDays && durationDays > 0
      ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
      : null;
  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: "PRO",
      proSince: new Date(),
      proUntil,
      proComplimentary: complimentary,
    },
  });
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function revokePro(userId: string): Promise<AdminResult> {
  await requireAdminUser();
  await prisma.user.update({
    where: { id: userId },
    data: { plan: "FREE", proUntil: null, proComplimentary: false },
  });
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setUserRole(
  userId: string,
  role: Role,
): Promise<AdminResult> {
  const admin = await requireAdminUser();
  if (admin.id === userId && role !== "ADMIN") {
    return { ok: false, error: "You cannot remove your own admin access." };
  }
  await prisma.user.update({ where: { id: userId }, data: { role } });
  await recordEvent({
    type: "SECURITY",
    severity: "warning",
    title: `Role changed to ${role}`,
    message: `by admin ${admin.email}`,
    meta: { userId, role, byAdmin: admin.id },
  });
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function deleteUser(userId: string): Promise<AdminResult> {
  const admin = await requireAdminUser();
  if (admin.id === userId) {
    return { ok: false, error: "You cannot delete your own account." };
  }
  await prisma.user.delete({ where: { id: userId } });
  await recordEvent({
    type: "SECURITY",
    severity: "warning",
    title: "User account deleted",
    message: `by admin ${admin.email}`,
    meta: { userId, byAdmin: admin.id },
  });
  revalidatePath("/admin/users");
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/*  NFC cards                                                          */
/* ------------------------------------------------------------------ */

/** Create `count` cards with guaranteed-unique codes. */
async function createUniqueCards(
  count: number,
  data: { userId?: string; orderId?: string; material?: string },
): Promise<number> {
  let made = 0;
  for (let i = 0; i < count; i++) {
    // Retry on the (extremely unlikely) code collision.
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        await prisma.card.create({
          data: {
            code: generateCardCode(),
            userId: data.userId ?? null,
            orderId: data.orderId ?? null,
            material: data.material ?? "",
            claimedAt: data.userId ? new Date() : null,
          },
        });
        made++;
        break;
      } catch {
        // unique constraint hit — try a fresh code
      }
    }
  }
  return made;
}

/**
 * Generate the NFC card(s) for an order. They are pre-assigned to the order's
 * customer so a tap immediately opens their profile (no claim step needed).
 */
export async function generateCardsForOrder(
  orderId: string,
  count: number,
): Promise<AdminResult> {
  await requireAdminUser();
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, error: "Order not found." };

  const n = Math.max(1, Math.min(50, Math.floor(count)));
  const made = await createUniqueCards(n, {
    userId: order.userId,
    orderId: order.id,
    material: order.material,
  });
  if (!made) return { ok: false, error: "Could not generate cards." };

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/cards");
  return { ok: true };
}

/** Generate blank stock cards (unassigned — customers self-activate). */
export async function generateBlankCards(count: number): Promise<AdminResult> {
  await requireAdminUser();
  const n = Math.max(1, Math.min(200, Math.floor(count)));
  const made = await createUniqueCards(n, {});
  if (!made) return { ok: false, error: "Could not generate cards." };
  revalidatePath("/admin/cards");
  return { ok: true };
}

export async function setCardEncoded(
  cardId: string,
  encoded: boolean,
): Promise<AdminResult> {
  await requireAdminUser();
  await prisma.card.update({ where: { id: cardId }, data: { encoded } });
  revalidatePath("/admin/cards");
  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (card?.orderId) revalidatePath(`/admin/orders/${card.orderId}`);
  return { ok: true };
}

export async function adminDeleteCard(cardId: string): Promise<AdminResult> {
  await requireAdminUser();
  const card = await prisma.card.findUnique({ where: { id: cardId } });
  await prisma.card.delete({ where: { id: cardId } });
  revalidatePath("/admin/cards");
  if (card?.orderId) revalidatePath(`/admin/orders/${card.orderId}`);
  return { ok: true };
}
