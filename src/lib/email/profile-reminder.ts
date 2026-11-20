/**
 * "Your audience is waiting" — nudge for people who haven't finished their
 * profile. Its own full-bleed layout (rather than emailLayout) so it can match
 * the pixcards.co.uk hero: lavender glow, Montserrat headings, tilted card.
 *
 * Everything is inline-styled tables. Fancy bits (web fonts, gradients, the
 * card tilt) show in Apple Mail / iOS and fall back cleanly elsewhere.
 */

import { escapeHtml } from "./layout";
import type { ProfileStep } from "@/lib/profile-completeness";
import type { BuiltEmail } from "./templates";

/**
 * Which card-order block to show:
 * - "free"        verified staff on a free-card domain: card costs nothing
 * - "free-verify" free-card domain, but they still need to confirm their email
 * - "paid"        normal order prompt (only for people who opted in to marketing)
 * - "none"        no order prompt
 */
export type ReminderOffer = "free" | "free-verify" | "paid" | "none";

export type ProfileReminderArgs = {
  name: string;
  percent: number;
  missing: ProfileStep[];
  jobTitle?: string;
  editUrl: string;
  orderUrl: string;
  offer: ReminderOffer;
  orgName?: string | null;
  /** Marketing unsubscribe link — only when the paid order prompt is shown. */
  unsubscribeUrl?: string;
};

const INDIGO = "#4F46E5";
const DEEP = "#3525CD";
const LAVENDER = "#E2DFFF";
const INK = "#191C1E";
const BODY = "#464555";
const FAINT = "#8A8899";
const LINE = "#E6E4F0";
const HEAD = "'Montserrat',Arial,Helvetica,sans-serif";
const TEXT = "'Inter',Arial,Helvetica,sans-serif";
const GRAD = `linear-gradient(135deg,${INDIGO} 0%,${DEEP} 100%)`;

const STEP_COPY: Record<ProfileStep, { label: string; hint: string }> = {
  photo: { label: "A photo", hint: "people remember faces" },
  jobTitle: { label: "Your job title", hint: "10 seconds" },
  bio: { label: "A line about what you do", hint: "keep it short" },
  contact: { label: "How to reach you", hint: "phone, email, socials" },
};

function button(href: string, label: string, opts: { bg: string; fg: string; block?: boolean; height?: number }): string {
  const h = opts.height ?? 52;
  const width = opts.block ? 520 : 220;
  return `<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${href}" style="height:${h}px;v-text-anchor:middle;width:${width}px;" arcsize="15%" stroke="f" fillcolor="${opts.bg}">
<w:anchorlock/><center style="color:${opts.fg};font-family:Arial,sans-serif;font-size:17px;font-weight:bold;">${escapeHtml(label)}</center>
</v:roundrect>
<![endif]--><!--[if !mso]><!-->
<a href="${href}" target="_blank" style="display:${opts.block ? "block" : "inline-block"};${opts.block ? "text-align:center;" : "white-space:nowrap;padding:0 26px;"}background:${opts.bg};color:${opts.fg};font-family:${TEXT};font-size:${opts.block ? 18 : 16}px;font-weight:700;line-height:${h}px;border-radius:8px;text-decoration:none;${opts.block ? "box-shadow:0 8px 20px rgba(79,70,229,0.30);" : ""}">${escapeHtml(label)} &rarr;</a>
<!--<![endif]-->`;
}

function logoMark(size: number, font: number): string {
  return `<td width="${size}" height="${size}" align="center" valign="middle" style="width:${size}px;height:${size}px;background:${INDIGO};background-image:${GRAD};border-radius:${Math.round(size / 3)}px;font-family:Arial,Helvetica,sans-serif;font-size:${font}px;font-weight:700;letter-spacing:-1px;color:#FFFFFF;">&#41;&#41;&#41;</td>`;
}

function missingRows(missing: ProfileStep[]): string {
  return missing
    .map((step, i) => {
      const { label, hint } = STEP_COPY[step];
      const top = i === 0 ? `2px solid ${INK}` : `1px solid ${LINE}`;
      const bottom = i === missing.length - 1 ? `border-bottom:1px solid ${LINE};` : "";
      return `<tr><td style="border-top:${top};${bottom}padding:15px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td width="34" valign="middle"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="20" height="20" style="width:20px;height:20px;border:2px solid #C7C4D8;border-radius:6px;font-size:0;line-height:0;">&nbsp;</td></tr></table></td>
    <td style="font-family:${TEXT};font-size:17px;line-height:22px;font-weight:600;color:${INK};">${label}</td>
    <td align="right" style="font-family:${TEXT};font-size:14px;line-height:22px;color:${FAINT};">${hint}</td>
  </tr></table>
</td></tr>`;
    })
    .join("\n");
}

