import "server-only";
import * as opentype from "opentype.js";
import { LIBERATION_SANS_B64 } from "@/lib/fonts/liberation-sans";

/**
 * Server-side text → SVG path rendering. Netlify's serverless runtime has no
 * system fonts, so librsvg (via sharp) renders <text> as missing-glyph boxes.
 * We bundle a font and convert text to <path> so glyphs always render.
 */

let _font: opentype.Font | null = null;
function font(): opentype.Font {
  if (!_font) {
    const buf = Buffer.from(LIBERATION_SANS_B64, "base64");
    // opentype needs an ArrayBuffer view of exactly these bytes.
    _font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  }
  return _font;
}

/** Width of a string at a given font size (px), for alignment. */
export function textWidth(text: string, fontSize: number): number {
  return font().getAdvanceWidth(text || "", fontSize);
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
};

/** An SVG <path> (string) for a single line of text, aligned around x. */
export function textPath(opts: TextSvgOpts): string {
  const f = font();
  const size = opts.fontSize;
  const w = f.getAdvanceWidth(opts.text || "", size);
  const startX =
    opts.align === "center" ? opts.x - w / 2 : opts.align === "right" ? opts.x - w : opts.x;
  const path = f.getPath(opts.text || "", startX, opts.y, size);
  const d = path.toPathData(2);
  if (!d) return "";
  // Emulate bold with a thin stroke of the same colour.
  const stroke = opts.bold ? ` stroke="${opts.color}" stroke-width="${(size * 0.035).toFixed(2)}"` : "";
  const op = opts.opacity !== undefined && opts.opacity < 1 ? ` fill-opacity="${opts.opacity}"` : "";
  return `<path d="${d}" fill="${opts.color}"${op}${stroke}/>`;
}
