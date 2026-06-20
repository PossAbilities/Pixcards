"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { ORDER_STATUSES } from "@/lib/constants";
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
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: status as OrderStatus,
      ...(trackingNumber !== undefined ? { trackingNumber } : {}),
    },
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

export async function setUserRole(
  userId: string,
  role: Role,
): Promise<AdminResult> {
  const admin = await requireAdminUser();
  if (admin.id === userId && role !== "ADMIN") {
    return { ok: false, error: "You cannot remove your own admin access." };
  }
  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function deleteUser(userId: string): Promise<AdminResult> {
  const admin = await requireAdminUser();
  if (admin.id === userId) {
    return { ok: false, error: "You cannot delete your own account." };
  }
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin/users");
  return { ok: true };
}
