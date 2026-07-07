"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { material, appUrl, APP_NAME } from "@/lib/constants";
import { recordEvent } from "@/lib/events";
import { loadMyCard } from "@/lib/mycard";
import { renderTemplateSidePng } from "@/lib/card-artwork";
import { PRESET_PROFILE_THEME } from "@/lib/card-preset-meta";
import { presetSpec } from "@/lib/preset-cards";
import { validateDiscount, recordRedemption } from "@/lib/discounts";

export type ActionResult = { ok: boolean; error?: string };

/**
 * Apply the brand theme (header gradient, accent, panel colour, and the
 * "Brand" profile layout) that matches the saved card design. Editing the
 * card design itself never touches these profile fields, so this is the
 * one-click fix when the digital profile hasn't picked them up yet — no
 * admin step required.
 */
export async function applyMyCardBrandTheme(): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  if (!profile) return { ok: false, error: "Profile not found." };
  if (!profile.cardPreset) {
    return { ok: false, error: "You don't have a saved card design yet." };
  }
  // Apply the theme for the account's attached preset. "custom" designs
  // originated from a preset too, but we can't tell which — default to the
  // one non-generic brand a customiser most likely started from.
  const t =
    PRESET_PROFILE_THEME[profile.cardPreset ?? ""] ?? PRESET_PROFILE_THEME.perspective;
  await prisma.profile.update({
    where: { userId: user.id },
    data: {
      theme: t.theme,
      template: t.template,
      accentColor: t.accentColor,
      brandHeader: t.brandHeader,
      panelColor: t.panelColor,
    },
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/order");
  return { ok: true };
}

/**
 * Replace the user's saved design with a freshly-generated starting template.
 * The design saved at attach-time is a snapshot — layout fixes to the seed
 * (element positions, icon artwork) never reach it, so this is the
 * self-service way to pick those up. Discards any customisations.
 */
export async function resetMyCardDesign(): Promise<ActionResult & { spec?: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  if (!profile) return { ok: false, error: "Profile not found." };
  const preset = profile.cardPreset ?? "perspective";
  const spec = JSON.stringify(await presetSpec(preset));
  await prisma.profile.update({
    where: { userId: user.id },
    data: { cardDesign: spec, cardPreset: preset },
  });
  revalidatePath("/dashboard/order");
  revalidatePath("/dashboard");
  return { ok: true, spec };
}

/** Save the user's own front+back card design (JSON CardTemplateSpec). */
export async function updateMyCardDesign(specJson: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Not signed in." };
  if (typeof specJson !== "string" || specJson.length > 4_000_000) {
    return { ok: false, error: "That design is too large — try smaller images." };
  }
  try {
    const v = JSON.parse(specJson);
    if (!v || (!v.front && !v.back)) return { ok: false, error: "Invalid card design." };
  } catch {
    return { ok: false, error: "Invalid card design." };
  }
  await prisma.profile.updateMany({
    where: { userId: user.id },
    data: { cardDesign: specJson, cardPreset: "custom" },
  });
  revalidatePath("/dashboard/order");
  revalidatePath("/dashboard");
  return { ok: true };
}

const orderSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(50).default(1),
  shipName: z.string().min(1, "Enter a delivery name").max(80),
  shipAddress: z.string().min(1, "Enter a delivery address").max(160),
  shipCity: z.string().min(1, "Enter a city").max(80),
  shipPostal: z.string().min(1, "Enter a postcode").max(20),
  shipCountry: z.string().min(1).max(60).default("United Kingdom"),
  discountCode: z.string().max(40).optional().default(""),
});

/** Check a discount code against a card order (for the live "Apply" preview). */
export async function previewMyCardDiscount(
  code: string,
  quantity: number,
): Promise<
  | { ok: true; code: string; amountOffCents: number; finalCents: number }
  | { ok: false; error: string }
> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const qty = Math.min(50, Math.max(1, Math.floor(quantity) || 1));
  const priceCents = material("white-gloss").priceCents * qty;
  const res = await validateDiscount(code, "CARD", priceCents, user.id);
  if (!res.valid) return { ok: false, error: res.reason };
  return { ok: true, code: res.code, amountOffCents: res.amountOffCents, finalCents: res.finalCents };
}

/** Order the user's own card design: bakes both sides server-side, then runs the normal card checkout. */
export async function orderMyCard(formData: FormData): Promise<{ error: string } | void> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const parsed = orderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid order" };
  }
  const d = parsed.data;

  const card = await loadMyCard(user.id);
  if (!card) return { error: "Profile not found." };

  const [front, back] = await Promise.all([
    renderTemplateSidePng(card.spec.front, card.merge),
    renderTemplateSidePng(card.spec.back, card.merge),
  ]);
  const toDataUrl = (b: Buffer) => `data:image/png;base64,${b.toString("base64")}`;
  const design = JSON.stringify({
    frontImage: toDataUrl(front),
    backImage: toDataUrl(back),
    // Keep the editable design + merge data so print exports can re-render
    // at any resolution later instead of being stuck with the baked pixels.
    templateSpec: card.spec,
    merge: card.merge,
    spec: { cardName: `${user.name} — card` },
  });

  const mat = material("white-gloss");
  const fullPrice = mat.priceCents * d.quantity;

  // Optional discount code (validated; one use per user is enforced in
  // validateDiscount + the DB unique constraint).
  let priceCents = fullPrice;
  let redemption: { codeId: string; amountOffCents: number } | null = null;
  if (d.discountCode.trim()) {
    const res = await validateDiscount(d.discountCode, "CARD", fullPrice, user.id);
    if (!res.valid) return { error: res.reason };
    priceCents = res.finalCents;
    redemption = { codeId: res.codeId, amountOffCents: res.amountOffCents };
  }

  const order = await prisma.order.create({
    data: {
      userId: user.id,
      material: "white-gloss",
      cardName: `${user.name} — card`,
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
  await recordEvent({
    type: "ORDER_PLACED",
    title: `Card order from ${user.name}`,
    meta: { orderId: order.id },
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
              description: `Card for ${user.email}`,
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
    await prisma.order.update({ where: { id: order.id }, data: { stripeSessionId: session.id } });
    redirect(session.url as string);
  }

  // Demo mode or a 100%-off code — no payment step. Record the redemption
  // here (the Stripe webhook path records it for paid orders).
  if (redemption) {
    await recordRedemption(redemption.codeId, user.id, "order", redemption.amountOffCents);
  }
  await prisma.order.update({ where: { id: order.id }, data: { status: "PAID" } });
  redirect(`/dashboard/orders`);
}
