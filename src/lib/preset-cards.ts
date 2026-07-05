import "server-only";
import sharp from "sharp";
import { PRINT_SCALE } from "@/lib/card-artwork";
import { textWidth } from "@/lib/text-render";
import type { CardTemplateSpec, TemplateElement } from "@/lib/card-template";

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
  // The width/viewBox ratio already rasterises at PRINT_SCALE — no transform
  // (an extra scale() here double-scales and crops the artwork to a corner).
  // The 2-unit padding keeps stroke edges from clipping at the viewBox.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${u(32)}" height="${u(30)}" viewBox="-2 -2 32 30">${shapes[kind]}</svg>`;
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
        // Sits exactly over the orange pill baked into the chrome (x 64→424,
        // y 540→600 base px) — same x/width so centred text stays inside it.
        { id: eid(), kind: "text", x: 0.063, y: 0.868, w: 0.355, h: 0.07, text: "Scan · See the work →", color: "#ffffff", fontSize: 24, fontWeight: 700, align: "center" },
        { id: eid(), kind: "qr", x: 0.765, y: 0.614, w: 0.178, h: 0.282 },
      ],
    },
  };
}

/* ========================================================================== *
 *  PossAbilities — deep purple + magenta wordmark, teal accent.
 *  White info side (front) / purple brand side (back).
 * ========================================================================== */

const PA_PURPLE = "#3f2160"; // "Poss" / dark brand purple
const PA_DEEP = "#2b1547"; // darkest gradient stop
const PA_MAGENTA = "#e0007a"; // "Abilities" / accent
const PA_TEAL = "#16a79f"; // TAP circle, dividers
const PA_INK = "#2b1747"; // body text on white

