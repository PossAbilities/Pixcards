/**
 * Branded, email-client-safe HTML layout + small component helpers.
 *
 * Email clients are stuck in ~2005 CSS: everything is inline styles on tables.
 * These helpers return HTML strings so templates read declaratively.
 */

export const BRAND = {
  gradient: "linear-gradient(135deg,#6366f1 0%,#4f46e5 55%,#3525cd 100%)",
  primary: "#4f46e5",
  primaryDeep: "#3525cd",
  ink: "#191c1e",
  muted: "#5b6166",
  faint: "#9aa0a6",
  line: "#e8eaed",
  bg: "#f4f5f7",
  surface: "#ffffff",
};

const SITE = "pixcards.co.uk";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* --------------------------- component helpers --------------------------- */

export function emailButton(href: string, label: string): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td style="border-radius:10px;background:${BRAND.primary};background-image:${BRAND.gradient};">
        <a href="${href}" target="_blank"
           style="display:inline-block;padding:13px 26px;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">
          ${escapeHtml(label)}
        </a>
      </td>
    </tr>
  </table>`;
}

export function emailParagraph(html: string): string {
  return `<p style="margin:0 0 16px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${BRAND.muted};">${html}</p>`;
}

export function emailHeading(text: string): string {
  return `<h2 style="margin:0 0 12px;font-family:Helvetica,Arial,sans-serif;font-size:20px;font-weight:800;color:${BRAND.ink};">${escapeHtml(text)}</h2>`;
}

/** Key/value summary box (e.g. order lines, receipt rows). */
export function emailSummary(
  rows: { label: string; value: string; strong?: boolean }[],
): string {
  const body = rows
    .map(
      (r) => `
      <tr>
        <td style="padding:9px 0;font-family:Helvetica,Arial,sans-serif;font-size:14px;color:${BRAND.muted};">${escapeHtml(r.label)}</td>
        <td style="padding:9px 0;font-family:Helvetica,Arial,sans-serif;font-size:14px;text-align:right;color:${BRAND.ink};font-weight:${r.strong ? 800 : 500};">${escapeHtml(r.value)}</td>
      </tr>`,
    )
    .join(
      `<tr><td colspan="2" style="border-top:1px solid ${BRAND.line};font-size:0;line-height:0;">&nbsp;</td></tr>`,
    );
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
         style="margin:8px 0 20px;border:1px solid ${BRAND.line};border-radius:12px;padding:6px 18px;background:#fbfbfc;">
    ${body}
  </table>`;
}

/* ------------------------------- layout ---------------------------------- */

export type LayoutOptions = {
  preheader: string;
  /** Inner HTML for the body (use the helpers above). */
  body: string;
  /** Show the marketing footer (unsubscribe + postal address). */
  marketing?: boolean;
  unsubscribeUrl?: string;
};

export function emailLayout(opts: LayoutOptions): string {
  const year = new Date().getFullYear();
  const marketingFooter = opts.marketing
    ? `
      <p style="margin:0 0 6px;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:${BRAND.faint};">
        You're receiving this because you have a Pixcards account.
        ${opts.unsubscribeUrl ? `<a href="${opts.unsubscribeUrl}" style="color:${BRAND.faint};text-decoration:underline;">Unsubscribe</a>.` : ""}
      </p>
      <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:${BRAND.faint};">
        Pixcards, United Kingdom
      </p>`
    : `
      <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:${BRAND.faint};">
        This is a service message about your Pixcards account.
      </p>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>Pixcards</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};">
  <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">${escapeHtml(opts.preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};">
    <tr>
      <td align="center" style="padding:28px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;">
          <!-- Header -->
          <tr>
            <td style="padding:0 0 18px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-family:Helvetica,Arial,sans-serif;font-size:22px;font-weight:800;color:${BRAND.ink};letter-spacing:-0.5px;">
                    <span style="color:${BRAND.primary};">◗</span>&nbsp;Pixcards
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background:${BRAND.surface};border-radius:18px;padding:34px 36px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
              ${opts.body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:22px 36px;">
              ${marketingFooter}
              <p style="margin:10px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:${BRAND.faint};">
                © ${year} Pixcards · <a href="https://${SITE}" style="color:${BRAND.faint};text-decoration:underline;">${SITE}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Crude HTML→text fallback for the plaintext part. */
export function toPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
