import "server-only";

/**
 * Provider-agnostic email sender.
 *
 * If RESEND_API_KEY is set we send via the Resend REST API (no SDK dependency).
 * Otherwise we fall back to "demo mode" and just log — mirroring how Stripe is
 * handled — so local/dev and un-configured deploys never crash.
 */

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export type SendResult = { ok: boolean; id?: string; error?: string; demo?: boolean };

export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function fromAddress(): string {
  return process.env.EMAIL_FROM || "Pixcards <onboarding@resend.dev>";
}

export async function sendEmail(input: SendEmailInput): Promise<SendResult> {
  const to = Array.isArray(input.to) ? input.to : [input.to];
  const replyTo = input.replyTo || process.env.EMAIL_REPLY_TO || undefined;

  // Demo mode — no provider configured.
  if (!process.env.RESEND_API_KEY) {
    console.info(
      `[email:demo] → ${to.join(", ")} | "${input.subject}" (set RESEND_API_KEY to send for real)`,
    );
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
      return { ok: false, error: `Email provider error (${res.status})` };
    }
    const json = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: json.id };
  } catch (e) {
    console.error("[email] send threw", e);
    return { ok: false, error: "Email provider unreachable" };
  }
}
