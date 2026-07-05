"use client";

import { DigitalCard, type CardData } from "@/components/DigitalCard";

/**
 * The public page rendered at true phone width, then scaled down to fit the
 * frame — so proportions, wrapping and truncation match exactly what
 * visitors see (rendering directly at frame width distorts everything).
 */
export function PhonePreview({
  data,
  width = 280,
}: {
  data: CardData;
  width?: number;
}) {
  const INNER_W = 390; // the mobile viewport the public page targets
  const INNER_H = 844;
  const content = width - 16; // inside the 8px bezel
  const scale = content / INNER_W;
  return (
    <div
      className="overflow-hidden rounded-[32px] border-8 border-ink bg-surface shadow-xl"
      style={{ width }}
    >
      <div style={{ height: Math.round(INNER_H * scale), overflow: "hidden" }}>
        <div
          style={{
            width: INNER_W,
            height: INNER_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <DigitalCard data={data} className="h-full" />
        </div>
      </div>
    </div>
  );
}
