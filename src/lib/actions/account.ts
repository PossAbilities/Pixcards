"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser, verifyPassword, destroySession } from "@/lib/auth";

export type DeleteState = { error?: string } | undefined;

/**
 * GDPR right to erasure. Verifies the user's password, then deletes the account
 * and everything cascading from it (profile, links, orders, analytics, reset
 * tokens, email logs). Cards are unlinked (their codes can be re-activated).
 */
export async function deleteMyAccount(
  _prev: DeleteState,
  formData: FormData,
): Promise<DeleteState> {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const password = String(formData.get("password") ?? "");
  if (!password) return { error: "Enter your password to confirm." };

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { passwordHash: true },
  });
  if (!user) redirect("/login");

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return { error: "That password is incorrect." };

  // Don't wipe the delivery details of a card that's been paid for but not
  // yet sent — we still need them to fulfil the order.
  const inProgress = await prisma.order.count({
    where: { userId: session.id, status: { in: ["PAID", "PRINTING"] } },
  });
  if (inProgress > 0) {
    return {
      error:
        "You have a card order that's still being made. Please wait until it has shipped, or email us to cancel it, before deleting your account.",
    };
  }

  await prisma.user.delete({ where: { id: session.id } });
  await destroySession();
  redirect("/?deleted=1");
}
