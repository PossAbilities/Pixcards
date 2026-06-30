import "server-only";
import sharp from "sharp";
import { PRINT_SCALE } from "@/lib/card-artwork";
import type { CardTemplateSpec } from "@/lib/card-template";

// Base CR80 canvas; decorative chrome is pre-baked at PRINT_SCALE so it stays
// crisp once it becomes the SideSpec background image.
const BASE_W = 1013;
const BASE_H = 638;
const W = BASE_W * PRINT_SCALE;
const H = BASE_H * PRINT_SCALE;
const u = (n: number) => n * PRINT_SCALE;

const NAVY = "#12142f";
const LIME = "#c7ec4f";
const ORANGE = "#ff5a1f";

let _id = 0;
const eid = () => `seed_${Date.now().toString(36)}_${_id++}`;

/** Decorative chrome only (no text) — the editable elements sit on top. */
async function frontChromeDataUrl(): Promise<string> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
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
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

/** Decorative chrome only (no text) — lime, navy blob, white QR plate, pill. */
async function backChromeDataUrl(): Promise<string> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<rect width="${W}" height="${H}" fill="${LIME}"/>
<circle cx="${u(BASE_W - 70)}" cy="${u(60)}" r="${u(120)}" fill="${NAVY}"/>
<rect x="${u(64)}" y="${u(540)}" width="${u(360)}" height="${u(60)}" rx="${u(30)}" fill="${ORANGE}"/>
<rect x="${u(775)}" y="${u(392)}" width="${u(180)}" height="${u(180)}" rx="${u(22)}" fill="#ffffff"/>
</svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

async function iconDataUrl(kind: "mail" | "phone" | "globe"): Promise<string> {
  const shapes: Record<typeof kind, string> = {
    mail: `<rect x="0" y="3" width="28" height="19" rx="3.5" fill="none" stroke="${ORANGE}" stroke-width="2.6"/><path d="M1.5 6 L14 15 L26.5 6" fill="none" stroke="${ORANGE}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,
    phone: `<rect x="6" y="1" width="16" height="24" rx="3.5" fill="none" stroke="${ORANGE}" stroke-width="2.6"/><line x1="11" y1="20.5" x2="17" y2="20.5" stroke="${ORANGE}" stroke-width="2.6" stroke-linecap="round"/>`,
    globe: `<circle cx="13" cy="13" r="12" fill="none" stroke="${ORANGE}" stroke-width="2.4"/><ellipse cx="13" cy="13" rx="5.5" ry="12" fill="none" stroke="${ORANGE}" stroke-width="2.2"/><line x1="1.5" y1="13" x2="24.5" y2="13" stroke="${ORANGE}" stroke-width="2.2"/>`,
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${u(28)}" height="${u(26)}" viewBox="0 0 28 26"><g transform="scale(${PRINT_SCALE})">${shapes[kind]}</g></svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

let _cache: Promise<{
  front: string;
  back: string;
  mail: string;
  phone: string;
  globe: string;
}> | null = null;
/** Bake (once per server instance) and cache the decorative chrome + icons. */
function chromeBackgrounds() {
  if (!_cache) {
    _cache = Promise.all([
      frontChromeDataUrl(),
      backChromeDataUrl(),
      iconDataUrl("mail"),
      iconDataUrl("phone"),
      iconDataUrl("globe"),
    ]).then(([front, back, mail, phone, globe]) => ({ front, back, mail, phone, globe }));
  }
  return _cache;
}

/**
 * The "Perspective Studio" starting template: polished navy/lime chrome as
 * the background, with name/role/contact/CTA as real, fully-editable text
 * elements (move, resize, restyle, delete, or replace with a logo image —
 * same drag/drop tools as the organisation card designer).
 */
export async function defaultPerspectiveSpec(): Promise<CardTemplateSpec> {
  const chrome = await chromeBackgrounds();
  return {
    front: {
      bg: `url("${chrome.front}")`,
      elements: [
        { id: eid(), kind: "text", x: 0.063, y: 0.121, w: 0.45, h: 0.06, text: "PERSPECTIVE", color: "#ffffff", fontSize: 30, fontWeight: 700, align: "left" },
        { id: eid(), kind: "text", x: 0.063, y: 0.179, w: 0.45, h: 0.06, text: "STUDIO", color: "#ffffff", fontSize: 30, fontWeight: 700, align: "left" },
        { id: eid(), kind: "text", x: 0.059, y: 0.58, w: 0.75, h: 0.16, text: "{{name}}", color: "#ffffff", fontSize: 86, fontWeight: 800, align: "left" },
        { id: eid(), kind: "text", x: 0.063, y: 0.73, w: 0.7, h: 0.08, text: "{{title}}", color: LIME, fontSize: 34, fontWeight: 700, align: "left" },
        { id: eid(), kind: "text", x: 0.063, y: 0.81, w: 0.7, h: 0.07, text: "perspectivestudio.co.uk", color: "#9aa6c8", fontSize: 28, fontWeight: 500, align: "left" },
      ],
    },
    back: {
      bg: `url("${chrome.back}")`,
      elements: [
        { id: eid(), kind: "text", x: 0.063, y: 0.121, w: 0.5, h: 0.06, text: "PERSPECTIVE", color: NAVY, fontSize: 32, fontWeight: 700, align: "left" },
        { id: eid(), kind: "text", x: 0.063, y: 0.179, w: 0.5, h: 0.06, text: "STUDIO", color: NAVY, fontSize: 32, fontWeight: 700, align: "left" },
        { id: eid(), kind: "text", x: 0.063, y: 0.345, w: 0.65, h: 0.09, text: "Bold creative work that’s", color: NAVY, fontSize: 42, fontWeight: 800, align: "left" },
        { id: eid(), kind: "text", x: 0.063, y: 0.42, w: 0.65, h: 0.09, text: "impossible to ignore.", color: NAVY, fontSize: 42, fontWeight: 800, align: "left" },
        { id: eid(), kind: "image", x: 0.059, y: 0.578, w: 0.028, h: 0.042, src: chrome.mail },
        { id: eid(), kind: "text", x: 0.103, y: 0.578, w: 0.45, h: 0.06, text: "{{email}}", color: NAVY, fontSize: 26, fontWeight: 500, align: "left" },
        { id: eid(), kind: "image", x: 0.059, y: 0.673, w: 0.028, h: 0.042, src: chrome.phone },
        { id: eid(), kind: "text", x: 0.103, y: 0.673, w: 0.45, h: 0.06, text: "{{phone}}", color: NAVY, fontSize: 26, fontWeight: 500, align: "left" },
        { id: eid(), kind: "image", x: 0.059, y: 0.768, w: 0.028, h: 0.042, src: chrome.globe },
        { id: eid(), kind: "text", x: 0.103, y: 0.768, w: 0.45, h: 0.06, text: "perspectivestudio.co.uk", color: NAVY, fontSize: 26, fontWeight: 500, align: "left" },
        { id: eid(), kind: "text", x: 0.24, y: 0.879, w: 0.32, h: 0.07, text: "Scan · See the work →", color: "#ffffff", fontSize: 24, fontWeight: 700, align: "center" },
        { id: eid(), kind: "qr", x: 0.765, y: 0.614, w: 0.178, h: 0.282 },
      ],
    },
  };
}

/** Registry of built-in card starting templates (extensible). */
export const CARD_PRESETS = ["perspective"] as const;
export type CardPreset = (typeof CARD_PRESETS)[number];
