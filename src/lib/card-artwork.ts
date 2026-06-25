import "server-only";
import sharp from "sharp";
import QRCode from "qrcode";
import { nfcMarkSvg } from "@/lib/nfc-logo";
import {
  applyMerge,
  type CardTemplateSpec,
  type MergeData,
  type SideSpec,
} from "@/lib/card-template";

// ~CR80 at 300 DPI (85.6 × 54 mm).
const W = 1013;
const H = 638;

/** Decode a data: URL into raw bytes, or null. */
function dataUrlToBuffer(value?: string): Buffer | null {
  if (!value) return null;
  const m = /^data:[^;,]*(;base64)?,([\s\S]*)$/.exec(value);
  if (!m) return null;
  return m[1]
    ? Buffer.from(m[2], "base64")
    : Buffer.from(decodeURIComponent(m[2]), "utf8");
}

function esc(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Parse a CSS `linear-gradient(...)` into an SVG <linearGradient> def + the
 * fill reference, or return null if the value isn't a usable gradient.
 * The angle is approximated as a 135° diagonal (top-left → bottom-right).
 */
function gradientDef(value: string | undefined, id: string): string | null {
  if (!value || !value.includes("gradient")) return null;
  const stops = [...value.matchAll(/(#[0-9a-fA-F]{6})\s*(\d+)?%?/g)];
  if (stops.length < 2) return null;
  const n = stops.length;
  const inner = stops
    .map((m, i) => {
      const offset = m[2] !== undefined ? Number(m[2]) : Math.round((i / (n - 1)) * 100);
      return `<stop offset="${Math.max(0, Math.min(100, offset))}%" stop-color="${m[1]}"/>`;
    })
    .join("");
  return `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">${inner}</linearGradient>`;
}

/** Pick black or white text for legibility against a solid hex background. */
function readableInk(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? "#191c1e" : "#ffffff";
}

/**
 * Render a print-ready PNG of a member's card with their details baked in:
 * brand-colour (solid or gradient) background, name + role + company
 * bottom-left, QR (their profile URL) top-right, optional NFC logo.
 * Full-bleed, server-side (no browser).
 */
export async function renderMemberCardPng(opts: {
  name: string;
  jobTitle?: string;
  company?: string;
  accentColor: string;
  /** Optional brand gradient (CSS linear-gradient) used as the background. */
  brandHeader?: string | null;
  profileUrl: string;
  /** Bake the official NFC "tap" logo onto the card. */
  nfcLogo?: boolean;
}): Promise<Buffer> {
  const accent = /^#[0-9a-fA-F]{6}$/.test(opts.accentColor)
    ? opts.accentColor
    : "#4f46e5";
  const grad = gradientDef(opts.brandHeader ?? undefined, "bg");
  const fill = grad ? "url(#bg)" : accent;
  // Gradients here always run brand colours → assume light text; for a solid
  // fill choose the readable ink for that colour.
  const ink = grad ? "#ffffff" : readableInk(accent);
  const fade = ink === "#ffffff" ? "0.92" : "0.78";

  const sub = [opts.jobTitle, opts.company]
    .filter((x): x is string => Boolean(x))
    .map(esc);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    ${grad ? `<defs>${grad}</defs>` : ""}
    <rect width="${W}" height="${H}" fill="${fill}"/>
    <text x="64" y="${H - 150}" font-family="Helvetica, Arial, sans-serif" font-size="62" font-weight="700" fill="${ink}">${esc(opts.name)}</text>
    ${sub[0] ? `<text x="66" y="${H - 98}" font-family="Helvetica, Arial, sans-serif" font-size="33" fill="${ink}" fill-opacity="${fade}">${sub[0]}</text>` : ""}
    ${sub[1] ? `<text x="66" y="${H - 54}" font-family="Helvetica, Arial, sans-serif" font-size="33" fill="${ink}" fill-opacity="${fade}">${sub[1]}</text>` : ""}
  </svg>`;

  const base = await sharp(Buffer.from(svg)).png().toBuffer();
  const qr = await QRCode.toBuffer(opts.profileUrl, {
    width: 210,
    margin: 2,
    color: { dark: "#191c1e", light: "#ffffff" },
  });

  const layers: sharp.OverlayOptions[] = [
    { input: qr, top: 64, left: W - 210 - 64 },
  ];

  if (opts.nfcLogo) {
    const markH = 150;
    const mark = await sharp(Buffer.from(nfcMarkSvg({ color: ink, label: true })))
      .resize({ height: markH })
      .png()
      .toBuffer();
    // Bottom-right corner, clear of the name (bottom-left) and QR (top-right).
    layers.push({ input: mark, top: H - markH - 48, left: W - 120 - 64 });
  }

  return sharp(base).composite(layers).png().toBuffer();
}

/* -------------------------- Template rendering --------------------------- */

/** Render one side of an org card template with a member's details merged in. */
export async function renderTemplateSidePng(
  side: SideSpec,
  merge: MergeData,
): Promise<Buffer> {
  // Background: image, gradient, or solid colour.
  let base: Buffer;
  const bgImg = side.bg.startsWith("url(")
    ? dataUrlToBuffer(side.bg.slice(side.bg.indexOf("(") + 1, side.bg.lastIndexOf(")")).replace(/['"]/g, ""))
    : null;
  if (bgImg) {
    base = await sharp(bgImg).resize(W, H, { fit: "cover" }).png().toBuffer();
  } else {
    const grad = gradientDef(side.bg, "bg");
    const fill = grad ? "url(#bg)" : /^#[0-9a-fA-F]{6}$/.test(side.bg) ? side.bg : "#ffffff";
    const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${grad ? `<defs>${grad}</defs>` : ""}<rect width="${W}" height="${H}" fill="${fill}"/></svg>`;
    base = await sharp(Buffer.from(bgSvg)).png().toBuffer();
  }

  const layers: sharp.OverlayOptions[] = [];
  const textParts: string[] = [];

  for (const el of side.elements) {
    const left = Math.round(el.x * W);
    const top = Math.round(el.y * H);
    const w = Math.max(1, Math.round(el.w * W));
    const h = Math.max(1, Math.round(el.h * H));

    if (el.kind === "text") {
      const content = esc(applyMerge(el.text ?? "", merge));
      if (!content) continue;
      const size = Math.round(el.fontSize ?? 34);
      const weight = el.fontWeight ?? 600;
      const color = el.color ?? "#ffffff";
      const anchor = el.align === "center" ? "middle" : el.align === "right" ? "end" : "start";
      const tx = el.align === "center" ? left + w / 2 : el.align === "right" ? left + w : left;
      const ty = top + size; // baseline
      textParts.push(
        `<text x="${tx}" y="${ty}" font-family="Helvetica, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}">${content}</text>`,
      );
    } else if (el.kind === "image") {
      const buf = dataUrlToBuffer(el.src);
      if (!buf) continue;
      const img = await sharp(buf)
        .resize(w, h, { fit: "inside" })
        .png()
        .toBuffer();
      layers.push({ input: img, top, left });
    } else if (el.kind === "qr") {
      const qr = await QRCode.toBuffer(merge.url || "https://pixcards.co.uk", {
        width: Math.max(w, h),
        margin: 1,
        color: { dark: "#191c1e", light: "#ffffff" },
      });
      layers.push({ input: qr, top, left });
    } else if (el.kind === "nfc") {
      const mark = await sharp(
        Buffer.from(nfcMarkSvg({ color: el.nfcColor ?? "#ffffff", label: true })),
      )
        .resize({ height: h })
        .png()
        .toBuffer();
      layers.push({ input: mark, top, left });
    }
  }

  if (textParts.length) {
    const textSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${textParts.join("")}</svg>`;
    layers.push({ input: Buffer.from(textSvg), top: 0, left: 0 });
  }

  return sharp(base).composite(layers).png().toBuffer();
}

/**
 * Render a member's card side: use the org's designed template when present,
 * otherwise the built-in auto layout (front = details+QR, back = company+NFC).
 */
export async function renderCardSide(opts: {
  side: "front" | "back";
  template?: CardTemplateSpec | null;
  name: string;
  jobTitle?: string;
  company?: string;
  accentColor: string;
  brandHeader?: string | null;
  profileUrl: string;
  nfcLogo?: boolean;
}): Promise<Buffer> {
  const merge: MergeData = {
    name: opts.name,
    jobTitle: opts.jobTitle ?? "",
    company: opts.company ?? "",
    url: opts.profileUrl,
  };
  if (opts.template) {
    const side = opts.side === "front" ? opts.template.front : opts.template.back;
    return renderTemplateSidePng(side, merge);
  }
  // No template — auto layout.
  if (opts.side === "front") {
    return renderMemberCardPng({
      name: opts.name,
      jobTitle: opts.jobTitle,
      company: opts.company,
      accentColor: opts.accentColor,
      brandHeader: opts.brandHeader,
      profileUrl: opts.profileUrl,
      nfcLogo: opts.nfcLogo,
    });
  }
  return renderAutoBackPng(opts);
}

/** Built-in back side: company centred on the brand colour + NFC prompt. */
async function renderAutoBackPng(opts: {
  company?: string;
  name: string;
  accentColor: string;
  brandHeader?: string | null;
  nfcLogo?: boolean;
}): Promise<Buffer> {
  const accent = /^#[0-9a-fA-F]{6}$/.test(opts.accentColor) ? opts.accentColor : "#4f46e5";
  const grad = gradientDef(opts.brandHeader ?? undefined, "bg");
  const fill = grad ? "url(#bg)" : accent;
  const ink = grad ? "#ffffff" : readableInk(accent);
  const title = esc(opts.company || opts.name);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    ${grad ? `<defs>${grad}</defs>` : ""}
    <rect width="${W}" height="${H}" fill="${fill}"/>
    <text x="${W / 2}" y="${H / 2 - 6}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="56" font-weight="800" fill="${ink}">${title}</text>
    <text x="${W / 2}" y="${H / 2 + 52}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="28" fill="${ink}" fill-opacity="0.8">Tap to connect</text>
  </svg>`;
  const base = await sharp(Buffer.from(svg)).png().toBuffer();

  if (opts.nfcLogo) {
    const markH = 150;
    const mark = await sharp(Buffer.from(nfcMarkSvg({ color: ink, label: true })))
      .resize({ height: markH })
      .png()
      .toBuffer();
    return sharp(base)
      .composite([{ input: mark, top: H - markH - 40, left: Math.round(W / 2 - 60) }])
      .png()
      .toBuffer();
  }
  return base;
}
