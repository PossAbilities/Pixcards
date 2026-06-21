"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";
import { appUrl } from "@/lib/constants";
import { createResetToken, consumeResetToken } from "@/lib/password-reset";
import { sendPasswordReset } from "@/lib/email/dispatch";

/**
 * Request a reset link. Always resolves the same way regardless of whether the
 * email exists, so the endpoint can't be used to enumerate accounts.
 */
export async function requestPasswordReset(email: string): Promise<{ ok: true }> {
  const clean = z.string().email().safeParse(email.trim().toLowerCase());
  if (clean.success) {
    const user = await prisma.user.findUnique({
      where: { email: clean.data },
      select: { id: true, name: true, email: true },
    });
    if (user) {
      try {
        const token = await createResetToken(user.id);
        const resetUrl = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
        await sendPasswordReset(user.email, user.name, resetUrl, user.id);
      } catch (e) {
        console.error("requestPasswordReset failed", e);
      }
    }
  }
  return { ok: true };
}

export type ResetState = { error?: string } | undefined;

const resetSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  });

export async function resetPassword(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Consume the token (single-use) and update the password.
  const userId = await consumeResetToken(parsed.data.token);
  if (!userId) {
    return {
      error: "This reset link is invalid or has expired. Please request a new one.",
    };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(parsed.data.password) },
  });

  await createSession(userId);
  redirect("/dashboard?reset=1");
}