/** White contact icon glyph on a magenta disc. */
async function paIcon(kind: "phone" | "mail" | "globe" | "pin"): Promise<string> {
  const glyphs: Record<typeof kind, string> = {
    phone: `<path d="M11 10.5c-0.3 2.4 3.1 5.8 5.5 5.5l1.4-1.7 2.6 1.1-0.3 2.4c-4.6 1-9.5-3.9-8.5-8.5l2.4-0.3 1.1 2.6z" fill="#fff"/>`,
    mail: `<rect x="7.5" y="9.5" width="13" height="9" rx="1.8" fill="none" stroke="#fff" stroke-width="1.8"/><path d="M8 10.5 14 15 20 10.5" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
    globe: `<circle cx="14" cy="14" r="6.2" fill="none" stroke="#fff" stroke-width="1.7"/><ellipse cx="14" cy="14" rx="2.8" ry="6.2" fill="none" stroke="#fff" stroke-width="1.5"/><line x1="7.8" y1="14" x2="20.2" y2="14" stroke="#fff" stroke-width="1.5"/>`,
    pin: `<path d="M14 7.5c-3 0-5.2 2.3-5.2 5.2 0 3.6 5.2 8.3 5.2 8.3s5.2-4.7 5.2-8.3c0-2.9-2.2-5.2-5.2-5.2z" fill="none" stroke="#fff" stroke-width="1.8"/><circle cx="14" cy="12.6" r="1.9" fill="#fff"/>`,
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${u(30)}" height="${u(30)}" viewBox="0 0 28 28"><circle cx="14" cy="14" r="14" fill="${PA_MAGENTA}"/>${glyphs[kind]}</svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

/** Front chrome (white): brand mark watermark, divider, teal NFC disc, QR plate. */
async function paFrontChromeDataUrl(): Promise<string> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<rect width="${W}" height="${H}" fill="#ffffff"/>
<!-- decorative brandmark, bottom-left, cropped by the edge -->
<circle cx="${u(285)}" cy="${u(705)}" r="${u(120)}" fill="${PA_PURPLE}"/>
<circle cx="${u(388)}" cy="${u(700)}" r="${u(66)}" fill="${PA_MAGENTA}"/>
<!-- teal accent divider below the role -->
<rect x="${u(128)}" y="${u(322)}" width="${u(64)}" height="${u(5)}" rx="${u(2.5)}" fill="${PA_TEAL}"/>
<!-- faint vertical divider between details and the tap/QR area -->
<rect x="${u(662)}" y="${u(120)}" width="${u(2)}" height="${u(400)}" fill="#e7e2ee"/>
<!-- teal TAP disc + white NFC arcs -->
<circle cx="${u(858)}" cy="${u(188)}" r="${u(82)}" fill="${PA_TEAL}"/>
<g fill="none" stroke="#ffffff" stroke-width="${u(6)}" stroke-linecap="round">
 <path d="M ${u(838)} ${u(168)} a ${u(20)} ${u(20)} 0 0 1 ${u(40)} 0"/>
 <path d="M ${u(826)} ${u(176)} a ${u(32)} ${u(32)} 0 0 1 ${u(64)} 0"/>
 <path d="M ${u(814)} ${u(184)} a ${u(44)} ${u(44)} 0 0 1 ${u(88)} 0"/>
</g>
<!-- QR plate border -->
<rect x="${u(715)}" y="${u(360)}" width="${u(200)}" height="${u(200)}" rx="${u(18)}" fill="none" stroke="${PA_PURPLE}" stroke-width="${u(4)}"/>
</svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

/** Back chrome (purple): gradient, faint P watermarks, centred teal divider. */
async function paBackChromeDataUrl(): Promise<string> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<defs>
 <linearGradient id="pg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${PA_PURPLE}"/><stop offset="0.55" stop-color="#341a52"/><stop offset="1" stop-color="${PA_DEEP}"/></linearGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#pg)"/>
<!-- faint oversized brandmarks -->
<circle cx="${u(120)}" cy="${u(120)}" r="${u(150)}" fill="#ffffff" opacity="0.04"/>
<circle cx="${u(900)}" cy="${u(560)}" r="${u(190)}" fill="#ffffff" opacity="0.04"/>
<circle cx="${u(760)}" cy="${u(90)}" r="${u(90)}" fill="${PA_MAGENTA}" opacity="0.10"/>
<!-- centred teal divider under the wordmark -->
<rect x="${u(BASE_W / 2 - 45)}" y="${u(330)}" width="${u(90)}" height="${u(5)}" rx="${u(2.5)}" fill="${PA_TEAL}"/>
<!-- small footer brandmark dot -->
<circle cx="${u(360)}" cy="${u(556)}" r="${u(14)}" fill="${PA_MAGENTA}"/>
</svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

let _paCache: Promise<{
  front: string;
  back: string;
  phone: string;
  mail: string;
  globe: string;
}> | null = null;
function paChrome() {
  if (!_paCache) {
    _paCache = Promise.all([
      paFrontChromeDataUrl(),
      paBackChromeDataUrl(),
      paIcon("phone"),
      paIcon("mail"),
      paIcon("globe"),
    ]).then(([front, back, phone, mail, globe]) => ({ front, back, phone, mail, globe }));
  }
  return _paCache;
}

/** Two-tone "PossAbilities" wordmark as a pair of text elements. `centerX`
 *  (normalised) centres the pair; otherwise `leftX` (normalised) left-aligns. */
function paWordmark(opts: {
  y: number;
  size: number;
  possColor: string;
  abilColor: string;
  leftX?: number;
  centerX?: number;
}): TemplateElement[] {
  const poss = "Poss";
  const abil = "Abilities";
  // Measured regular; nudged up for the bold weight the card renders at so the
  // two words abut like one wordmark rather than overlapping.
  const possW = (textWidth(poss, opts.size, "sans") * 1.06) / BASE_W;
  const abilW = (textWidth(abil, opts.size, "sans") * 1.06) / BASE_W;
  const startX =
    opts.centerX != null ? opts.centerX - (possW + abilW) / 2 : (opts.leftX ?? 0.126);
  const yN = opts.y / BASE_H;
  return [
    { id: eid(), kind: "text", x: startX, y: yN, w: possW + 0.02, h: 0.08, text: poss, color: opts.possColor, fontSize: opts.size, fontWeight: 800, align: "left" },
    { id: eid(), kind: "text", x: startX + possW, y: yN, w: abilW + 0.04, h: 0.08, text: abil, color: opts.abilColor, fontSize: opts.size, fontWeight: 800, align: "left" },
  ];
}

/**
 * The "PossAbilities" starting template — white info side (logo, name, role,
 * contacts, teal NFC disc, QR) and a purple brand side (wordmark, tagline,
 * EMPOWER · INCLUDE · ACHIEVE, footer). All text is editable, same as the
 * Perspective preset.
 */
export async function defaultPossabilitiesSpec(): Promise<CardTemplateSpec> {
  const c = await paChrome();
  return {
    front: {
      bg: `url("${c.front}")`,
      elements: [
        ...paWordmark({ y: 60, size: 44, possColor: PA_PURPLE, abilColor: PA_MAGENTA, leftX: 0.126 }),
        { id: eid(), kind: "text", x: 0.127, y: 0.205, w: 0.5, h: 0.05, text: "ENABLING INCLUSIVE POSSIBILITIES", color: PA_PURPLE, fontSize: 15, fontWeight: 600, align: "left" },
        { id: eid(), kind: "text", x: 0.126, y: 0.35, w: 0.5, h: 0.1, text: "{{name}}", color: PA_INK, fontSize: 42, fontWeight: 800, align: "left" },
        { id: eid(), kind: "text", x: 0.127, y: 0.44, w: 0.5, h: 0.06, text: "{{title}}", color: PA_MAGENTA, fontSize: 20, fontWeight: 700, align: "left" },
        // contact rows
        { id: eid(), kind: "image", x: 0.126, y: 0.53, w: 0.03, h: 0.047, src: c.phone },
        { id: eid(), kind: "text", x: 0.178, y: 0.532, w: 0.4, h: 0.05, text: "{{phone}}", color: PA_INK, fontSize: 22, fontWeight: 500, align: "left" },
        { id: eid(), kind: "image", x: 0.126, y: 0.62, w: 0.03, h: 0.047, src: c.mail },
        { id: eid(), kind: "text", x: 0.178, y: 0.622, w: 0.45, h: 0.05, text: "{{email}}", color: PA_INK, fontSize: 22, fontWeight: 500, align: "left" },
        { id: eid(), kind: "image", x: 0.126, y: 0.71, w: 0.03, h: 0.047, src: c.globe },
        { id: eid(), kind: "text", x: 0.178, y: 0.712, w: 0.45, h: 0.05, text: "possabilities.com.au", color: PA_INK, fontSize: 22, fontWeight: 500, align: "left" },
        // tap disc labels
        { id: eid(), kind: "text", x: 0.757, y: 0.31, w: 0.2, h: 0.06, text: "TAP", color: "#ffffff", fontSize: 26, fontWeight: 800, align: "center" },
        { id: eid(), kind: "text", x: 0.757, y: 0.375, w: 0.2, h: 0.04, text: "WITH NFC", color: "#ffffff", fontSize: 13, fontWeight: 700, align: "center" },
        // scan + QR
        { id: eid(), kind: "text", x: 0.7, y: 0.5, w: 0.235, h: 0.04, text: "SCAN TO CONNECT", color: PA_PURPLE, fontSize: 15, fontWeight: 700, align: "center" },
        { id: eid(), kind: "qr", x: 0.732, y: 0.585, w: 0.166, h: 0.263 },
      ],
    },
    back: {
      bg: `url("${c.back}")`,
      elements: [
        ...paWordmark({ y: 200, size: 62, possColor: "#ffffff", abilColor: PA_MAGENTA, centerX: 0.5 }),
        { id: eid(), kind: "text", x: 0.15, y: 0.45, w: 0.7, h: 0.05, text: "ENABLING INCLUSIVE POSSIBILITIES", color: "#ffffff", fontSize: 18, fontWeight: 600, align: "center" },
        { id: eid(), kind: "text", x: 0.1, y: 0.6, w: 0.8, h: 0.06, text: "EMPOWER   ·   INCLUDE   ·   ACHIEVE", color: "#ffffff", fontSize: 22, fontWeight: 700, align: "center" },
        { id: eid(), kind: "text", x: 0.42, y: 0.845, w: 0.45, h: 0.05, text: "possabilities.com.au", color: "#ffffff", fontSize: 24, fontWeight: 600, align: "left" },
      ],
    },
  };
}

/** Build a preset's starting card spec by id (defaults to Perspective). */
export async function presetSpec(preset?: string | null): Promise<CardTemplateSpec> {
  if (preset === "possabilities") return defaultPossabilitiesSpec();
  return defaultPerspectiveSpec();
}

/** Registry of built-in card starting templates (extensible). */
export const CARD_PRESETS = ["perspective", "possabilities"] as const;
export type CardPreset = (typeof CARD_PRESETS)[number];
