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
};

/** Selectable presets for the admin UI. */
export const PRESET_OPTIONS: { id: string; label: string }[] = [
  { id: "perspective", label: "Perspective Studio" },
  { id: "possabilities", label: "PossAbilities" },
];
