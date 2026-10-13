import type React from "react";

export type PxBox = { x: number; y: number; w: number; h: number };

const MIN = 8; // smallest element size in px

/**
 * Extra props for a react-rnd element so it can be used without a mouse:
 * Tab to focus (which selects it), arrow keys move it, Shift+arrows move
 * further, Alt/Option+arrows resize. Everything stays inside the canvas.
 * react-rnd forwards unknown props to its wrapper <div>.
 */
export function keyboardRndProps(opts: {
  label: string;
  box: PxBox;
  canvas: { w: number; h: number };
  lockAspect?: boolean;
  onSelect: () => void;
  onChange: (box: PxBox) => void;
}) {
  const { box, canvas } = opts;
  return {
    tabIndex: 0,
    role: "button",
    "aria-label": `${opts.label}. Arrow keys move, Shift for bigger steps, Alt plus arrow keys resize.`,
    onFocus: opts.onSelect,
    onKeyDown: (e: React.KeyboardEvent) => {
      const dir: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      const d = dir[e.key];
      if (!d) return;
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      let { x, y, w, h } = box;
      if (e.altKey) {
        // Right/Down grow, Left/Up shrink.
        const delta = (d[0] || d[1]) * step;
        if (opts.lockAspect) {
          const ratio = h / w;
          w = Math.max(MIN, Math.min(canvas.w - x, w + delta));
          h = Math.max(MIN, Math.min(canvas.h - y, w * ratio));
          w = h / ratio;
        } else if (d[0]) {
          w = Math.max(MIN, Math.min(canvas.w - x, w + delta));
        } else {
          h = Math.max(MIN, Math.min(canvas.h - y, h + delta));
        }
      } else {
        x = Math.max(0, Math.min(canvas.w - w, x + d[0] * step));
        y = Math.max(0, Math.min(canvas.h - h, y + d[1] * step));
      }
      opts.onChange({ x, y, w, h });
    },
  };
}

/** Human label for a designer element, e.g. "Text: Jane Smith". */
export function elementLabel(kind: string, text?: string): string {
  if (kind === "text") return `Text: ${(text ?? "").slice(0, 40) || "empty"}`;
  if (kind === "qr") return "QR code";
  if (kind === "nfc") return "NFC symbol";
  return "Image";
}
