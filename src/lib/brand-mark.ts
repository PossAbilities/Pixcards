// The Pixcards mark: an indigo rounded square with white "contactless" arcs.
// One definition feeds the favicon, the Apple touch icon and the share images.

const CX = 19;
const CY = 32;
const RADII = [7, 13.5, 20];
const SWEEP = (50 * Math.PI) / 180;

function arc(r: number): string {
  const x = (CX + r * Math.cos(SWEEP)).toFixed(2);
  const y1 = (CY - r * Math.sin(SWEEP)).toFixed(2);
  const y2 = (CY + r * Math.sin(SWEEP)).toFixed(2);
  return `M${x} ${y1}A${r} ${r} 0 0 1 ${x} ${y2}`;
}

/** Arc paths in a 64×64 viewBox. */
export const MARK_ARCS = RADII.map(arc);

export const MARK_FROM = "#4f46e5";
export const MARK_TO = "#3525cd";

/** Standalone SVG markup for the mark (used for the favicon). */
export function markSvg(): string {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">',
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${MARK_FROM}"/><stop offset="1" stop-color="${MARK_TO}"/></linearGradient></defs>`,
    '<rect width="64" height="64" rx="15" fill="url(#g)"/>',
    `<g fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round">${MARK_ARCS.map((d) => `<path d="${d}"/>`).join("")}</g>`,
    "</svg>",
  ].join("");
}
