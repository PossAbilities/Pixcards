// Shared catalog + plan constants used across the app.

export const APP_NAME = "Pixcards";

export function appUrl(): string {
  // Strip any trailing slash so `${appUrl()}/u/...` never produces `//u/...`.
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
}

export type LinkPlatform = {
  id: string;
  label: string;
  icon: string; // Material Symbols name
  placeholder: string;
  prefix?: string;
};

export const PLATFORMS: LinkPlatform[] = [
  { id: "website", label: "Website", icon: "language", placeholder: "https://yoursite.com" },
  { id: "linkedin", label: "LinkedIn", icon: "work", placeholder: "https://linkedin.com/in/you" },
  { id: "instagram", label: "Instagram", icon: "photo_camera", placeholder: "https://instagram.com/you" },
  { id: "twitter", label: "X / Twitter", icon: "alternate_email", placeholder: "https://x.com/you" },
  { id: "github", label: "GitHub", icon: "code", placeholder: "https://github.com/you" },
  { id: "youtube", label: "YouTube", icon: "smart_display", placeholder: "https://youtube.com/@you" },
  { id: "tiktok", label: "TikTok", icon: "music_note", placeholder: "https://tiktok.com/@you" },
  { id: "facebook", label: "Facebook", icon: "thumb_up", placeholder: "https://facebook.com/you" },
  { id: "whatsapp", label: "WhatsApp", icon: "chat", placeholder: "https://wa.me/441234567890" },
  { id: "phone", label: "Phone", icon: "call", placeholder: "+44 1234 567890", prefix: "tel:" },
  { id: "email", label: "Email", icon: "mail", placeholder: "you@email.com", prefix: "mailto:" },
  { id: "calendar", label: "Book a Meeting", icon: "event", placeholder: "https://calendly.com/you" },
  { id: "custom", label: "Custom Link", icon: "link", placeholder: "https://..." },
];

export function platform(id: string): LinkPlatform {
  return PLATFORMS.find((p) => p.id === id) ?? PLATFORMS[PLATFORMS.length - 1];
}

export type Theme = {
  id: string;
  name: string;
  pro: boolean;
  // gradient for header + accent for buttons
  header: string;
  accent: string;
  surface: string;
  ink: string;
};

export const THEMES: Theme[] = [
  {
    id: "indigo",
    name: "Indigo Modern",
    pro: false,
    header: "linear-gradient(135deg,#6366f1 0%,#4f46e5 50%,#3525cd 100%)",
    accent: "#4f46e5",
    surface: "#ffffff",
    ink: "#191c1e",
  },
  {
    id: "midnight",
    name: "Midnight Sleek",
    pro: true,
    header: "linear-gradient(135deg,#1e293b 0%,#0f172a 100%)",
    accent: "#0f172a",
    surface: "#0b1220",
    ink: "#e2e8f0",
  },
  {
    id: "ruby",
    name: "Ruby Bold",
    pro: true,
    header: "linear-gradient(135deg,#fb7185 0%,#e11d48 60%,#9f1239 100%)",
    accent: "#e11d48",
    surface: "#ffffff",
    ink: "#191c1e",
  },
  {
    id: "emerald",
    name: "Emerald Eco",
    pro: true,
    header: "linear-gradient(135deg,#34d399 0%,#10b981 55%,#047857 100%)",
    accent: "#059669",
    surface: "#ffffff",
    ink: "#191c1e",
  },
  {
    id: "slate",
    name: "Cool Slate",
    pro: true,
    header: "linear-gradient(135deg,#94a3b8 0%,#64748b 60%,#475569 100%)",
    accent: "#475569",
    surface: "#ffffff",
    ink: "#191c1e",
  },
];

export function theme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/* Profile layout templates (distinct from colour themes). */
export type CardTemplate = {
  id: string;
  name: string;
  description: string;
  pro: boolean;
  icon: string;
};

export const CARD_TEMPLATES: CardTemplate[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Header banner with your links in a clean list.",
    pro: false,
    icon: "view_agenda",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Clean and simple — no header, just you and your links.",
    pro: false,
    icon: "crop_portrait",
  },
  {
    id: "grid",
    name: "Grid",
    description: "Links shown as tappable app-style icon tiles.",
    pro: true,
    icon: "grid_view",
  },
  {
    id: "spotlight",
    name: "Spotlight",
    description: "Full-bleed photo hero — bold and modern.",
    pro: true,
    icon: "wallpaper",
  },
];

export function cardTemplate(id: string): CardTemplate {
  return CARD_TEMPLATES.find((tpl) => tpl.id === id) ?? CARD_TEMPLATES[0];
}

export type CardMaterial = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  swatch: string; // css background
  pro: boolean;
};

export const CARD_MATERIALS: CardMaterial[] = [
  {
    id: "white-gloss",
    name: "White CR80 Card",
    description:
      "Premium printed white PVC card — standard CR80 (credit-card) size.",
    priceCents: 2900,
    swatch: "linear-gradient(135deg,#ffffff,#e6e8ea)",
    pro: false,
  },
];

export function material(id: string): CardMaterial {
  return CARD_MATERIALS.find((m) => m.id === id) ?? CARD_MATERIALS[0];
}

export const PRO_PRICE_CENTS = 4900; // one-time Pro upgrade

export const ORDER_STATUSES = [
  "PENDING",
  "PAID",
  "PRINTING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

export function money(cents: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(cents / 100);
}
