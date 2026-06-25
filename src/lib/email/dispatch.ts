import "server-only";
import { prisma } from "@/lib/db";
import { appUrl, material } from "@/lib/constants";
import { sendEmail } from "./send";
import {
  welcomeEmail,
  orderReceiptEmail,
  proWelcomeEmail,
  orderShippedEmail,
  passwordResetEmail,
  orgInviteEmail,
} from "./templates";

export async function sendOrgInvite(
  email: string,
  orgName: string,
  joinUrl: string,
): Promise<void> {
  try {
    const built = orgInviteEmail({ orgName, joinUrl });
    await sendEmail({ to: email, ...built, type: "OTHER" });
  } catch (e) {
    console.error("sendOrgInvite failed", e);
  }
}

export async function sendPasswordReset(
  email: string,
  name: string,
  resetUrl: string,
  userId?: string,
): Promise<void> {
  try {
    const built = passwordResetEmail({ name, resetUrl });
    await sendEmail({ to: email, ...built, type: "PASSWORD_RESET", userId });
  } catch (e) {
    console.error("sendPasswordReset failed", e);
  }
}

/**
 * High-level "notify" helpers. Each loads what it needs and sends. They never
 * throw — a failed email must not break registration, checkout or fulfilment.
 */

export async function sendWelcomeEmail(userId: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user?.profile) return;
    const built = welcomeEmail({
      name: user.name,
      shareUrl: `${appUrl()}/u/${user.profile.username}`,
      dashboardUrl: `${appUrl()}/dashboard`,
    });
    await sendEmail({ to: user.email, ...built, type: "WELCOME", userId: user.id });
  } catch (e) {
    console.error("sendWelcomeEmail failed", e);
  }
}

export async function sendOrderReceipt(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });
    if (!order) return;
    const mat = material(order.material);
    const listPrice = mat.priceCents * order.quantity;
    const discountCents = Math.max(0, listPrice - order.priceCents);
    const built = orderReceiptEmail({
      name: order.user.name,
      orderShortId: order.id.slice(-8).toUpperCase(),
      materialName: mat.name,
      quantity: order.quantity,
      unitPriceCents: mat.priceCents,
      discountCents: discountCents || undefined,
      totalCents: order.priceCents,
      shipLines: [
        order.shipName,
        order.shipAddress,
        [order.shipCity, order.shipPostal].filter(Boolean).join(", "),
        order.shipCountry,
      ],
      orderUrl: `${appUrl()}/dashboard/orders`,
    });
    await sendEmail({
      to: order.user.email,
      ...built,
      type: "ORDER_RECEIPT",
      userId: order.userId,
    });
  } catch (e) {
    console.error("sendOrderReceipt failed", e);
  }
}

export async function sendProWelcome(
  userId: string,
  amountPaidCents?: number,
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;
    const built = proWelcomeEmail({
      name: user.name,
      amountPaidCents,
      dashboardUrl: `${appUrl()}/dashboard`,
    });
    await sendEmail({ to: user.email, ...built, type: "PRO_WELCOME", userId: user.id });
  } catch (e) {
    console.error("sendProWelcome failed", e);
  }
}

export async function sendOrderShipped(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });
    if (!order) return;
    const built = orderShippedEmail({
      name: order.user.name,
      orderShortId: order.id.slice(-8).toUpperCase(),
      trackingNumber: order.trackingNumber ?? undefined,
      orderUrl: `${appUrl()}/dashboard/orders`,
    });
    await sendEmail({
      to: order.user.email,
      ...built,
      type: "ORDER_SHIPPED",
      userId: order.userId,
    });
  } catch (e) {
    console.error("sendOrderShipped failed", e);
  }
}
