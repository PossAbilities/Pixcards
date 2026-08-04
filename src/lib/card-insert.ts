import "server-only";
import sharp from "sharp";
import QRCode from "qrcode";
import { PDFDocument, degrees } from "pdf-lib";
import { renderTextPng, escapePango } from "@/lib/text-render";

/**
 * Server-side A5 fold-card insert as a print-ready PDF. Rendered entirely with
 * sharp (raster halves) + pdf-lib (A5 page assembly) — no headless browser —
 * so it prints identically from any browser/device (Safari's print engine was
 * blanking the CSS version). One A5 page per card: the front cover on the
 * bottom half, the activation/inside on the top half (rotated 180° so it reads
 * upright once the sheet is folded in half).
 */

const DPI = 300;
const MM = DPI / 25.4; // px per mm
const HALF_W = Math.round(148 * MM); // A5 width
const HALF_H = Math.round(105 * MM); // half of A5 height
const PT_PER_MM = 72 / 25.4;

type Stop = { off: number; color: string };
export type InsertTheme = {
  coverStops: Stop[];
  accent: string; // step badges / kicker on the inside
  kicker: string; // "WELCOME" on the cover
  brandName: string;
  footerUrl: string;
  stripStops?: Stop[]; // optional gradient strip along the cover bottom
};

export const INSERT_THEMES: Record<string, InsertTheme> = {
  default: {
    coverStops: [
      { off: 0, color: "#6366f1" },
      { off: 55, color: "#4f46e5" },
      { off: 100, color: "#3525cd" },
    ],
    accent: "#4f46e5",
    kicker: "#c7d2fe",
    brandName: "Pixcards",
    footerUrl: "pixcards.co.uk",
  },
  perspective: {
    coverStops: [
      { off: 0, color: "#1a2046" },
      { off: 60, color: "#0f1330" },
      { off: 100, color: "#0a0d22" },
    ],
    accent: "#4f46e5",
    kicker: "#c7ec4f",
    brandName: "PERSPECTIVE STUDIO",
    footerUrl: "perspectivestudio.co.uk",
    stripStops: [
      { off: 0, color: "#c7ec4f" },
      { off: 50, color: "#5aa0e0" },
      { off: 100, color: "#ff5a1f" },
    ],
  },
  possabilities: {
    coverStops: [
      { off: 0, color: "#3f2160" },
      { off: 55, color: "#341a52" },
      { off: 100, color: "#2b1547" },
    ],
    accent: "#e0007a",
    kicker: "#4fd1c5",
    brandName: "PossAbilities",
    footerUrl: "possabilities.com.au",
    stripStops: [
      { off: 0, color: "#16a79f" },
      { off: 100, color: "#e0007a" },
    ],
  },
};

const INK = "#191c1e";
const MUTED = "#5b6166";
const FAINT = "#9aa0a6";

const GREETINGS = [
  { kicker: "PSST… IT'S HERE", title: "Well, hello there", body: "Your brand-new card has landed. The era of “hang on, I think I’ve got one somewhere…” is officially over." },
  { kicker: "DRUMROLL PLEASE", title: "Ta-da!", body: "Meet the only business card you’ll never have to reprint. Tap it, flaunt it, watch people go “ooh”." },
  { kicker: "SPECIAL DELIVERY", title: "It’s heeere!", body: "One tap and your details fly straight to their phone. No app, no fuss, no fumbling for a pen." },
  { kicker: "ABRACADABRA", title: "Surprise!", body: "You just got 100% more memorable. Give it a tap and let the little bit of magic do the talking." },
];
function pickGreeting(seed: string) {
  let sum = 0;
  for (let i = 0; i < seed.length; i++) sum += seed.charCodeAt(i);
  return GREETINGS[sum % GREETINGS.length];
}

function gradientSvgDef(id: string, stops: Stop[], horizontal = false): string {
  const inner = stops
    .map((s) => `<stop offset="${s.off}%" stop-color="${s.color}"/>`)
    .join("");
  const dir = horizontal ? 'x1="0" y1="0" x2="1" y2="0"' : 'x1="0" y1="0" x2="1" y2="1"';
  return `<linearGradient id="${id}" ${dir}>${inner}</linearGradient>`;
}

/** Composite one text block onto a base at a top-left (px). Returns the y after it. */
async function place(
  layers: sharp.OverlayOptions[],
  block: { buf: Buffer; width: number; height: number },
  left: number,
  top: number,
): Promise<number> {
  layers.push({ input: block.buf, left: Math.round(left), top: Math.round(top) });
  return top + block.height;
}

