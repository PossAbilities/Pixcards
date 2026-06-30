import "server-only";
import sharp from "sharp";
import QRCode from "qrcode";
import { textOverlay, type TextSvgOpts } from "@/lib/text-render";

// Base CR80 at 300 DPI; rendered at SCALE× for print-grade output (~600 DPI).
const BASE_W = 1013;
const BASE_H = 638;
const SCALE = 2;
const W = BASE_W * SCALE;
const H = BASE_H * SCALE;
const u = (n: number) => n * SCALE; // base unit → output px

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
  logoUrl?: string | null; // white logo for the front (replaces the wordmark)
};

/** Decode a data: URL or fetch a URL into image bytes, or null. */
async function toBytes(value?: string | null): Promise<Buffer | null> {
  if (!value) return null;
  try {
    if (value.startsWith("data:")) {
      const m = /^data:[^;,]*(;base64)?,([\s\S]*)$/.exec(value);
      if (!m) return null;
      return m[1] ? Buffer.from(m[2], "base64") : Buffer.from(decodeURIComponent(m[2]), "utf8");
    }
    const res = await fetch(value);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/** Collect text lines (scaled), drop empties, composite in one pass. */
async function compositeText(base: Buffer, lines: TextSvgOpts[]): Promise<Buffer> {
  const scaled = lines.map((l) => ({
    ...l,
    x: u(l.x),
    y: u(l.y),
    fontSize: u(l.fontSize),
  }));
  const layers = (await Promise.all(scaled.map((l) => textOverlay(l)))).filter(
    (x): x is { input: Buffer; top: number; left: number } => Boolean(x),
  );
  return sharp(base).composite(layers).png().toBuffer();
}

/** Front (navy): logo (or wordmark), name, lime role, website, ring, strip. */
async function renderFront(d: PerspectiveDetails): Promise<Buffer> {
  const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<defs>
 <linearGradient id="ng" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1a2046"/><stop offset="0.6" stop-color="#0f1330"/><stop offset="1" stop-color="#0a0d22"/></linearGradient>
 <radialGradient id="glow" cx="0.78" cy="0.18" r="0.42"><stop offset="0" stop-color="#3a4684" stop-opacity="0.55"/><stop offset="1" stop-color="#3a4684" stop-opacity="0"/></radialGradient>
 <linearGradient id="strip" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${LIME}"/><stop offset="0.5" stop-color="#5aa0e0"/><stop offset="1" stop-color="${ORANGE}"/></linearGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#ng)"/>
<rect width="${W}" height="${H}" fill="url(#glow)"/>
<circle cx="${u(930)}" cy="${u(540)}" r="${u(15)}" fill="none" stroke="${ORANGE}" stroke-width="${u(7)}"/>
<rect x="0" y="${u(BASE_H - 18)}" width="${W}" height="${u(18)}" fill="url(#strip)"/>
</svg>`;
  let base = await sharp(Buffer.from(bg)).png().toBuffer();

  // Top-left: a white logo if supplied, else the typographic wordmark.
  const logo = await toBytes(d.logoUrl);
  if (logo) {
    const logoH = u(80);
    const img = await sharp(logo).resize({ height: logoH, fit: "inside" }).png().toBuffer();
    base = await sharp(base).composite([{ input: img, top: u(56), left: u(64) }]).png().toBuffer();
  } else {
    base = await compositeText(base, [
      { text: "PERSPECTIVE", x: 64, y: 92, fontSize: 30, color: "#ffffff", font: "montserrat" },
      { text: "STUDIO", x: 64, y: 126, fontSize: 30, color: "#ffffff", font: "montserrat" },
    ]);
  }

  return compositeText(base, [
    { text: d.name, x: 60, y: 455, fontSize: 86, color: "#ffffff", font: "montserrat" },
    ...(d.role ? [{ text: d.role, x: 64, y: 510, fontSize: 34, color: LIME, font: "montserrat" as const }] : []),
    ...(d.website ? [{ text: d.website, x: 64, y: 556, fontSize: 28, color: MUTED, font: "dmsans" as const }] : []),
  ]);
}

// Small line-icons (orange) next to each contact line. Scaled into the bg SVG.
function mailIcon(x: number, y: number): string {
  return `<g transform="translate(${u(x)},${u(y)}) scale(${SCALE})"><rect x="0" y="3" width="28" height="19" rx="3.5" fill="none" stroke="${ORANGE}" stroke-width="2.6"/><path d="M1.5 6 L14 15 L26.5 6" fill="none" stroke="${ORANGE}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></g>`;
}
function phoneIcon(x: number, y: number): string {
  return `<g transform="translate(${u(x)},${u(y)}) scale(${SCALE})"><rect x="6" y="1" width="16" height="24" rx="3.5" fill="none" stroke="${ORANGE}" stroke-width="2.6"/><line x1="11" y1="20.5" x2="17" y2="20.5" stroke="${ORANGE}" stroke-width="2.6" stroke-linecap="round"/></g>`;
}
function globeIcon(x: number, y: number): string {
  return `<g transform="translate(${u(x)},${u(y)}) scale(${SCALE})"><circle cx="13" cy="13" r="12" fill="none" stroke="${ORANGE}" stroke-width="2.4"/><ellipse cx="13" cy="13" rx="5.5" ry="12" fill="none" stroke="${ORANGE}" stroke-width="2.2"/><line x1="1.5" y1="13" x2="24.5" y2="13" stroke="${ORANGE}" stroke-width="2.2"/></g>`;
}

/** Back (lime): wordmark, tagline, contacts, orange pill, navy blob, QR. */
async function renderBack(d: PerspectiveDetails): Promise<Buffer> {
  const icons = [
    d.email ? mailIcon(60, 405 - 19) : "",
    d.phone ? phoneIcon(60, 450 - 19) : "",
    d.website ? globeIcon(60, 495 - 19) : "",
  ].join("");

  const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<rect width="${W}" height="${H}" fill="${LIME}"/>
<circle cx="${u(BASE_W - 70)}" cy="${u(60)}" r="${u(120)}" fill="${NAVY}"/>
<rect x="${u(64)}" y="${u(540)}" width="${u(360)}" height="${u(60)}" rx="${u(30)}" fill="${ORANGE}"/>
<rect x="${u(775)}" y="${u(392)}" width="${u(180)}" height="${u(180)}" rx="${u(22)}" fill="#ffffff"/>
${icons}
</svg>`;
  let base = await sharp(Buffer.from(bg)).png().toBuffer();

  const lines: TextSvgOpts[] = [
    { text: "PERSPECTIVE", x: 64, y: 120, fontSize: 32, color: NAVY, font: "montserrat" },
    { text: "STUDIO", x: 64, y: 154, fontSize: 32, color: NAVY, font: "montserrat" },
    { text: "Bold creative work that’s", x: 64, y: 250, fontSize: 42, color: NAVY, font: "montserrat" },
    { text: "impossible to ignore.", x: 64, y: 300, fontSize: 42, color: NAVY, font: "montserrat" },
    { text: "Scan · See the work →", x: 244, y: 578, fontSize: 24, color: "#ffffff", align: "center", font: "montserrat" },
  ];
  const contact = (value: string, y: number): TextSvgOpts[] =>
    value ? [{ text: value, x: 104, y, fontSize: 26, color: NAVY, font: "dmsans" }] : [];
  lines.push(...contact(d.email, 405), ...contact(d.phone, 450), ...contact(d.website, 495));

  base = await compositeText(base, lines);

  const qr = await QRCode.toBuffer(d.profileUrl || "https://pixcards.co.uk", {
    width: u(150),
    margin: 1,
    color: { dark: NAVY, light: "#ffffff" },
  });
  return sharp(base).composite([{ input: qr, top: u(407), left: u(790) }]).png().toBuffer();
}

/** Render one side of the Perspective Studio card as a print-ready PNG. */
export async function renderPerspectiveSide(
  side: "front" | "back",
  d: PerspectiveDetails,
): Promise<Buffer> {
  return side === "front" ? renderFront(d) : renderBack(d);
}

/** Registry of built-in card presets (extensible). */
export const CARD_PRESETS = ["perspective"] as const;
export type CardPreset = (typeof CARD_PRESETS)[number];
