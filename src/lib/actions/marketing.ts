"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";

/** Settings toggle: opt in to / out of marketing email. */
export async function setMarketingPreference(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;
  const optIn = formData.get("marketingOptIn") === "yes";
  await prisma.user.update({
    where: { id: user.id },
    data: { marketingOptIn: optIn, marketingOptInAt: optIn ? new Date() : null },
  });
  revalidatePath("/dashboard/settings");
}

/** One-click unsubscribe from a marketing email link (no sign-in needed). */
export async function unsubscribeWithToken(
  _prev: { done?: boolean; error?: string } | undefined,
  formData: FormData,
): Promise<{ done?: boolean; error?: string }> {
  const userId = await verifyUnsubscribeToken(String(formData.get("token") ?? ""));
  if (!userId) {
    return { error: "This unsubscribe link is invalid. Please sign in and change your email preferences in your account settings." };
  }
  await prisma.user.updateMany({
    where: { id: userId },
    data: { marketingOptIn: false, marketingOptInAt: null },
  });
  return { done: true };
}
