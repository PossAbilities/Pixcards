import "server-only";
import sharp from "sharp";
import QRCode from "qrcode";

// ~CR80 at 300 DPI (85.6 × 54 mm).
const W = 1013;
const H = 638;

function esc(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Render a print-ready PNG of a member's card with their details baked in:
 * solid brand-colour background, name + role + company bottom-left, QR
 * (their profile URL) top-right. Full-bleed, server-side (no browser).
 */
export async function renderMemberCardPng(opts: {
  name: string;
  jobTitle?: string;
  company?: string;
  accentColor: string;
  profileUrl: string;
}): Promise<Buffer> {
  const accent = /^#[0-9a-fA-F]{6}$/.test(opts.accentColor)
    ? opts.accentColor
    : "#4f46e5";
  const sub = [opts.jobTitle, opts.company]
    .filter((x): x is string => Boolean(x))
    .map(esc);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="${accent}"/>
    <text x="64" y="${H - 150}" font-family="Helvetica, Arial, sans-serif" font-size="62" font-weight="700" fill="#ffffff">${esc(opts.name)}</text>
    ${sub[0] ? `<text x="66" y="${H - 98}" font-family="Helvetica, Arial, sans-serif" font-size="33" fill="#ffffff" fill-opacity="0.92">${sub[0]}</text>` : ""}
    ${sub[1] ? `<text x="66" y="${H - 54}" font-family="Helvetica, Arial, sans-serif" font-size="33" fill="#ffffff" fill-opacity="0.92">${sub[1]}</text>` : ""}
  </svg>`;

  const base = await sharp(Buffer.from(svg)).png().toBuffer();
  const qr = await QRCode.toBuffer(opts.profileUrl, {
    width: 210,
    margin: 2,
    color: { dark: "#191c1e", light: "#ffffff" },
  });
  return sharp(base)
    .composite([{ input: qr, top: 64, left: W - 210 - 64 }])
    .png()
    .toBuffer();
}
