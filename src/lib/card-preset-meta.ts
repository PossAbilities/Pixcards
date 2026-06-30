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
};

export const PRESET_PROFILE_THEME: Record<string, PresetProfileTheme> = {
  perspective: {
    theme: "indigo",
    template: "brand",
    brandHeader: "linear-gradient(135deg,#1a2046 0%,#0f1330 60%,#0a0d22 100%)",
    accentColor: "#ff5a1f",
  },
};

/** Selectable presets for the admin UI. */
export const PRESET_OPTIONS: { id: string; label: string }[] = [
  { id: "perspective", label: "Perspective Studio" },
];
