"use server";

import { prisma } from "@/lib/db";
import { getSessionUser, signEmailVerifyToken, readEmailVerifyToken } from "@/lib/auth";
import { appUrl } from "@/lib/constants";
import { sendVerifyEmail } from "@/lib/email/dispatch";
import { recordEvent } from "@/lib/events";
import { revalidatePath } from "next/cache";

const VERIFY_SUBJECT = "Confirm your email for Pixcards";

/** Email the signed-in user a link to confirm their address. */
export async function sendMyVerificationEmail(): Promise<{ ok: boolean; error?: string }> {
  const session = await getSessionUser();
  if (!session) return { ok: false, error: "Please log in first." };
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, name: true, email: true, emailVerifiedAt: true },
  });
  if (!user) return { ok: false, error: "Account not found." };
  if (user.emailVerifiedAt) return { ok: true };

  // Light throttle: one verification email every 2 minutes.
  const recent = await prisma.emailMessage.findFirst({
    where: {
      userId: user.id,
      subject: VERIFY_SUBJECT,
      createdAt: { gt: new Date(Date.now() - 2 * 60 * 1000) },
    },
    select: { id: true },
  });
  if (recent) {
    return { ok: false, error: "We've just sent one — check your inbox (and junk folder) or try again in a couple of minutes." };
  }

  const token = await signEmailVerifyToken(user.id, user.email);
  const res = await sendVerifyEmail({
    email: user.email,
    name: user.name,
    verifyUrl: `${appUrl()}/verify-email?token=${encodeURIComponent(token)}`,
    userId: user.id,
  });
  if (!res.ok) return { ok: false, error: "The email couldn't be sent. Please try again later." };
  return { ok: true };
}

/** Confirm an address from an emailed link (button press, not page load, so
 *  link scanners can't confirm on someone's behalf). */
export async function confirmEmail(token: string): Promise<{ ok: boolean; error?: string }> {
  const data = await readEmailVerifyToken(token);
  if (!data) return { ok: false, error: "This link has expired or isn't valid. Request a new one from the order page." };
  const user = await prisma.user.findUnique({
    where: { id: data.userId },
    select: { id: true, email: true, emailVerifiedAt: true },
  });
  if (!user || user.email.toLowerCase() !== data.email) {
    return { ok: false, error: "This link no longer matches your account. Request a new one from the order page." };
  }
  if (!user.emailVerifiedAt) {
    await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
    await recordEvent({
      type: "SECURITY",
      title: `Email confirmed: ${user.email}`,
      meta: { userId: user.id },
    });
  }
  revalidatePath("/dashboard/order");
  return { ok: true };
}
