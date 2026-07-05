import "server-only";
import fs from "fs";
import sharp from "sharp";
import * as opentype from "opentype.js";
import { LIBERATION_SANS_B64 } from "@/lib/fonts/liberation-sans";
import { MONTSERRAT_BOLD_B64 } from "@/lib/fonts/montserrat-bold";
import { DM_SANS_B64 } from "@/lib/fonts/dm-sans";

/**
 * Server-side text rendering. Netlify's serverless runtime has no system fonts,
 * so we bundle fonts. Lines are rasterised with sharp's native (Pango) text
 * engine — proper shaping/kerning/counters — written out to a tmp file so
 * fontconfig can load them. A bundled-font opentype path renderer is kept as a
 * fallback in case the runtime lacks Pango text support.
 */

export type FontKey = "sans" | "montserrat" | "dmsans";

const FONTS: Record<FontKey, { b64: string; family: string; file: string }> = {
  sans: { b64: LIBERATION_SANS_B64, family: "Liberation Sans", file: "pix-sans.ttf" },
  montserrat: { b64: MONTSERRAT_BOLD_B64, family: "Montserrat", file: "pix-montserrat.ttf" },
  dmsans: { b64: DM_SANS_B64, family: "DM Sans", file: "pix-dmsans.ttf" },
};
const B64: Record<FontKey, string> = {
  sans: FONTS.sans.b64,
  montserrat: FONTS.montserrat.b64,
  dmsans: FONTS.dmsans.b64,
};

const written = new Set<FontKey>();
/** Write a bundled font to a tmp file (once) and return its path + family.
 *  Path is a literal "/tmp/<name>" — fully static so bundlers don't trace
 *  the whole filesystem (Turbopack flags dynamic path.join/fs calls). */
function fontFile(key: FontKey): { file: string; family: string } {
  const f = FONTS[key];
  const file = /* turbopackIgnore: true */ `/tmp/${f.file}`;
  if (!written.has(key)) {
    try {
      if (!fs.existsSync(file)) fs.writeFileSync(file, Buffer.from(f.b64, "base64"));
    } catch {
      /* ignore — sharp will error and we fall back to the path renderer */
    }
    written.add(key);
  }
  return { file, family: f.family };
}

function escapePango(s: string): string {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const cache: Partial<Record<FontKey, opentype.Font>> = {};
function font(key: FontKey): opentype.Font {
  if (!cache[key]) {
    const buf = Buffer.from(B64[key], "base64");
    cache[key] = opentype.parse(
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
    );
  }
  return cache[key]!;
}

/** Total advance width of a string at a given size (px). */
function measure(f: opentype.Font, text: string, size: number): number {
  const scale = size / f.unitsPerEm;
  let w = 0;
  for (const ch of text) w += (f.charToGlyph(ch).advanceWidth || 0) * scale;
  return w;
}

export function textWidth(text: string, fontSize: number, fontKey: FontKey = "sans"): number {
  return measure(font(fontKey), text || "", fontSize);
}

export type TextSvgOpts = {
  text: string;
  x: number;
  y: number; // baseline
  fontSize: number;
  color: string;
  align?: "left" | "center" | "right";
  bold?: boolean;
  opacity?: number;
  font?: FontKey;
};

/** Per-glyph <path> elements for a line of text (one path each — librsvg
 *  truncates a single over-long `d`, so we never concatenate into one). */
function glyphPaths(opts: TextSvgOpts, startX: number, baseline: number): string {
  const f = font(opts.font ?? "sans");
  const size = opts.fontSize;
  const scale = size / f.unitsPerEm;
  const stroke = opts.bold ? ` stroke="${opts.color}" stroke-width="${(size * 0.025).toFixed(2)}"` : "";
  const op = opts.opacity !== undefined && opts.opacity < 1 ? ` fill-opacity="${opts.opacity}"` : "";
  let x = startX;
  let out = "";
  for (const ch of opts.text || "") {
    const g = f.charToGlyph(ch);
    const d = g.getPath(x, baseline, size).toPathData(2);
    if (d) out += `<path d="${d}" fill="${opts.color}"${op}${stroke}/>`;
    x += (g.advanceWidth || 0) * scale;
  }
  return out;
}

/** SVG <path> elements for a single line of text, aligned around x. */
export function textPath(opts: TextSvgOpts): string {
  const f = font(opts.font ?? "sans");
  const w = measure(f, opts.text || "", opts.fontSize);
  const startX =
    opts.align === "center" ? opts.x - w / 2 : opts.align === "right" ? opts.x - w : opts.x;
  return glyphPaths(opts, startX, opts.y);
}

/** Tight opentype-path fallback layer (used if Pango text is unavailable). */
async function textOverlayFallback(
  opts: TextSvgOpts,
): Promise<{ input: Buffer; top: number; left: number } | null> {
  const f = font(opts.font ?? "sans");
  const size = opts.fontSize;
  const text = opts.text || "";
  if (!text) return null;
  const w = measure(f, text, size);
  const pad = Math.ceil(size * 0.35);
  const baseline = Math.ceil(size * 1.05);
  const svgW = Math.ceil(w) + pad * 2;
  const svgH = Math.ceil(size * 1.5);
  const paths = glyphPaths(opts, pad, baseline);
  if (!paths) return null;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}">${paths}</svg>`;
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  const startX =
    opts.align === "center" ? opts.x - w / 2 : opts.align === "right" ? opts.x - w : opts.x;
  return { input: buf, top: Math.round(opts.y - baseline), left: Math.round(startX - pad) };
}

/**
 * Render a single line of text as a PNG layer for sharp.composite, positioned
 * so its baseline lands at opts.y. Uses sharp's Pango text engine (clean
 * shaping/kerning) and falls back to the bundled-font path renderer on error.
 */
export async function textOverlay(
  opts: TextSvgOpts,
): Promise<{ input: Buffer; top: number; left: number } | null> {
  if (!opts.text) return null;
  try {
    const { file, family } = fontFile(opts.font ?? "sans");
    const alpha =
      opts.opacity !== undefined && opts.opacity < 1
        ? ` alpha="${Math.max(1, Math.round(opts.opacity * 100))}%"`
        : "";
    // weight must be in the markup — Pango won't bold otherwise (bold text
    // silently rendered regular before this, softening print output).
    const weight = opts.bold ? ' weight="bold"' : "";
    const markup = `<span foreground="${opts.color}"${alpha}${weight}>${escapePango(opts.text)}</span>`;
    const buf = await sharp({
      text: {
        text: markup,
        font: `${family} ${Math.round(opts.fontSize)}`,
        fontfile: file,
        rgba: true,
        dpi: 72,
      },
    })
      .png()
      .toBuffer();
    const m = await sharp(buf).metadata();
    const w = m.width ?? 0;
    const h = m.height ?? 0;
    const startX =
      opts.align === "center" ? opts.x - w / 2 : opts.align === "right" ? opts.x - w : opts.x;
    // Centre the ink image on the intended visual line centre (baseline − 0.32·size).
    const centreY = opts.y - opts.fontSize * 0.32;
    return { input: buf, top: Math.round(centreY - h / 2), left: Math.round(startX) };
  } catch {
    return textOverlayFallback(opts);
  }
}
