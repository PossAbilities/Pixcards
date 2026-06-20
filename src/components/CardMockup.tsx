import { Icon } from "./Icon";
import { material as getMaterial } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** A CSS-rendered premium NFC business card (no image assets needed). */
export function CardMockup({
  name = "Your Name",
  title = "Your Title",
  materialId = "matte-black",
  className,
}: {
  name?: string;
  title?: string;
  materialId?: string;
  className?: string;
}) {
  const mat = getMaterial(materialId);
  const light = materialId === "white-gloss" || materialId === "bio-plastic";
  const ink = light ? "#191c1e" : "#ffffff";
  const sub = light ? "#475569" : "rgba(255,255,255,0.7)";

  return (
    <div
      className={cn(
        "relative aspect-[1.585/1] w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 p-5 flex flex-col justify-between",
        className,
      )}
      style={{ background: mat.swatch, color: ink }}
    >
      {/* sheen */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/5 pointer-events-none" />
      {/* top row */}
      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[20px] fill" style={{ color: ink }}>
            contactless
          </span>
          <span className="font-display font-bold tracking-tight text-sm" style={{ color: ink }}>
            Pixcards
          </span>
        </div>
        <Icon name="nfc" className="text-[20px]" style={{ color: sub }} />
      </div>

      {/* chip */}
      <div className="relative">
        <div
          className="w-10 h-7 rounded-md"
          style={{
            background:
              "linear-gradient(135deg,#f5d77a,#caa84a 40%,#e9c96a 60%,#b8923f)",
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.15)",
          }}
        />
      </div>

      {/* identity */}
      <div className="relative">
        <p className="font-display font-bold text-lg leading-tight" style={{ color: ink }}>
          {name}
        </p>
        <p className="text-xs font-medium" style={{ color: sub }}>
          {title}
        </p>
      </div>
    </div>
  );
}
