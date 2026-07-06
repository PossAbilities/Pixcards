"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { ORDER_STATUSES } from "@/lib/constants";
import { generateCardCode } from "@/lib/cards";
import { sendOrderShipped } from "@/lib/email/dispatch";
import { recordEvent } from "@/lib/events";
import { PRESET_PROFILE_THEME } from "@/lib/card-preset-meta";
import { presetSpec } from "@/lib/preset-cards";
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
  try {
    await requireAdminUser();
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { cards: true },
    });
    if (!order) return { ok: false, error: "Order not found." };

    await prisma.card.deleteMany({ where: { orderId, encoded: false } });
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
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not delete the order." };
  }
}

/** Delete all of a user's card orders and the NFC cards linked to them. */
export async function clearUserCardsAndOrders(userId: string): Promise<AdminResult> {
  try {
    await requireAdminUser();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });
    if (!user) return { ok: false, error: "User not found." };

    // Unlink the user's cards from any orders first, then delete both —
    // avoids FK issues and works even on shared/team orders.
    await prisma.card.deleteMany({ where: { userId } });
    const orders = await prisma.order.deleteMany({ where: { userId } });

    await recordEvent({
      type: "SECURITY",
      title: `Cleared ${orders.count} order(s) + cards for ${user.email}`,
      meta: { userId, orders: orders.count },
    });
    revalidatePath("/admin/orders");
    revalidatePath("/admin/cards");
    revalidatePath("/admin/users");
    revalidatePath("/dashboard/orders");
    revalidatePath("/dashboard/cards");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not clear cards & orders." };
  }
}

/**
 * Attach (or clear) a starting card template on a user: sets their profile
 * theme to match, and — if they haven't customised a design yet — seeds an
 * editable copy of the template's design so they have something to tweak in
 * their own card designer rather than a blank canvas.
 */
export async function setUserCardPreset(
  userId: string,
  preset: string | null,
): Promise<AdminResult> {
  try {
    await requireAdminUser();
    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) return { ok: false, error: "That user has no profile yet." };
    const t = preset ? PRESET_PROFILE_THEME[preset] : null;
    const data: Record<string, unknown> = { cardPreset: preset || null };
    if (t) {
      data.theme = t.theme;
      data.template = t.template;
      data.brandHeader = t.brandHeader;
      data.accentColor = t.accentColor;
      data.panelColor = t.panelColor;
    }
    // Seed the preset's editable starting design when the user has none yet,
    // or when switching them to a *different* preset — but never overwrite a
    // design they've customised themselves (cardPreset === "custom").
    const switching = preset && profile.cardPreset !== preset;
    const customised = profile.cardPreset === "custom";
    if (t && preset && !customised && (!profile.cardDesign || switching)) {
      data.cardDesign = JSON.stringify(await presetSpec(preset));
    }
    await prisma.profile.update({ where: { userId }, data });
    await recordEvent({
      type: "SECURITY",
      title: `Card preset ${preset ? `"${preset}" attached to` : "cleared from"} a user`,
      meta: { userId, preset },
    });
    revalidatePath("/admin/users");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/order");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not update card template." };
  }
}

/**
 * Set up a new organisation for a user and make them its owner. Org creation
 * is sales-assisted rather than self-serve — a user gets in touch, and we
 * create it here.
 */
export async function adminCreateOrganisation(
  userId: string,
  name: string,
): Promise<AdminResult> {
  try {
    await requireAdminUser();
    const clean = name.trim().slice(0, 80);
    if (!clean) return { ok: false, error: "Enter an organisation name." };

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { ok: false, error: "User not found." };

    const existing = await prisma.orgMember.findUnique({ where: { userId } });
    if (existing) return { ok: false, error: "This user is already part of an organisation." };

    await prisma.organisation.create({
      data: {
        name: clean,
        company: clean,
        members: { create: { userId, role: "OWNER" } },
      },
    });
    await recordEvent({
      type: "SECURITY",
      title: `Organisation "${clean}" created for ${user.email}`,
      meta: { userId },
    });
    revalidatePath("/admin/users");
    revalidatePath("/dashboard/org");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not create the organisation." };
  }
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
