"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { material, appUrl, PRO_PRICE_CENTS, APP_NAME } from "@/lib/constants";
import { validateDiscount, recordRedemption } from "@/lib/discounts";
import { sendOrderReceipt, sendProWelcome } from "@/lib/email/dispatch";
import { recordEvent } from "@/lib/events";
import { renderPerspectiveSide, type PerspectiveDetails } from "@/lib/preset-cards";

const presetOrderSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(50).default(1),
  shipName: z.string().min(1, "Enter a delivery name").max(80),
  shipAddress: z.string().min(1, "Enter a delivery address").max(160),
  shipCity: z.string().min(1, "Enter a city").max(80),
  shipPostal: z.string().min(1, "Enter a postcode").max(20),
  shipCountry: z.string().min(1).max(60).default("United Kingdom"),
});

function bareUrl(u: string): string {
  return u.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/** Remember the user's chosen card preset (or clear it). */
export async function saveCardPreset(preset: string | null): Promise<{ ok: boolean }> {
  const user = await getSessionUser();
  if (!user) return { ok: false };
  await prisma.profile.updateMany({
    where: { userId: user.id },
    data: { cardPreset: preset || null },
  });
  return { ok: true };
}

/**
 * Order the user's saved "Perspective Studio" card preset: bakes both sides
 * server-side from their profile, then runs the normal card checkout.
 */
export async function orderPresetCard(
  formData: FormData,
): Promise<{ error: string } | void> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const parsed = presetOrderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid order" };
  }
  const d = parsed.data;

  const profile = await prisma.profile.findUnique({
    where: { userId: user!.id },
    include: { links: { where: { platform: "website" }, take: 1 } },
  });
  if (!profile) return { error: "Profile not found." };

  const profileUrl = profile.username ? `${appUrl()}/u/${profile.username}` : appUrl();
  const details: PerspectiveDetails = {
    name: user!.name || "Your Name",
    role: profile.jobTitle || "",
    email: profile.email || user!.email,
    phone: profile.phone || "",
    website: profile.links[0]?.url ? bareUrl(profile.links[0].url) : "perspectivestudio.co.uk",
    profileUrl,
  };

  const [front, back] = await Promise.all([
    renderPerspectiveSide("front", details),
    renderPerspectiveSide("back", details),
  ]);
  const toDataUrl = (b: Buffer) => `data:image/png;base64,${b.toString("base64")}`;
  const design = JSON.stringify({
    frontImage: toDataUrl(front),
    backImage: toDataUrl(back),
    spec: { cardName: `${user!.name} — Perspective Studio`, preset: "perspective" },
  });

  const mat = material("white-gloss");
  const priceCents = mat.priceCents * d.quantity;

  const order = await prisma.order.create({
    data: {
      userId: user!.id,
      material: "white-gloss",
      cardName: `${user!.name} — Perspective Studio`,
      quantity: d.quantity,
      priceCents,
      design,
      status: "PENDING",
      shipName: d.shipName,
      shipAddress: d.shipAddress,
      shipCity: d.shipCity,
      shipPostal: d.shipPostal,
      shipCountry: d.shipCountry,
    },
  });
  await prisma.profile.updateMany({ where: { userId: user!.id }, data: { cardPreset: "perspective" } });
  await recordEvent({
    type: "ORDER_PLACED",
    title: `Preset card order from ${user!.name}`,
    meta: { orderId: order.id, preset: "perspective" },
  });

  if (stripeEnabled && stripe && priceCents > 0) {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user!.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: priceCents,
            product_data: {
              name: `${APP_NAME} — ${mat.name} (x${d.quantity})`,
              description: `Perspective Studio card for ${user!.email}`,
            },
          },
        },
      ],
      metadata: { kind: "order", orderId: order.id },
      success_url: `${appUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl()}/dashboard/order?cancelled=1`,
    });
    await prisma.order.update({ where: { id: order.id }, data: { stripeSessionId: session.id } });
    redirect(session.url as string);
  }

  await prisma.order.update({ where: { id: order.id }, data: { status: "PAID" } });
  redirect(`/dashboard/orders`);
}

const orderSchema = z.object({
  material: z.string().min(1),
  cardName: z.string().min(1, "Enter the name for the card").max(60),
  quantity: z.coerce.number().int().min(1).max(50).default(1),
  design: z.string().default("{}"),
  shipName: z.string().min(1, "Enter a delivery name").max(80),
  shipAddress: z.string().min(1, "Enter a delivery address").max(160),
  shipCity: z.string().min(1, "Enter a city").max(80),
  shipPostal: z.string().min(1, "Enter a postcode").max(20),
  shipCountry: z.string().min(1).max(60).default("United Kingdom"),
  discountCode: z.string().optional().default(""),
});

