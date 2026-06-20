"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { material, appUrl, PRO_PRICE_CENTS, APP_NAME } from "@/lib/constants";

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
  if (mat.pro && user.plan !== "PRO") {
    return { error: "The Metal Indigo card is a Pro material. Upgrade to order it." };
  }
  const priceCents = mat.priceCents * d.quantity;

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
              name: `${APP_NAME} — ${mat.name} (x${d.quantity})`,
              description: `NFC card linked to ${user.email}`,
            },
          },
        },
      ],
      metadata: { kind: "order", orderId: order.id },
      success_url: `${appUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl()}/dashboard/order?cancelled=1`,
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id },
    });
    redirect(session.url as string);
  }

  // Demo mode: simulate successful payment.
  await prisma.order.update({
    where: { id: order.id },
    data: { status: "PAID" },
  });
  redirect("/dashboard/orders?success=1");
}

export async function upgradeToPro(): Promise<{ error: string } | void> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.plan === "PRO") redirect("/dashboard?already=pro");

  if (stripeEnabled && stripe) {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: PRO_PRICE_CENTS,
            product_data: {
              name: `${APP_NAME} Pro`,
              description: "Unlimited links, premium themes, analytics & custom branding.",
            },
          },
        },
      ],
      metadata: { kind: "pro", userId: user.id },
      success_url: `${appUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl()}/pricing?cancelled=1`,
    });
    redirect(session.url as string);
  }

  // Demo mode.
  await prisma.user.update({
    where: { id: user.id },
    data: { plan: "PRO", proSince: new Date() },
  });
  redirect("/dashboard?upgraded=1");
}
