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
    footerUrl: "possabilities.org.uk",
    stripStops: [
      { off: 0, color: "#16a79f" },
      { off: 100, color: "#e0007a" },
    ],
  },
};

/**
 * Resolve the carrier/insert theme key for a card owner. Brand presets
 * (pa-colourbar/-wave/-bigpink, possabilities, perspective) map to their
 * brand; a custom card falls back to the owner's email domain, so a
 * PossAbilities staffer's insert is PossAbilities-branded even when they've
 * customised their card. Keys are shared by the PDF (INSERT_THEMES) and the
 * on-screen insert page (its own THEMES map).
 */
export function insertThemeKeyFor(
  cardPreset?: string | null,
  email?: string | null,
): "default" | "perspective" | "possabilities" {
  const p = (cardPreset ?? "").toLowerCase();
  if (p === "perspective") return "perspective";
  if (p === "possabilities" || p.startsWith("pa-")) return "possabilities";
  const domain = (email ?? "").split("@")[1]?.toLowerCase() ?? "";
  if (domain === "possabilities.org.uk") return "possabilities";
  if (domain.includes("perspectivestudio")) return "perspective";
  return "default";
}

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

/** OUTSIDE FRONT COVER — a full-bleed mirror of the person's own card front,
 *  scaled to cover the A6 panel (keeps the wordmark/top and bottom bar, trims
 *  the sides). Falls back to the brand back-cover if no card art is supplied. */