export async function createCardOrder(formData: FormData): Promise<{ error: string } | void> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const parsed = orderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid order" };
  }
  const d = parsed.data;
  const mat = material(d.material);
  let priceCents = mat.priceCents * d.quantity;

  // Optional discount code
  let redemption: { codeId: string; amountOffCents: number } | null = null;
  if (d.discountCode.trim()) {
    const res = await validateDiscount(d.discountCode, "CARD", priceCents, user.id);
    if (!res.valid) return { error: res.reason };
    priceCents = res.finalCents;
    redemption = { codeId: res.codeId, amountOffCents: res.amountOffCents };
  }

  const order = await prisma.order.create({
    data: {
      userId: user.id,
      material: d.material,
      cardName: d.cardName,
      quantity: d.quantity,
      priceCents,
      design: d.design,
      shipName: d.shipName,
      shipAddress: d.shipAddress,
      shipCity: d.shipCity,
      shipPostal: d.shipPostal,
      shipCountry: d.shipCountry,
      status: "PENDING",
    },
  });

  await recordEvent({
    type: "ORDER_PLACED",
    title: `New card order from ${user.name}`,
    message: `${d.quantity} × ${mat.name} — ${(priceCents / 100).toFixed(2)} GBP`,
    meta: { orderId: order.id, userId: user.id, email: user.email, quantity: d.quantity, priceCents },
  });

  if (stripeEnabled && stripe && priceCents > 0) {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: priceCents,
            product_data: {
              name: `${APP_NAME} — ${mat.name} (x${d.quantity})`,
              description: `NFC card linked to ${user.email}`,
            },
          },
        },
      ],
      metadata: {
        kind: "order",
        orderId: order.id,
        ...(redemption
          ? {
              discountCodeId: redemption.codeId,
              discountAmount: String(redemption.amountOffCents),
            }
          : {}),
      },
      success_url: `${appUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl()}/dashboard/order?cancelled=1`,
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id },
    });
    redirect(session.url as string);
  }

  // Demo mode (or fully discounted): simulate successful payment.
  await prisma.order.update({
    where: { id: order.id },
    data: { status: "PAID" },
  });
  if (redemption) {
    await recordRedemption(redemption.codeId, user.id, "order", redemption.amountOffCents);
  }
  await recordEvent({
    type: "ORDER_PAID",
    title: `Order paid by ${user.name}`,
    message: `${(priceCents / 100).toFixed(2)} GBP`,
    meta: { orderId: order.id, userId: user.id, priceCents },
  });
  await sendOrderReceipt(order.id);
  redirect("/dashboard/orders?success=1");
}

export async function upgradeToPro(
  formData?: FormData,
): Promise<{ error: string } | void> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.plan === "PRO") redirect("/dashboard?already=pro");

  let priceCents = PRO_PRICE_CENTS;
  let redemption: { codeId: string; amountOffCents: number } | null = null;

  const rawCode = (formData?.get("discountCode") as string | null)?.trim() ?? "";
  if (rawCode) {
    const res = await validateDiscount(rawCode, "PRO", PRO_PRICE_CENTS, user.id);
    if (!res.valid) return { error: res.reason };
    priceCents = res.finalCents;
    redemption = { codeId: res.codeId, amountOffCents: res.amountOffCents };
  }

  async function grant() {
    await prisma.user.update({
      where: { id: user!.id },
      data: { plan: "PRO", proSince: new Date(), proUntil: null },
    });
    if (redemption) {
      await recordRedemption(redemption.codeId, user!.id, "pro", redemption.amountOffCents);
    }
    await recordEvent({
      type: "PRO_UPGRADE",
      title: `${user!.name} upgraded to Pro`,
      meta: { userId: user!.id, email: user!.email, priceCents },
    });
    await sendProWelcome(user!.id);
  }

  // Free via a 100% code → grant immediately, no payment.
  if (priceCents <= 0) {
    await grant();
    redirect("/dashboard?upgraded=1");
  }

  if (stripeEnabled && stripe) {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: priceCents,
            product_data: {
              name: `${APP_NAME} Pro`,
              description: "Unlimited links, premium themes, analytics & custom branding.",
            },
          },
        },
      ],
      metadata: {
        kind: "pro",
        userId: user.id,
        ...(redemption
          ? {
              discountCodeId: redemption.codeId,
              discountAmount: String(redemption.amountOffCents),
            }
          : {}),
      },
      success_url: `${appUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl()}/pricing?cancelled=1`,
    });
    redirect(session.url as string);
  }

  // Demo mode.
  await grant();
  redirect("/dashboard?upgraded=1");
}