function freeBlock(args: ProfileReminderArgs): string {
  const org = escapeHtml(args.orgName || "PossAbilities");
  const needsVerify = args.offer === "free-verify";
  const copy = needsVerify
    ? "Don't forget to order your card today. It's on us. Confirm your email address first (we sent you a link), then there's nothing to pay at checkout."
    : "Don't forget to order your card today. It's on us, and checkout already knows. There's nothing to pay and no code to type.";
  const stub = needsVerify ? "CONFIRM YOUR EMAIL FIRST" : `NO CODE NEEDED <span style="color:#10B981;">&#10003;</span>`;
  return `<tr><td class="px" style="background:#F2F4F6;padding:40px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${INDIGO};background-image:${GRAD};border-radius:18px;">
    <tr><td style="padding:28px 28px 8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="font-family:${TEXT};font-size:11px;font-weight:700;letter-spacing:1.5px;color:${LAVENDER};">${org.toUpperCase()} STAFF</td>
        <td align="right" style="font-family:${TEXT};font-size:11px;font-weight:700;letter-spacing:1.5px;color:${LAVENDER};">NFC CARD</td>
      </tr></table>
      <p class="free" style="margin:18px 0 0;font-family:${HEAD};font-size:104px;line-height:92px;font-weight:800;letter-spacing:-5px;color:#FFFFFF;">FREE.</p>
      <p style="margin:14px 0 0;font-family:${TEXT};font-size:16px;line-height:24px;color:${LAVENDER};">${copy}</p>
    </td></tr>
    <tr><td style="padding:20px 0 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:2px dashed rgba(226,223,255,0.55);font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>
    <tr><td style="padding:20px 28px 26px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td class="stack" valign="middle" style="font-family:${TEXT};font-size:13px;font-weight:700;letter-spacing:1px;color:#FFFFFF;">${stub}</td>
        <td class="stack btn-cell" valign="middle" align="right">${button(args.orderUrl, "Claim my free card", { bg: "#FFFFFF", fg: DEEP })}</td>
      </tr></table>
    </td></tr>
  </table>
</td></tr>`;
}

function paidBlock(args: ProfileReminderArgs): string {
  return `<tr><td class="px" style="background:#F2F4F6;padding:40px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${INDIGO};background-image:${GRAD};border-radius:18px;">
    <tr><td style="padding:30px 28px;">
      <p style="margin:0;font-family:${TEXT};font-size:11px;font-weight:700;letter-spacing:1.5px;color:${LAVENDER};">ONE MORE THING</p>
      <h2 style="margin:12px 0 0;font-family:${HEAD};font-size:38px;line-height:40px;font-weight:800;letter-spacing:-1.2px;color:#FFFFFF;">Got your card yet?</h2>
      <p style="margin:14px 0 0;font-family:${TEXT};font-size:16px;line-height:24px;color:${LAVENDER};">Don't forget to order your NFC card today. Hold it to any phone and your profile opens. Nobody has to download anything.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;"><tr><td>${button(args.orderUrl, "Order my card", { bg: "#FFFFFF", fg: DEEP })}</td></tr></table>
    </td></tr>
  </table>
</td></tr>`;
}