/** COVER half (bottom): brand gradient, welcome, first name, tagline, footer. */
async function renderCover(theme: InsertTheme, firstName: string): Promise<Buffer> {
  const pad = Math.round(14 * MM);
  const strip = theme.stripStops ? Math.round(4 * MM) : 0;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${HALF_W}" height="${HALF_H}">
<defs>${gradientSvgDef("cov", theme.coverStops)}${theme.stripStops ? gradientSvgDef("strip", theme.stripStops, true) : ""}</defs>
<rect width="${HALF_W}" height="${HALF_H}" fill="url(#cov)"/>
<circle cx="${HALF_W - 55 * MM}" cy="${-30 * MM}" r="${70 * MM}" fill="#ffffff" opacity="0.10"/>
<circle cx="${-20 * MM}" cy="${HALF_H + 25 * MM}" r="${60 * MM}" fill="#ffffff" opacity="0.08"/>
<g fill="none" stroke="#ffffff" stroke-width="${Math.round(1.1 * MM)}" stroke-linecap="round" opacity="0.95">
 <path d="M ${pad + 3 * MM} ${pad + 3 * MM} a ${3 * MM} ${3 * MM} 0 0 1 ${6 * MM} 0"/>
 <path d="M ${pad + 1.2 * MM} ${pad + 4.3 * MM} a ${4.8 * MM} ${4.8 * MM} 0 0 1 ${9.6 * MM} 0"/>
</g>
${strip ? `<rect x="0" y="${HALF_H - strip}" width="${HALF_W}" height="${strip}" fill="url(#strip)"/>` : ""}
</svg>`;
  const base = await sharp(Buffer.from(svg)).png().toBuffer();
  const layers: sharp.OverlayOptions[] = [];

  // Brand name (top, beside the tap arcs)
  const brand = await renderTextPng({ text: theme.brandName, fontSize: 40, color: "#ffffff", font: "montserrat", bold: true, letterSpacing: 0.3 });
  await place(layers, brand, pad + 14 * MM, pad + 1 * MM);

  // WELCOME kicker + big first name + tagline (lower third)
  const kicker = await renderTextPng({ text: "WELCOME", fontSize: 26, color: theme.kicker, font: "montserrat", bold: true, letterSpacing: 3 });
  const name = await renderTextPng({ text: firstName, fontSize: 86, color: "#ffffff", font: "montserrat", bold: true });
  const tagline = await renderTextPng({ text: "Your smart business card has arrived. Tap it, share it, never run out again.", fontSize: 30, color: "#ffffff", width: HALF_W - pad * 2 });

  let y = HALF_H - strip - pad - tagline.height - name.height - kicker.height - 10 * MM;
  y = await place(layers, kicker, pad, y);
  y = await place(layers, name, pad - 2 * MM, y + 2 * MM);
  await place(layers, tagline, pad, y + 4 * MM);

  // Footer line
  const footL = await renderTextPng({ text: "The last business card you’ll ever need.", fontSize: 22, color: "#ffffff" });
  const footR = await renderTextPng({ text: theme.footerUrl, fontSize: 22, color: "#ffffff", bold: true });
  const footY = HALF_H - strip - pad + 1 * MM;
  await place(layers, footL, pad, footY);
  layers.push({ input: footR.buf, left: HALF_W - pad - footR.width, top: Math.round(footY) });

  return sharp(base).composite(layers).png().toBuffer();
}

/** INSIDE half (top): greeting, activation steps, QR, footer. */
async function renderInside(
  theme: InsertTheme,
  firstName: string,
  code: string,
  tapUrl: string,
): Promise<Buffer> {
  const pad = Math.round(12 * MM);
  const g = pickGreeting(code + firstName);
  const base = await sharp({
    create: { width: HALF_W, height: HALF_H, channels: 4, background: "#ffffff" },
  }).png().toBuffer();
  const layers: sharp.OverlayOptions[] = [];

  // Greeting
  const kicker = await renderTextPng({ text: g.kicker, fontSize: 20, color: theme.accent, font: "montserrat", bold: true, letterSpacing: 3 });
  const title = await renderTextPng({ text: g.title, fontSize: 58, color: INK, font: "montserrat", bold: true });
  const bodyMarkup = firstName !== "there"
    ? `<span foreground="${INK}" weight="bold">Hey ${escapePango(firstName)} — </span>${escapePango(g.body)}`
    : escapePango(g.body);
  const body = await renderTextPng({ markup: bodyMarkup, fontSize: 27, color: MUTED, width: HALF_W - pad * 2 });

  let y = pad;
  y = await place(layers, kicker, pad, y);
  y = await place(layers, title, pad, y + 2 * MM);
  y = await place(layers, body, pad, y + 3 * MM);

  // "Up and running in seconds" + numbered steps (left column), QR (right)
  const stepsX = pad;
  const stepsW = HALF_W - pad * 2 - 36 * MM; // leave room for the QR
  let sy = y + 8 * MM;
  const heading = await renderTextPng({ text: "Up and running in seconds", fontSize: 28, color: INK, font: "montserrat", bold: true });
  sy = await place(layers, heading, stepsX, sy);
  sy += 4 * MM;

  const steps = [
    "Tap the card to the back of your phone — your profile opens. No app needed.",
    "No NFC? Point your camera at the QR code instead.",
    "Hit “Save contact”, then share your link anywhere.",
  ];
  const badge = Math.round(6 * MM);
  for (let i = 0; i < steps.length; i++) {
    const num = await renderTextPng({ text: String(i + 1), fontSize: 22, color: "#ffffff", font: "montserrat", bold: true });
    const circle = await sharp(Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${badge}" height="${badge}"><circle cx="${badge / 2}" cy="${badge / 2}" r="${badge / 2}" fill="${theme.accent}"/></svg>`,
    )).png().toBuffer();
    layers.push({ input: circle, left: stepsX, top: Math.round(sy) });
    layers.push({ input: num.buf, left: stepsX + Math.round((badge - num.width) / 2), top: Math.round(sy + (badge - num.height) / 2) });
    const txt = await renderTextPng({ text: steps[i], fontSize: 22, color: MUTED, width: stepsW - badge - 3 * MM });
    const h = await place(layers, txt, stepsX + badge + 3 * MM, sy);
    sy = Math.max(h, sy + badge) + 3 * MM;
  }

  // QR (top-right of the content, above the footer)
  const qrPx = Math.round(30 * MM);
  const qr = await QRCode.toBuffer(tapUrl, { width: qrPx, margin: 1, color: { dark: INK, light: "#ffffff" } });
  const qrX = HALF_W - pad - qrPx;
  const qrY = y + 10 * MM;
  const plate = await sharp(Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${qrPx + 4 * MM}" height="${qrPx + 4 * MM}"><rect width="${qrPx + 4 * MM}" height="${qrPx + 4 * MM}" rx="${2 * MM}" fill="#ffffff" stroke="#e6e8ea" stroke-width="${Math.round(0.4 * MM)}"/></svg>`,
  )).png().toBuffer();
  layers.push({ input: plate, left: Math.round(qrX - 2 * MM), top: Math.round(qrY - 2 * MM) });
  layers.push({ input: qr, left: qrX, top: Math.round(qrY) });
  const pretty = await renderTextPng({ text: tapUrl.replace(/^https?:\/\//, ""), fontSize: 15, color: FAINT, width: qrPx, align: "center" });
  layers.push({ input: pretty.buf, left: qrX, top: Math.round(qrY + qrPx + 2 * MM) });

  // Footer
  const fy = HALF_H - pad - 6 * MM;
  layers.push({ input: await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${HALF_W - pad * 2}" height="2"><rect width="${HALF_W - pad * 2}" height="2" fill="#e6e8ea"/></svg>`)).png().toBuffer(), left: pad, top: Math.round(fy) });
  const fl = await renderTextPng({ text: `Card ${code}`, fontSize: 18, color: FAINT });
  const fr = await renderTextPng({ text: "Need help? hello@pixcards.co.uk", fontSize: 18, color: FAINT });
  await place(layers, fl, pad, fy + 2.5 * MM);
  layers.push({ input: fr.buf, left: HALF_W - pad - fr.width, top: Math.round(fy + 2.5 * MM) });

  return sharp(base).composite(layers).png().toBuffer();
}

/** Build the print-ready A5 PDF (one page per card). */
export async function renderInsertPdf(opts: {
  firstName: string;
  theme: InsertTheme;
  cards: { code: string; tapUrl: string }[];
}): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const pageW = 148 * PT_PER_MM;
  const pageH = 210 * PT_PER_MM;
  const halfPt = 105 * PT_PER_MM;

  for (const card of opts.cards) {
    const [coverPng, insidePng] = await Promise.all([
      renderCover(opts.theme, opts.firstName),
      renderInside(opts.theme, opts.firstName, card.code, card.tapUrl),
    ]);
    const cover = await pdf.embedPng(coverPng);
    const inside = await pdf.embedPng(insidePng);
    const page = pdf.addPage([pageW, pageH]);
    // Cover on the bottom half (upright).
    page.drawImage(cover, { x: 0, y: 0, width: pageW, height: halfPt });
    // Inside on the top half, rotated 180° (anchor top-right → fills the half).
    page.drawImage(inside, { x: pageW, y: pageH, width: pageW, height: halfPt, rotate: degrees(180) });
  }

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}
