import "server-only";
import { MONTSERRAT_BOLD_B64 } from "@/lib/fonts/montserrat-bold";
// Satori can't read variable fonts, so only static files are used here.
import { NUNITO_SANS_400_B64 } from "@/lib/fonts/nunito-sans";
import { markSvg } from "@/lib/brand-mark";

// Shared pieces for the generated share images (opengraph-image.tsx files).

export const OG_SIZE = { width: 1200, height: 630 };

function buf(b64: string): ArrayBuffer {
  const b = Buffer.from(b64, "base64");
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}

export function ogFonts() {
  return [
    { name: "Montserrat", data: buf(MONTSERRAT_BOLD_B64), weight: 700 as const, style: "normal" as const },
    { name: "Body", data: buf(NUNITO_SANS_400_B64), weight: 400 as const, style: "normal" as const },
  ];
}

export const MARK_SRC = `data:image/svg+xml;base64,${Buffer.from(markSvg()).toString("base64")}`;

/** The logo lockup: mark + wordmark. */
export function OgLogo({ size = 56, color = "#ffffff" }: { size?: number; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.3 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={MARK_SRC} width={size} height={size} alt="" />
      <div style={{ fontFamily: "Montserrat", fontSize: size * 0.72, color, letterSpacing: -1 }}>
        Pixcards
      </div>
    </div>
  );
}
