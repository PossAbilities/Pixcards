import { money } from "@/lib/constants";
import {
  BRAND,
  emailButton,
  emailHeading,
  emailLayout,
  emailParagraph,
  emailSummary,
  escapeHtml,
  toPlainText,
} from "./layout";

export type BuiltEmail = { subject: string; html: string; text: string };

function build(subject: string, html: string): BuiltEmail {
  return { subject, html, text: toPlainText(html) };
}

/* ------------------------------- Welcome --------------------------------- */

export function welcomeEmail(args: {
  name: string;
  shareUrl: string;
  dashboardUrl: string;
}): BuiltEmail {
  const first = args.name.split(" ")[0] || "there";
  const body = `
    ${emailHeading(`Welcome to Pixcards, ${escapeHtml(first)} 👋`)}
    ${emailParagraph("Your account is ready. Pixcards is your always-up-to-date digital business card — share it with a tap or a scan, and edit it any time without reprinting a thing.")}
    ${emailParagraph("Here's how to get started:")}
    <ul style="margin:0 0 16px;padding-left:20px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:${BRAND.muted};">
      <li>Add your photo, links and contact details.</li>
      <li>Pick a theme and layout that fits your brand.</li>
      <li>Share your link or order a physical NFC card.</li>
    </ul>
    ${emailButton(args.dashboardUrl, "Complete your profile")}
    ${emailParagraph(`Your public card lives at <a href="${args.shareUrl}" style="color:${BRAND.primary};">${escapeHtml(args.shareUrl.replace(/^https?:\/\//, ""))}</a>.`)}
  `;
  return build(
    "Welcome to Pixcards 🎉",
    emailLayout({ preheader: "Your digital business card is ready to set up.", body }),
  );
}

/* --------------------------- Order receipt ------------------------------- */

export function orderReceiptEmail(args: {
  name: string;
  orderShortId: string;
  materialName: string;
  quantity: number;
  unitPriceCents: number;
  discountLabel?: string;
  discountCents?: number;
  totalCents: number;
  shipLines: string[];
  orderUrl: string;
}): BuiltEmail {
  const first = args.name.split(" ")[0] || "there";
  const rows: { label: string; value: string; strong?: boolean }[] = [
    {
      label: `${args.materialName} × ${args.quantity}`,
      value: money(args.unitPriceCents * args.quantity),
    },
  ];
  if (args.discountCents && args.discountCents > 0) {
    rows.push({
      label: `Discount${args.discountLabel ? ` (${args.discountLabel})` : ""}`,
      value: `−${money(args.discountCents)}`,
    });
  }
  rows.push({ label: "Total paid", value: money(args.totalCents), strong: true });

  const ship = args.shipLines.filter(Boolean).map(escapeHtml).join("<br>");

  const body = `
    ${emailHeading("Thanks for your order!")}
    ${emailParagraph(`Hi ${escapeHtml(first)}, we've received your order <strong>#${escapeHtml(args.orderShortId)}</strong> and payment. We'll start producing your card and let you know the moment it ships.`)}
    ${emailSummary(rows)}
    ${emailParagraph(`<strong style="color:${BRAND.ink};">Shipping to</strong><br>${ship || "—"}`)}
    ${emailButton(args.orderUrl, "View your order")}
    ${emailParagraph("Once it arrives, just tap it on the back of a phone — your profile opens instantly, no app needed.")}
  `;
  return build(
    `Order confirmed — #${args.orderShortId}`,
    emailLayout({
      preheader: `We've got your order #${args.orderShortId}. Here's your receipt.`,
      body,
    }),
  );
}

/* ----------------------------- Pro welcome ------------------------------- */

export function proWelcomeEmail(args: {
  name: string;
  amountPaidCents?: number;
  dashboardUrl: string;
}): BuiltEmail {
  const first = args.name.split(" ")[0] || "there";
  const receipt =
    args.amountPaidCents && args.amountPaidCents > 0
      ? emailSummary([
          { label: "Pixcards Pro", value: money(args.amountPaidCents) },
          { label: "Total paid", value: money(args.amountPaidCents), strong: true },
        ])
      : emailParagraph("Your Pro access has been applied to your account.");

  const body = `
    ${emailHeading("You're Pro now ⚡")}
    ${emailParagraph(`Hi ${escapeHtml(first)}, thanks for upgrading to Pixcards Pro. Everything's unlocked:`)}
    <ul style="margin:0 0 16px;padding-left:20px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:${BRAND.muted};">
      <li>Unlimited links on your card</li>
      <li>Premium themes &amp; layout templates</li>
      <li>Advanced analytics on views &amp; taps</li>
      <li>Custom branding</li>
    </ul>
    ${receipt}
    ${emailButton(args.dashboardUrl, "Explore Pro features")}
  `;
  return build(
    "Welcome to Pixcards Pro ⚡",
    emailLayout({ preheader: "Your Pro features are unlocked.", body }),
  );
}

/* ---------------------------- Order shipped ------------------------------ */

export function orderShippedEmail(args: {
  name: string;
  orderShortId: string;
  trackingNumber?: string;
  orderUrl: string;
}): BuiltEmail {
  const first = args.name.split(" ")[0] || "there";
  const tracking = args.trackingNumber
    ? emailSummary([{ label: "Tracking number", value: args.trackingNumber, strong: true }])
    : "";
  const body = `
    ${emailHeading("Your card is on its way 📦")}
    ${emailParagraph(`Good news ${escapeHtml(first)} — order <strong>#${escapeHtml(args.orderShortId)}</strong> has been dispatched.`)}
    ${tracking}
    ${emailButton(args.orderUrl, "Track your order")}
    ${emailParagraph("When it lands, tap it on a phone to share your profile instantly. Need a hand? Just reply to this email.")}
  `;
  return build(
    `Your Pixcards order has shipped — #${args.orderShortId}`,
    emailLayout({ preheader: "Your NFC card is on its way.", body }),
  );
}

/* --------------------------- Password reset ------------------------------ */

export function passwordResetEmail(args: {
  name: string;
  resetUrl: string;
}): BuiltEmail {
  const first = args.name.split(" ")[0] || "there";
  const body = `
    ${emailHeading("Reset your password")}
    ${emailParagraph(`Hi ${escapeHtml(first)}, we received a request to reset your Pixcards password. Click below to choose a new one. This link expires in 60 minutes.`)}
    ${emailButton(args.resetUrl, "Reset password")}
    ${emailParagraph("If you didn't request this, you can safely ignore this email — your password won't change.")}
  `;
  return build(
    "Reset your Pixcards password",
    emailLayout({ preheader: "Choose a new password for your account.", body }),
  );
}

/* ----------------------------- Org invite -------------------------------- */

export function orgInviteEmail(args: {
  orgName: string;
  joinUrl: string;
}): BuiltEmail {
  const body = `
    ${emailHeading(`You're invited to join ${escapeHtml(args.orgName)}`)}
    ${emailParagraph(`<strong>${escapeHtml(args.orgName)}</strong> has invited you to their team on Pixcards. Accept to get your branded digital business card — set up in minutes.`)}
    ${emailButton(args.joinUrl, "Join the team")}
    ${emailParagraph("If you weren't expecting this invitation, you can safely ignore this email.")}
  `;
  return build(
    `Join ${args.orgName} on Pixcards`,
    emailLayout({ preheader: `Join ${args.orgName} on Pixcards`, body }),
  );
}

/* ------------------------------ Marketing -------------------------------- */

export function marketingEmail(args: {
  name: string;
  heading: string;
  /** Trusted HTML body (admin-authored). */
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  unsubscribeUrl?: string;
}): BuiltEmail {
  const first = args.name.split(" ")[0] || "there";
  const cta =
    args.ctaLabel && args.ctaUrl ? emailButton(args.ctaUrl, args.ctaLabel) : "";
  const body = `
    ${emailHeading(args.heading)}
    ${emailParagraph(`Hi ${escapeHtml(first)},`)}
    ${args.bodyHtml}
    ${cta}
  `;
  return build(
    args.heading,
    emailLayout({
      preheader: args.heading,
      body,
      marketing: true,
      unsubscribeUrl: args.unsubscribeUrl,
    }),
  );
}