export function profileReminderEmail(args: ProfileReminderArgs): BuiltEmail {
  const first = escapeHtml(args.name.split(" ")[0] || "there");
  const full = escapeHtml(args.name || "Your name");
  const pct = Math.max(0, Math.min(99, Math.round(args.percent)));
  const bar = Math.max(4, pct);
  const missing = args.missing.length ? args.missing : (["bio"] as ProfileStep[]);
  const job = args.jobTitle?.trim()
    ? `<p style="margin:3px 0 0;font-family:${TEXT};font-size:13px;color:${BODY};">${escapeHtml(args.jobTitle.trim())}</p>`
    : `<p style="margin:3px 0 0;font-family:${TEXT};font-size:13px;color:#A09DB5;font-style:italic;">Add your job title&hellip;</p>`;

  const offerBlock =
    args.offer === "free" || args.offer === "free-verify"
      ? freeBlock(args)
      : args.offer === "paid"
        ? paidBlock(args)
        : "";

  const footerNote =
    args.offer === "paid" && args.unsubscribeUrl
      ? `Your Pixcards account is set up but your profile isn't finished yet, so we're nudging you. We'll stop once it's done, and we'll never send more than three. <a href="${args.unsubscribeUrl}" style="color:${FAINT};text-decoration:underline;">Unsubscribe from Pixcards news</a>.`
      : "Your Pixcards account is set up but your profile isn't finished yet, so we're nudging you. We'll stop once it's done, and we'll never send more than three.";

  const preheader = `${args.name.split(" ")[0] || "Hey"}, your Pixcards profile is ${pct}% done. Someone's going to tap your card soon. Give them something to look at.`;

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Your audience is waiting</title>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<style>table,td,div,h1,h2,p,a,span{font-family:Arial,Helvetica,sans-serif !important;}</style>
<![endif]-->
<style>
  :root{color-scheme:light;}
  body{margin:0;padding:0;background:#F2F4F6;}
  a{text-decoration:none;}
  @media (max-width:620px){
    .container{width:100% !important;}
    .px{padding-left:22px !important;padding-right:22px !important;}
    .giant{font-size:112px !important;line-height:96px !important;letter-spacing:-6px !important;}
    .h1{font-size:38px !important;line-height:40px !important;}
    .stack{display:block !important;width:100% !important;}
    .card{width:100% !important;transform:rotate(-2deg) !important;}
    .free{font-size:80px !important;line-height:74px !important;}
    .btn-cell{text-align:left !important;padding-top:22px !important;}
    .hide-m{display:none !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background:#F2F4F6;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F2F4F6;">${escapeHtml(preheader)}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F2F4F6;">
<tr><td align="center" style="padding:20px 10px 32px;">
<table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

<tr><td style="background:${INDIGO};background-image:linear-gradient(90deg,${INDIGO} 0%,${DEEP} 100%);border-radius:18px 18px 0 0;padding:11px 24px;">
  <span style="font-family:${TEXT};font-size:11px;font-weight:700;letter-spacing:2px;color:#FFFFFF;">PROFILE INCOMPLETE &nbsp;&#9679;&nbsp; ${pct}%<span class="hide-m"> &nbsp;&#9679;&nbsp; TWO MINUTES TO FINISH</span></span>
</td></tr>

<tr><td class="px" style="background:#F7F9FB;background-image:radial-gradient(circle at 100% 0,${LAVENDER} 0%,#F7F9FB 42%);padding:28px 40px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      ${logoMark(36, 15)}
      <td style="padding-left:9px;font-family:${HEAD};font-size:24px;font-weight:800;letter-spacing:-0.6px;color:${DEEP};">Pixcards</td>
    </tr></table></td>
    <td align="right" style="font-family:${TEXT};font-size:12px;font-weight:600;color:${BODY};">For ${first}</td>
  </tr></table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:36px;"><tr>
    <td class="giant" style="font-family:${HEAD};font-size:160px;line-height:130px;font-weight:800;letter-spacing:-8px;color:${INDIGO};">${pct}<span style="font-size:68px;letter-spacing:-2px;color:${DEEP};">%</span></td>
  </tr></table>
  <p style="margin:14px 0 0;font-family:${TEXT};font-size:12px;font-weight:700;letter-spacing:1.5px;color:${BODY};">THAT'S HOW MUCH OF YOU PEOPLE CAN SEE RIGHT NOW</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;background:${LAVENDER};border-radius:999px;"><tr>
    <td width="${bar}%" style="background:${INDIGO};border-radius:999px;height:8px;line-height:8px;font-size:0;">&nbsp;</td>
    <td style="height:8px;line-height:8px;font-size:0;">&nbsp;</td>
  </tr></table>
</td></tr>

<tr><td class="px" style="background:#F7F9FB;padding:40px 40px 0;">
  <h1 class="h1" style="margin:0;font-family:${HEAD};font-size:52px;line-height:54px;font-weight:800;letter-spacing:-1.5px;color:${INK};">Your audience<br>is <span style="color:${INDIGO};">waiting.</span></h1>
  <p style="margin:18px 0 0;font-family:${TEXT};font-size:18px;line-height:28px;color:${BODY};">Every tap of your card opens your profile. Right now people only see part of you. Two minutes fixes it.</p>
</td></tr>

<tr><td class="px" style="background:#F7F9FB;padding:32px 40px 0;">
  <p style="margin:0 0 10px;font-family:${TEXT};font-size:11px;font-weight:700;letter-spacing:1.5px;color:${BODY};">PICTURE THIS &darr;</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;border:1px solid ${LINE};border-radius:20px;box-shadow:0 2px 8px rgba(79,70,229,0.08);">
    <tr><td style="padding:16px 18px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="42" valign="top"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${logoMark(38, 14)}</tr></table></td>
        <td valign="top" style="padding-left:12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="font-family:${TEXT};font-size:14px;font-weight:700;color:${INK};">Someone tapped your card</td>
            <td align="right" style="font-family:${TEXT};font-size:12px;color:${FAINT};">now</td>
          </tr></table>
          <p style="margin:4px 0 0;font-family:${TEXT};font-size:14px;line-height:20px;color:${BODY};">They saw your name and not much else. Then they put their phone away.</p>
        </td>
      </tr></table>
    </td></tr>
  </table>
</td></tr>

<tr><td align="center" class="px" style="background:#F7F9FB;padding:46px 40px 54px;">
  <table role="presentation" class="card" width="400" cellpadding="0" cellspacing="0" border="0" style="width:400px;background:#FFFFFF;background-image:linear-gradient(145deg,#FFFFFF 0%,#EEF0F4 100%);border:1px solid ${LINE};border-radius:16px;transform:rotate(-4deg);box-shadow:0 30px 60px rgba(79,70,229,0.18);">
    <tr><td style="padding:22px 24px 26px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="20" height="20" align="center" valign="middle" style="width:20px;height:20px;background:${INK};border-radius:10px;font-family:Arial,sans-serif;font-size:9px;font-weight:700;letter-spacing:-1px;color:#FFFFFF;">&#41;&#41;</td>
          <td style="padding-left:6px;font-family:${HEAD};font-size:14px;font-weight:700;color:${INK};">Pixcards</td>
        </tr></table></td>
        <td align="right"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="44" height="44" align="center" valign="middle" style="width:44px;height:44px;border-radius:22px;border:2px dashed #C7C4D8;font-family:Arial,sans-serif;font-size:20px;color:#A09DB5;">+</td>
        </tr></table></td>
      </tr></table>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;"><tr>
        <td width="36" height="26" style="width:36px;height:26px;background:#D9B65A;background-image:linear-gradient(135deg,#F1D78A 0%,#C9A23F 100%);border-radius:5px;font-size:0;line-height:0;">&nbsp;</td>
      </tr></table>
      <p style="margin:30px 0 0;font-family:${HEAD};font-size:20px;font-weight:700;letter-spacing:-0.3px;color:${INK};">${full}</p>
      ${job}
    </td></tr>
  </table>
</td></tr>

<tr><td class="px" style="background:#FFFFFF;padding:44px 40px 10px;">
  <p style="margin:0 0 6px;font-family:${TEXT};font-size:11px;font-weight:700;letter-spacing:1.5px;color:${INDIGO};">STILL TO DO</p>
  <h2 style="margin:0 0 22px;font-family:${HEAD};font-size:32px;line-height:36px;font-weight:800;letter-spacing:-1px;color:${INK};">What's missing</h2>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${missingRows(missing)}
  </table>
</td></tr>

<tr><td class="px" style="background:#FFFFFF;padding:28px 40px 46px;">${button(args.editUrl, "Finish my profile", { bg: INDIGO, fg: "#FFFFFF", block: true, height: 60 })}</td></tr>

${offerBlock}

<tr><td class="px" style="background:#F2F4F6;border-top:1px solid ${LINE};border-radius:0 0 18px 18px;padding:24px 40px 30px;">
  <p style="margin:0 0 10px;font-family:${TEXT};font-size:13px;line-height:20px;color:${FAINT};">${footerNote}</p>
  <p style="margin:0;font-family:${TEXT};font-size:13px;color:${FAINT};"><a href="${args.editUrl}" style="color:${INDIGO};font-weight:600;text-decoration:underline;">My profile</a> &nbsp;&middot;&nbsp; <a href="https://pixcards.co.uk" style="color:${FAINT};text-decoration:underline;">pixcards.co.uk</a></p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  const subject =
    args.offer === "free" || args.offer === "free-verify"
      ? `${args.name.split(" ")[0] || "Hey"}, your audience is waiting (and your card's free)`
      : `${args.name.split(" ")[0] || "Hey"}, your audience is waiting`;

  const firstPlain = args.name.split(" ")[0] || "there";
  const offerText =
    args.offer === "free"
      ? `\nYour staff card is free. Order it today, there's nothing to pay and no code to type:\n${args.orderUrl}\n`
      : args.offer === "free-verify"
        ? `\nYour staff card is free. Confirm your email address first (we sent you a link), then order it here:\n${args.orderUrl}\n`
        : args.offer === "paid"
          ? `\nGot your card yet? Order your NFC card today:\n${args.orderUrl}\n`
          : "";
  const text = [
    `Hi ${firstPlain},`,
    "",
    `Your Pixcards profile is ${pct}% done. Every tap of your card opens your profile, and right now people only see part of you. Two minutes fixes it.`,
    "",
    "What's missing:",
    ...missing.map((m) => `- ${STEP_COPY[m].label} (${STEP_COPY[m].hint})`),
    "",
    `Finish my profile: ${args.editUrl}`,
    offerText,
    "Your Pixcards account is set up but your profile isn't finished yet, so we're nudging you. We'll stop once it's done, and we'll never send more than three.",
    args.offer === "paid" && args.unsubscribeUrl ? `Unsubscribe from Pixcards news: ${args.unsubscribeUrl}` : "",
  ]
    .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
    .join("\n")
    .trim();

  return { subject, html, text };
}
