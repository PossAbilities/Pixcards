"use server";

import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { unsubscribeUrl as unsubscribeLink } from "@/lib/unsubscribe";
import { sendEmail } from "@/lib/email/send";
import { marketingEmail } from "@/lib/email/templates";
import { runProfileReminderSweep, sendProfileReminder } from "@/lib/email/profile-reminders";

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
    : // Marketing goes only to people who explicitly opted in (PECR).
      await prisma.user.findMany({
        where: { marketingOptIn: true },
        select: { id: true, name: true, email: true },
      });

  let sent = 0;
  for (const r of recipients) {
    const unsubscribeUrl = await unsubscribeLink(r.id);
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

export type ReminderAdminResult = {
  ok: boolean;
  message?: string;
  error?: string;
};

/** Send yourself the profile reminder exactly as your own account would get it. */
export async function sendProfileReminderTest(): Promise<ReminderAdminResult> {
  const admin = await requireAdminUser();
  const res = await sendProfileReminder(admin.id, { testTo: admin.email });
  if (!res.ok) return { ok: false, error: res.error ?? res.skipped ?? "Could not send." };
  return { ok: true, message: res.demo ? "Logged (demo mode — no email provider set)." : `Sent to ${admin.email}.` };
}

/** Preview (dryRun) or send profile reminders to everyone who's due one now. */
export async function runProfileReminders(dryRun: boolean): Promise<ReminderAdminResult> {
  await requireAdminUser();
  const r = await runProfileReminderSweep({ dryRun });
  if (dryRun) {
    return { ok: true, message: `${r.due} ${r.due === 1 ? "person is" : "people are"} due a reminder right now.` };
  }
  return { ok: true, message: `Sent ${r.sent}${r.failed ? `, ${r.failed} failed` : ""} (${r.due} were due).` };
}
