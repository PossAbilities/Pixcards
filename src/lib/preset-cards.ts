import "server-only";
import sharp from "sharp";
import QRCode from "qrcode";
import { textPath } from "@/lib/text-render";

// ~CR80 at 300 DPI — matches the rest of the platform's card artwork.
const W = 1013;
const H = 638;

const NAVY = "#12142f";
const LIME = "#c7ec4f";
const ORANGE = "#ff5a1f";
const MUTED = "#9aa6c8";

export type PerspectiveDetails = {
  name: string;
  role: string;
  email: string;
  phone: string;
  website: string; // shown on the back ("W" line) + front strapline
  profileUrl: string; // QR + NFC target
};

/** Front (navy): logo, name, lime role, website, orange ring, gradient strip. */
function frontSvg(d: PerspectiveDetails): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<defs>
 <linearGradient id="ng" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1a2046"/><stop offset="0.6" stop-color="#0f1330"/><stop offset="1" stop-color="#0a0d22"/></linearGradient>
 <radialGradient id="glow" cx="0.78" cy="0.18" r="0.42"><stop offset="0" stop-color="#3a4684" stop-opacity="0.55"/><stop offset="1" stop-color="#3a4684" stop-opacity="0"/></radialGradient>
 <linearGradient id="strip" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${LIME}"/><stop offset="0.5" stop-color="#5aa0e0"/><stop offset="1" stop-color="${ORANGE}"/></linearGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#ng)"/>
<rect width="${W}" height="${H}" fill="url(#glow)"/>
${textPath({ text: "PERSPECTIVE", x: 64, y: 92, fontSize: 30, color: "#ffffff", bold: true })}
${textPath({ text: "STUDIO", x: 64, y: 126, fontSize: 30, color: "#ffffff", bold: true })}
${textPath({ text: d.name, x: 60, y: 455, fontSize: 86, color: "#ffffff", bold: true })}
${d.role ? textPath({ text: d.role, x: 64, y: 510, fontSize: 34, color: LIME, bold: true }) : ""}
${d.website ? textPath({ text: d.website, x: 64, y: 556, fontSize: 28, color: MUTED }) : ""}
<circle cx="930" cy="540" r="15" fill="none" stroke="${ORANGE}" stroke-width="7"/>
<rect x="0" y="${H - 18}" width="${W}" height="18" fill="url(#strip)"/>
</svg>`;
}

/** Back (lime): wordmark, tagline, contacts, orange pill, navy blob, QR. */
function backSvg(d: PerspectiveDetails): string {
  const line = (label: string, value: string, y: number) =>
    value
      ? textPath({ text: label, x: 64, y, fontSize: 26, color: ORANGE, bold: true }) +
        textPath({ text: value, x: 108, y, fontSize: 26, color: NAVY })
      : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<rect width="${W}" height="${H}" fill="${LIME}"/>
<circle cx="${W - 70}" cy="60" r="120" fill="${NAVY}"/>
${textPath({ text: "PERSPECTIVE", x: 64, y: 120, fontSize: 32, color: NAVY, bold: true })}
${textPath({ text: "STUDIO", x: 64, y: 154, fontSize: 32, color: NAVY, bold: true })}
${textPath({ text: "Bold creative work that’s", x: 64, y: 250, fontSize: 42, color: NAVY, bold: true })}
${textPath({ text: "impossible to ignore.", x: 64, y: 300, fontSize: 42, color: NAVY, bold: true })}
${line("E", d.email, 405)}
${line("T", d.phone, 450)}
${line("W", d.website, 495)}
<rect x="64" y="540" width="360" height="60" rx="30" fill="${ORANGE}"/>
${textPath({ text: "Scan · See the work →", x: 244, y: 578, fontSize: 24, color: "#ffffff", align: "center", bold: true })}
<rect x="775" y="392" width="180" height="180" rx="22" fill="#ffffff"/>
${textPath({ text: "SCAN FOR PORTFOLIO", x: 865, y: 600, fontSize: 18, color: NAVY, align: "center", bold: true })}
</svg>`;
}

/** Render one side of the Perspective Studio card as a print-ready PNG. */
export async function renderPerspectiveSide(
  side: "front" | "back",
  d: PerspectiveDetails,
): Promise<Buffer> {
  if (side === "front") {
    return sharp(Buffer.from(frontSvg(d))).png().toBuffer();
  }
  const base = await sharp(Buffer.from(backSvg(d))).png().toBuffer();
  const qr = await QRCode.toBuffer(d.profileUrl || "https://pixcards.co.uk", {
    width: 150,
    margin: 1,
    color: { dark: NAVY, light: "#ffffff" },
  });
  return sharp(base).composite([{ input: qr, top: 407, left: 790 }]).png().toBuffer();
}

/** Registry of built-in card presets (extensible). */
export const CARD_PRESETS = ["perspective"] as const;
export type CardPreset = (typeof CARD_PRESETS)[number];
