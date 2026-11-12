"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { CARD_MATERIALS, material } from "@/lib/constants";
import { loadMyCard } from "@/lib/mycard";
import { renderTemplateSidePng } from "@/lib/card-artwork";
import { presetUpdate } from "@/lib/preset-apply";
import { presetSpec, CARD_PRESETS } from "@/lib/preset-cards";
import { recordEvent } from "@/lib/events";
import { sendOrderReceipt } from "@/lib/email/dispatch";

/**
 * Admin tools for producing cards on someone's behalf: edit their card design,
 * and place an order straight into the print queue with no payment step.
 */

type Result = { ok: boolean; error?: string };

async function requireAdminUser() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") throw new Error("Forbidden");
  return user;
}

function refresh(userId: string) {
  revalidatePath(`/admin/users/${userId}/card`);
  revalidatePath("/admin/cards");
  revalidatePath("/admin/orders");
}

/** Save a user's front+back card design (same format the user's own designer saves). */
export async function adminSaveUserCardDesign(userId: string, specJson: string): Promise<Result> {
  try {
    await requireAdminUser();
    if (typeof specJson !== "string" || specJson.length > 4_000_000) {
      return { ok: false, error: "That design is too large — try smaller images." };
    }
    try {
      const v = JSON.parse(specJson);
      if (!v || (!v.front && !v.back)) return { ok: false, error: "Invalid card design." };
    } catch {
      return { ok: false, error: "Invalid card design." };
    }
    const res = await prisma.profile.updateMany({
      where: { userId },
      data: { cardDesign: specJson, cardPreset: "custom" },
    });
    if (res.count === 0) return { ok: false, error: "This user has no profile yet." };
    refresh(userId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save the design." };
  }
}

/** Put a user's card back to their starting template. */
export async function adminResetUserCardDesign(
  userId: string,
): Promise<Result & { spec?: string }> {
  try {
    await requireAdminUser();
    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) return { ok: false, error: "This user has no profile yet." };
    const preset =
      profile.cardPreset && profile.cardPreset !== "custom" ? profile.cardPreset : "perspective";
    const spec = JSON.stringify(await presetSpec(preset));
    await prisma.profile.update({ where: { userId }, data: { cardDesign: spec, cardPreset: preset } });
    refresh(userId);
    return { ok: true, spec };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not reset the design." };
  }
}

/** Switch a user's card (and matching profile colours) to a built-in template. */
export async function adminApplyCardTemplate(userId: string, preset: string): Promise<Result> {
  try {
    await requireAdminUser();
    if (!(CARD_PRESETS as readonly string[]).includes(preset)) {
      return { ok: false, error: "Unknown template." };
    }
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { cardPreset: true, cardDesign: true },
    });
    if (!profile) return { ok: false, error: "This user has no profile yet." };
    const data = await presetUpdate(profile, preset, { reseed: true });
    await prisma.profile.update({ where: { userId }, data });
    refresh(userId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not apply the template." };
  }
}

const orderSchema = z.object({
  userId: z.string().min(1, "Choose who the card is for."),
  material: z.string().refine((m) => CARD_MATERIALS.some((x) => x.id === m), "Choose a material."),
  quantity: z.coerce.number().int().min(1).max(500),
  // Pounds as typed by the admin; 0 = complimentary. For records only — no payment is taken.
  pricePounds: z.coerce.number().min(0).max(100000).default(0),
  handDelivered: z.boolean().default(true),
  shipName: z.string().trim().max(80).default(""),
  shipAddress: z.string().trim().max(160).default(""),
  shipCity: z.string().trim().max(80).default(""),
  shipPostal: z.string().trim().max(20).default(""),
  emailReceipt: z.boolean().default(false),
});

export type AdminOrderInput = z.input<typeof orderSchema>;

/**
 * Place a card order on someone's behalf, using their saved card design.
 * Goes straight to PAID (ready to print) — no checkout.
 */
export async function adminCreateCardOrder(
  input: AdminOrderInput,
): Promise<Result & { orderId?: string }> {
  try {
    const admin = await requireAdminUser();
    const parsed = orderSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the order details." };
    }
    const d = parsed.data;
    if (!d.handDelivered && (!d.shipAddress || !d.shipCity || !d.shipPostal)) {
      return { ok: false, error: "Enter the delivery address, or tick “Hand delivered / collected”." };
    }

    const user = await prisma.user.findUnique({
      where: { id: d.userId },
      select: { id: true, name: true, email: true },
    });
    if (!user) return { ok: false, error: "That user no longer exists." };

    const card = await loadMyCard(user.id);
    if (!card) return { ok: false, error: "This user has no profile yet, so there's no card design to print." };

    const [front, back] = await Promise.all([
      renderTemplateSidePng(card.spec.front, card.merge),
      renderTemplateSidePng(card.spec.back, card.merge),
    ]);
    const toDataUrl = (b: Buffer) => `data:image/png;base64,${b.toString("base64")}`;
    const design = JSON.stringify({
      frontImage: toDataUrl(front),
      backImage: toDataUrl(back),
      templateSpec: card.spec,
      merge: card.merge,
      spec: { cardName: `${user.name} — card` },
      createdByAdmin: admin.id,
    });

    const priceCents = Math.round(d.pricePounds * 100);
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        status: "PAID",
        material: d.material,
        cardName: `${user.name} — card`,
        quantity: d.quantity,
        priceCents,
        design,
        shipName: d.shipName || user.name,
        shipAddress: d.handDelivered ? "Hand delivered / collected" : d.shipAddress,
        shipCity: d.handDelivered ? "" : d.shipCity,
        shipPostal: d.handDelivered ? "" : d.shipPostal,
        shipCountry: "United Kingdom",
      },
    });

    await recordEvent({
      type: "ORDER_PLACED",
      title: `Admin order for ${user.name}`,
      message: `${d.quantity} × ${material(d.material).name} — ${priceCents ? `£${(priceCents / 100).toFixed(2)}` : "complimentary"} (by ${admin.email})`,
      meta: { orderId: order.id, userId: user.id, byAdmin: admin.id, priceCents },
    });
    if (d.emailReceipt) await sendOrderReceipt(order.id);

    refresh(user.id);
    return { ok: true, orderId: order.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not create the order." };
  }
}
