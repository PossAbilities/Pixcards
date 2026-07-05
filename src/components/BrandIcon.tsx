import type { IconType } from "react-icons";
import {
  SiInstagram,
  SiX,
  SiGithub,
  SiYoutube,
  SiTiktok,
  SiFacebook,
  SiWhatsapp,
} from "react-icons/si";
import {
  FaGlobe,
  FaLinkedin,
  FaPhone,
  FaEnvelope,
  FaRegCalendar,
  FaLink,
} from "react-icons/fa6";
import { cn } from "@/lib/utils";

type Brand = { Icon: IconType; color: string };

// Recognisable brand glyphs + their signature colour. Rendered as soft tinted
// tiles so they read as "LinkedIn / Instagram / …" while staying cohesive with
// the Pixcards theme (rounded squares, low-alpha tint — not loud solid blocks).
const BRANDS: Record<string, Brand> = {
  website: { Icon: FaGlobe, color: "#4f46e5" },
  linkedin: { Icon: FaLinkedin, color: "#0a66c2" },
  instagram: { Icon: SiInstagram, color: "#e4405f" },
  twitter: { Icon: SiX, color: "#0f0f0f" },
  github: { Icon: SiGithub, color: "#181717" },
  youtube: { Icon: SiYoutube, color: "#ff0000" },
  tiktok: { Icon: SiTiktok, color: "#111827" },
  facebook: { Icon: SiFacebook, color: "#1877f2" },
  whatsapp: { Icon: SiWhatsapp, color: "#25d366" },
  phone: { Icon: FaPhone, color: "#059669" },
  email: { Icon: FaEnvelope, color: "#4f46e5" },
  calendar: { Icon: FaRegCalendar, color: "#4f46e5" },
  custom: { Icon: FaLink, color: "#6366f1" },
};

function brand(platformId: string): Brand {
  return BRANDS[platformId] ?? BRANDS.custom;
}

export function brandColor(platformId: string): string {
  return brand(platformId).color;
}

/** Bare brand glyph (inherits currentColor unless coloured by the caller). */
export function BrandGlyph({
  platform,
  size = 18,
  className,
}: {
  platform: string;
  size?: number;
  className?: string;
}) {
  const { Icon } = brand(platform);
  return <Icon size={size} className={className} aria-hidden />;
}

/** Rounded, brand-tinted tile (used in link lists, editor, and the card).
 *  `solid` renders the brand colour as the tile background with a white
 *  glyph (app-icon style) — needed on coloured page backgrounds where the
 *  default low-alpha tint blends in. */
export function BrandTile({
  platform,
  size = 40,
  radius = 12,
  dark = false,
  solid = false,
  className,
}: {
  platform: string;
  size?: number;
  radius?: number;
  dark?: boolean;
  solid?: boolean;
  className?: string;
}) {
  const { Icon, color } = brand(platform);
  return (
    <span
      className={cn("grid place-items-center shrink-0", className)}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: solid ? color : `${color}${dark ? "33" : "1f"}`,
        color: solid ? "#ffffff" : color,
        boxShadow: solid ? "0 6px 16px -8px rgba(0,0,0,0.35)" : undefined,
      }}
    >
      <Icon size={Math.round(size * 0.5)} aria-hidden />
    </span>
  );
}
