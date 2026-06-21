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

  await prisma.user.delete({ where: { id: session.id } });
  await destroySession();
  redirect("/?deleted=1");
}
