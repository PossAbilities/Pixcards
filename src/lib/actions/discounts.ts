"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { validateDiscount } from "@/lib/discounts";
import type { DiscountScope, DiscountType } from "@prisma/client";

/** Live preview of a code for the checkout UI (no redemption recorded). */
export async function previewDiscount(
  code: string,
  scope: "PRO" | "CARD",
  amountCents: number,
): Promise<{
  ok: boolean;
  reason?: string;
  amountOffCents?: number;
  finalCents?: number;
}> {
  const user = await getSessionUser();
  if (!user) return { ok: false, reason: "Please log in to use a code." };
  const res = await validateDiscount(code, scope, amountCents, user.id);
  if (!res.valid) return { ok: false, reason: res.reason };
  return {
    ok: true,
    amountOffCents: res.amountOffCents,
    finalCents: res.finalCents,
  };
}

async function requireAdminUser() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") throw new Error("Forbidden");
  return user;
}

export type DiscountActionResult = { ok: boolean; error?: string };

const createSchema = z.object({
  code: z
    .string()
    .min(3, "Code must be at least 3 characters")
    .max(32)
    .regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, - or _ only"),
  description: z.string().max(120).optional().default(""),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.coerce.number().int().positive("Enter a value above 0"),
  scope: z.enum(["ALL", "PRO", "CARD"]),
  maxRedemptions: z.coerce.number().int().positive().optional(),
  expiresAt: z.string().optional(),
});

export async function createDiscount(
  formData: FormData,
): Promise<DiscountActionResult> {
  await requireAdminUser();

  const raw = {
    code: formData.get("code"),
    description: formData.get("description") ?? "",
    type: formData.get("type"),
    value: formData.get("value"),
    scope: formData.get("scope"),
    maxRedemptions: formData.get("maxRedemptions") || undefined,
    expiresAt: formData.get("expiresAt") || undefined,
  };
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  if (d.type === "PERCENT" && (d.value < 1 || d.value > 100)) {
    return { ok: false, error: "Percentage must be between 1 and 100." };
  }

  const code = d.code.trim().toUpperCase();
  const exists = await prisma.discountCode.findUnique({ where: { code } });
  if (exists) {
    return { ok: false, error: "That code already exists." };
  }

  await prisma.discountCode.create({
    data: {
      code,
      description: d.description,
      type: d.type as DiscountType,
      value: d.value,
      scope: d.scope as DiscountScope,
      maxRedemptions: d.maxRedemptions ?? null,
      expiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
    },
  });

  revalidatePath("/admin/discounts");
  return { ok: true };
}

export async function setDiscountActive(
  id: string,
  active: boolean,
): Promise<DiscountActionResult> {
  await requireAdminUser();
  await prisma.discountCode.update({ where: { id }, data: { active } });
  revalidatePath("/admin/discounts");
  return { ok: true };
}

export async function deleteDiscount(id: string): Promise<DiscountActionResult> {
  await requireAdminUser();
  await prisma.discountCode.delete({ where: { id } });
  revalidatePath("/admin/discounts");
  return { ok: true };
}
