"use server";

import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { appUrl } from "@/lib/constants";
import { sendEmail } from "@/lib/email/send";
import { marketingEmail } from "@/lib/email/templates";

async function requireAdminUser() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") throw new Error("Forbidden");
  return user;
}

export type BroadcastResult = { ok: boolean; sent?: number; error?: string };

/**
 * Send a branded marketing email. `testOnly` sends just to the admin so you can
 * proof it in a real inbox before blasting everyone.
 */
export async function sendBroadcast(input: {
  subject: string;
  heading: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  testOnly?: boolean;
}): Promise<BroadcastResult> {
  const admin = await requireAdminUser();

  const heading = input.heading.trim();
  const bodyHtml = input.bodyHtml.trim();
  if (!heading || !bodyHtml) {
    return { ok: false, error: "Add a heading and some body text." };
  }

  // Turn plain paragraphs (blank-line separated) into styled <p> blocks unless
  // the admin already wrote HTML tags.
  const looksLikeHtml = /<[a-z][\s\S]*>/i.test(bodyHtml);
  const safeBody = looksLikeHtml
    ? bodyHtml
    : bodyHtml
        .split(/\n{2,}/)
        .map(
          (p) =>
            `<p style="margin:0 0 16px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#5b6166;">${p
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/\n/g, "<br>")}</p>`,
        )
        .join("");

  const recipients = input.testOnly
    ? [{ id: admin.id, name: admin.name, email: admin.email }]
    : await prisma.user.findMany({ select: { id: true, name: true, email: true } });

  const unsubscribeUrl = `${appUrl()}/dashboard/settings`;
  let sent = 0;
  for (const r of recipients) {
    const built = marketingEmail({
      name: r.name,
      heading,
      bodyHtml: safeBody,
      ctaLabel: input.ctaLabel?.trim() || undefined,
      ctaUrl: input.ctaUrl?.trim() || undefined,
      unsubscribeUrl,
    });
    const res = await sendEmail({
      to: r.email,
      subject: input.subject.trim() || heading,
      html: built.html,
      text: built.text,
      type: "MARKETING",
      userId: r.id,
    });
    if (res.ok) sent++;
  }

  return { ok: true, sent };
}