async function renderMirrorCover(coverPng: Buffer | undefined, theme: InsertTheme): Promise<Buffer> {
  if (!coverPng) return renderBackCover(theme);
  return sharp(coverPng)
    .resize(HALF_W, HALF_H, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();
}

/** OUTSIDE BACK COVER — brand gradient, centred logo mark + name + URL. */
async function renderBackCover(theme: InsertTheme): Promise<Buffer> {
  const strip = theme.stripStops ? Math.round(4 * MM) : 0;
  const cx = HALF_W / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${HALF_W}" height="${HALF_H}">
<defs>${gradientSvgDef("cov", theme.coverStops)}${theme.stripStops ? gradientSvgDef("strip", theme.stripStops, true) : ""}</defs>
<rect width="${HALF_W}" height="${HALF_H}" fill="url(#cov)"/>
<circle cx="${HALF_W - 40 * MM}" cy="${-26 * MM}" r="${64 * MM}" fill="#ffffff" opacity="0.08"/>
<circle cx="${-18 * MM}" cy="${HALF_H + 22 * MM}" r="${54 * MM}" fill="#ffffff" opacity="0.07"/>
<g fill="none" stroke="#ffffff" stroke-width="${Math.round(1.3 * MM)}" stroke-linecap="round" opacity="0.95">
 <path d="M ${cx - 4 * MM} ${34 * MM} a ${4 * MM} ${4 * MM} 0 0 1 ${8 * MM} 0"/>
 <path d="M ${cx - 6.5 * MM} ${35.6 * MM} a ${6.5 * MM} ${6.5 * MM} 0 0 1 ${13 * MM} 0"/>
</g>
${strip ? `<rect x="0" y="${HALF_H - strip}" width="${HALF_W}" height="${strip}" fill="url(#strip)"/>` : ""}
</svg>`;
  const base = await sharp(Buffer.from(svg)).png().toBuffer();
  const layers: sharp.OverlayOptions[] = [];
  const brand = await renderTextPng({ text: theme.brandName, fontSize: 48, color: "#ffffff", font: "montserrat", bold: true, letterSpacing: 0.3 });
  layers.push({ input: brand.buf, left: Math.round(cx - brand.width / 2), top: Math.round(46 * MM) });
  const url = await renderTextPng({ text: theme.footerUrl, fontSize: 26, color: "#ffffff", bold: true });
  layers.push({ input: url.buf, left: Math.round(cx - url.width / 2), top: Math.round(HALF_H - strip - 16 * MM) });
  return sharp(base).composite(layers).png().toBuffer();
}

/** INSIDE CARD-HOLDER panel — a CR80-sized placeholder with four diagonal
 *  corner slits; cut the slits and tuck the real card's corners under. */
async function renderCardHolder(theme: InsertTheme): Promise<Buffer> {
  const pad = Math.round(12 * MM);
  const cardW = Math.round(85.6 * MM);
  const cardH = Math.round(54 * MM);
  const L = Math.round((HALF_W - cardW) / 2);
  const T = Math.round((HALF_H - cardH) / 2) + Math.round(7 * MM);
  const slit = Math.round(16 * MM);
  const cut = theme.accent;
  // A slit runs at 45° across each card corner; the paper triangle between the
  // slit and the panel corner is the flap the card corner slides under.
  const slitLine = (x: number, y: number, dx: number, dy: number) => {
    // perpendicular to the corner diagonal (dx,dy) → a 45° cut across the corner
    const px = dy, py = -dx;
    const hx = (px * slit) / 2, hy = (py * slit) / 2;
    return `<line x1="${Math.round(x - hx)}" y1="${Math.round(y - hy)}" x2="${Math.round(x + hx)}" y2="${Math.round(y + hy)}" stroke="${cut}" stroke-width="${Math.round(0.7 * MM)}" stroke-linecap="round"/>`;
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${HALF_W}" height="${HALF_H}">
<rect width="${HALF_W}" height="${HALF_H}" fill="#ffffff"/>
<rect x="${L}" y="${T}" width="${cardW}" height="${cardH}" rx="${Math.round(3 * MM)}" fill="#f5f6f7" stroke="#c9ced3" stroke-width="${Math.round(0.5 * MM)}" stroke-dasharray="${Math.round(2 * MM)} ${Math.round(1.6 * MM)}"/>
${slitLine(L, T, -1, -1)}
${slitLine(L + cardW, T, 1, -1)}
${slitLine(L, T + cardH, -1, 1)}
${slitLine(L + cardW, T + cardH, 1, 1)}
</svg>`;
  const base = await sharp(Buffer.from(svg)).png().toBuffer();
  const layers: sharp.OverlayOptions[] = [];
  const kicker = await renderTextPng({ text: "YOUR CARD", fontSize: 20, color: theme.accent, font: "montserrat", bold: true, letterSpacing: 3 });
  const title = await renderTextPng({ text: "Pop it in here", fontSize: 40, color: INK, font: "montserrat", bold: true });
  await place(layers, kicker, pad, pad);
  await place(layers, title, pad, pad + kicker.height + 1 * MM);
  // Hint inside the placeholder rectangle.
  const hint = await renderTextPng({ text: "Card tucks under the four corners", fontSize: 20, color: FAINT, width: cardW - 10 * MM, align: "center" });
  layers.push({ input: hint.buf, left: Math.round(L + (cardW - hint.width) / 2), top: Math.round(T + cardH / 2 - hint.height / 2) });
  // Instruction under the placeholder.
  const instr = await renderTextPng({ text: "Snip the four diagonal marks with a craft knife, then slot the card’s corners underneath.", fontSize: 20, color: MUTED, width: HALF_W - pad * 2, align: "center" });
  layers.push({ input: instr.buf, left: Math.round((HALF_W - instr.width) / 2), top: Math.round(T + cardH + 6 * MM) });
  return sharp(base).composite(layers).png().toBuffer();
}

/** INSIDE TEXT panel: greeting, activation steps, QR, footer. */
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

/** The four rendered A6 panels for one card (PNG buffers). */
export async function renderInsertPanels(opts: {
  firstName: string;
  theme: InsertTheme;
  code: string;
  tapUrl: string;
  cardCoverPng?: Buffer;
}): Promise<{ frontCover: Buffer; backCover: Buffer; insideText: Buffer; cardHolder: Buffer }> {
  const [frontCover, backCover, insideText, cardHolder] = await Promise.all([
    renderMirrorCover(opts.cardCoverPng, opts.theme),
    renderBackCover(opts.theme),
    renderInside(opts.theme, opts.firstName, opts.code, opts.tapUrl),
    renderCardHolder(opts.theme),
  ]);
  return { frontCover, backCover, insideText, cardHolder };
}

/**
 * Build the print-ready A5 PDF — TWO pages per card for double-sided printing:
 *   Page 1 (OUTSIDE): front cover (card mirror) on the bottom half, back cover
 *     on the top half (rotated) so both read upright when folded.
 *   Page 2 (INSIDE): welcome text on the bottom half, card holder on the top.
 * Print double-sided (flip on SHORT edge) and fold in half.
 */
export async function renderInsertPdf(opts: {
  firstName: string;
  theme: InsertTheme;
  cards: { code: string; tapUrl: string }[];
  cardCoverPng?: Buffer;
}): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const pageW = 148 * PT_PER_MM;
  const pageH = 210 * PT_PER_MM;
  const halfPt = 105 * PT_PER_MM;

  for (const card of opts.cards) {
    const { frontCover, backCover, insideText, cardHolder } = await renderInsertPanels({
      firstName: opts.firstName,
      theme: opts.theme,
      code: card.code,
      tapUrl: card.tapUrl,
      cardCoverPng: opts.cardCoverPng,
    });
    const [fc, bc, it, ch] = await Promise.all([
      pdf.embedPng(frontCover),
      pdf.embedPng(backCover),
      pdf.embedPng(insideText),
      pdf.embedPng(cardHolder),
    ]);

    // Page 1 — OUTSIDE.
    const p1 = pdf.addPage([pageW, pageH]);
    p1.drawImage(fc, { x: 0, y: 0, width: pageW, height: halfPt }); // front cover, bottom, upright
    p1.drawImage(bc, { x: pageW, y: pageH, width: pageW, height: halfPt, rotate: degrees(180) }); // back cover, top, flipped

    // Page 2 — INSIDE.
    const p2 = pdf.addPage([pageW, pageH]);
    p2.drawImage(it, { x: 0, y: 0, width: pageW, height: halfPt }); // welcome text, bottom, upright
    p2.drawImage(ch, { x: pageW, y: pageH, width: pageW, height: halfPt, rotate: degrees(180) }); // card holder, top, flipped
  }

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}
