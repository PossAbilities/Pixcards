/**
 * The NFC "tap" mark — the universal contactless/NFC indicator (signal waves
 * radiating from a point) with an optional "NFC" wordmark. Rendered as a
 * self-contained SVG so it can be baked into print artwork server-side (sharp)
 * or inserted as an image element in the card studio on the client.
 *
 * Pass a colour so it reads on any background (white on dark/brand cards,
 * dark ink on white cards).
 */
export function nfcMarkSvg(opts?: {
  color?: string;
  label?: boolean;
  /** Pre-rendered SVG for the "NFC" label (e.g. a font path) — used server-side
   *  where no system font exists. When omitted, a <text> element is used. */
  labelSvg?: string;
}): string {
  const color = opts?.color ?? "#ffffff";
  const label = opts?.label ?? true;
  const h = label ? 150 : 124;
  const labelMarkup = label
    ? opts?.labelSvg ??
      `<text x="60" y="146" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="24" letter-spacing="1" fill="${color}">NFC</text>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 ${h}" width="120" height="${h}">
  <g fill="none" stroke="${color}" stroke-width="9" stroke-linecap="round">
    <path d="M34 50 A20 20 0 0 1 34 90"/>
    <path d="M34 35 A35 35 0 0 1 34 105"/>
    <path d="M34 20 A50 50 0 0 1 34 120"/>
  </g>
  <circle cx="30" cy="70" r="7.5" fill="${color}"/>
  ${labelMarkup}
</svg>`;
}

/** Base64 data URL of the mark (for <img> src / card-studio elements). */
export function nfcMarkDataUrl(opts?: { color?: string; label?: boolean }): string {
  const svg = nfcMarkSvg(opts);
  const b64 =
    typeof window === "undefined"
      ? Buffer.from(svg).toString("base64")
      : window.btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${b64}`;
}
