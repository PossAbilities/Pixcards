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

export type ActionResult = { ok: boolean; error?: string };

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
});

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
    spec: { cardName: `${user.name} — card` },
  });

  const mat = material("white-gloss");
  const priceCents = mat.priceCents * d.quantity;

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
