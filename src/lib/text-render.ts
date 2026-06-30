import "server-only";
import sharp from "sharp";
import * as opentype from "opentype.js";
import { LIBERATION_SANS_B64 } from "@/lib/fonts/liberation-sans";
import { MONTSERRAT_BOLD_B64 } from "@/lib/fonts/montserrat-bold";
import { DM_SANS_B64 } from "@/lib/fonts/dm-sans";

/**
 * Server-side text → SVG path rendering. Netlify's serverless runtime has no
 * system fonts, so librsvg (via sharp) renders <text> as missing-glyph boxes.
 * We bundle fonts and convert text to <path>. Layout is glyph-by-glyph (via
 * charToGlyph) which avoids opentype's unsupported ligature/ccmp lookups that
 * crash on some variable/brand fonts.
 */

export type FontKey = "sans" | "montserrat" | "dmsans";

const B64: Record<FontKey, string> = {
  sans: LIBERATION_SANS_B64,
  montserrat: MONTSERRAT_BOLD_B64,
  dmsans: DM_SANS_B64,
};

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

/**
 * Render a single line of text as its own tight PNG layer for sharp.composite.
 * librsvg truncates very long <path> data on large canvases, so each line is
 * rasterised in a small text-sized SVG and composited at the right position.
 */
export async function textOverlay(
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
