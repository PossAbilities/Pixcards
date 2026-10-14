import "server-only";
import { PRESET_PROFILE_THEME } from "@/lib/card-preset-meta";
import { presetSpec } from "@/lib/preset-cards";

/**
 * Compute the profile update for attaching (or clearing) a card preset:
 * theme fields to match, plus a reseeded starting design when the user has
 * none or is being switched to a *different* preset — never overwriting a
 * design they've customised themselves (cardPreset === "custom") unless
 * `reseed` is set because the owner explicitly picked a new design.
 */
export async function presetUpdate(
  profile: { cardPreset: string | null; cardDesign: string | null },
  preset: string | null,
  { reseed = false }: { reseed?: boolean } = {},
): Promise<Record<string, unknown>> {
  const t = preset ? PRESET_PROFILE_THEME[preset] : null;
  const data: Record<string, unknown> = { cardPreset: preset || null };
  if (t) {
    data.theme = t.theme;
    data.template = t.template;
    data.brandHeader = t.brandHeader;
    data.accentColor = t.accentColor;
    data.panelColor = t.panelColor;
  }
  const switching = preset && profile.cardPreset !== preset;
  const customised = profile.cardPreset === "custom";
  if (t && preset && (reseed || (!customised && (!profile.cardDesign || switching)))) {
    data.cardDesign = JSON.stringify(await presetSpec(preset));
  }
  return data;
}
