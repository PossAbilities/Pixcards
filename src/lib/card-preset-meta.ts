/**
 * Lightweight card-preset metadata (no rendering deps) shared by the admin
 * tools and checkout. The profile theme applied when a preset is attached so
 * the digital card matches the printed one.
 */

export type PresetProfileTheme = {
  theme: string;
  template: string;
  brandHeader: string;
  accentColor: string;
  panelColor: string;
};

export const PRESET_PROFILE_THEME: Record<string, PresetProfileTheme> = {
  perspective: {
    theme: "indigo",
    template: "brand",
    brandHeader: "linear-gradient(135deg,#1a2046 0%,#0f1330 60%,#0a0d22 100%)",
    accentColor: "#ff5a1f",
    panelColor: "#c7ec4f",
  },
  possabilities: {
    theme: "indigo",
    template: "brand",
    brandHeader: "linear-gradient(135deg,#3f2160 0%,#341a52 55%,#2b1547 100%)",
    accentColor: "#e0007a",
    panelColor: "#16a79f",
  },
  // Official PossAbilities brand set (purple #48065a / magenta #ec008c /
  // teal #66cccc). Each digital profile is colour-coordinated with its card.
  "pa-colourbar": {
    theme: "indigo",
    template: "brand",
    brandHeader: "linear-gradient(135deg,#48065a 0%,#2b1547 100%)",
    accentColor: "#ec008c",
    panelColor: "#66cccc",
  },
  "pa-wave": {
    theme: "indigo",
    template: "brand",
    brandHeader: "linear-gradient(160deg,#48065a 0%,#48065a 55%,#66cccc 100%)",
    accentColor: "#ec008c",
    panelColor: "#66cccc",
  },
  "pa-bigpink": {
    theme: "indigo",
    template: "brand",
    brandHeader: "linear-gradient(135deg,#66cccc 0%,#45b5b5 100%)",
    accentColor: "#ec008c",
    panelColor: "#66cccc",
  },
};

/** Selectable presets for the admin UI. */
export const PRESET_OPTIONS: { id: string; label: string }[] = [
  { id: "perspective", label: "Perspective Studio" },
  { id: "pa-colourbar", label: "PossAbilities — A · Colour Bar" },
  { id: "pa-wave", label: "PossAbilities — B · Purple Wave" },
  { id: "pa-bigpink", label: "PossAbilities — C · Big Pink" },
  { id: "possabilities", label: "PossAbilities (legacy)" },
];

/** The design options offered to a given email domain (registration picker +
 *  the admin domain console). Order is the order shown. */
export const DOMAIN_DESIGNS: Record<string, { default: string; options: string[] }> = {
  "possabilities.org.uk": {
    default: "pa-colourbar",
    options: ["pa-colourbar", "pa-wave", "pa-bigpink"],
  },
};

/** Designs allowed for an email address's domain, or null if none configured. */
export function domainDesignsForEmail(
  email: string,
): { domain: string; default: string; options: string[] } | null {
  const at = email.lastIndexOf("@");
  if (at < 0) return null;
  const domain = email.slice(at + 1).toLowerCase().trim();
  const entry = DOMAIN_DESIGNS[domain];
  return entry ? { domain, ...entry } : null;
}
