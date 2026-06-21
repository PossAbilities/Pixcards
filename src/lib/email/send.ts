import "server-only";
import { prisma } from "@/lib/db";
import type { EmailType } from "@prisma/client";

/**
 * Provider-agnostic email sender.
 *
 * If RESEND_API_KEY is set we send via the Resend REST API (no SDK dependency).
 * Otherwise we fall back to "demo mode" and just log — mirroring how Stripe is
 * handled — so local/dev and un-configured deploys never crash.
 *
 * Every send is logged as an EmailMessage row so the Resend webhook can record
 * delivery / open / click events against it.
 */

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  /** Tracking metadata (optional). */
  type?: EmailType;
  userId?: string;
};

async function logMessage(args: {
  to: string;
  subject: string;
  type?: EmailType;
  userId?: string;
  status: string;
  resendId?: string;
}): Promise<void> {
  try {
    await prisma.emailMessage.create({
      data: {
        to: args.to,
        subject: args.subject,
        type: args.type ?? "OTHER",
        userId: args.userId,
        status: args.status,
        resendId: args.resendId,
      },
    });
  } catch (e) {
    console.error("[email] failed to log message", e);
  }
}

export type SendResult = { ok: boolean; id?: string; error?: string; demo?: boolean };

export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function fromAddress(): string {
  return process.env.EMAIL_FROM || "Pixcards <onboarding@resend.dev>";
}

export async function sendEmail(input: SendEmailInput): Promise<SendResult> {
  const to = Array.isArray(input.to) ? input.to : [input.to];
  const primary = to[0] ?? "";
  const replyTo = input.replyTo || process.env.EMAIL_REPLY_TO || undefined;

  // Demo mode — no provider configured.
  if (!process.env.RESEND_API_KEY) {
    console.info(
      `[email:demo] → ${to.join(", ")} | "${input.subject}" (set RESEND_API_KEY to send for real)`,
    );
    await logMessage({
      to: primary,
      subject: input.subject,
      type: input.type,
      userId: input.userId,
      status: "demo",
    });
    return { ok: true, demo: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        reply_to: replyTo,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[email] send failed (${res.status}): ${detail}`);
      await logMessage({
        to: primary,
        subject: input.subject,
        type: input.type,
        userId: input.userId,
        status: "failed",
      });
      return { ok: false, error: `Email provider error (${res.status})` };
    }
    const json = (await res.json().catch(() => ({}))) as { id?: string };
    await logMessage({
      to: primary,
      subject: input.subject,
      type: input.type,
      userId: input.userId,
      status: "sent",
      resendId: json.id,
    });
    return { ok: true, id: json.id };
  } catch (e) {
    console.error("[email] send threw", e);
    return { ok: false, error: "Email provider unreachable" };
  }
}
