import "server-only";
import { prisma } from "@/lib/db";
import { appUrl } from "@/lib/constants";
import { parseTemplate, hasTemplate, type CardTemplateSpec, type MergeData } from "@/lib/card-template";
import { presetSpec, CARD_PRESETS } from "@/lib/preset-cards";

export type MyCard = {
  spec: CardTemplateSpec;
  merge: MergeData;
  profileUrl: string;
};

/**
 * Load a user's editable card design (or seed the Perspective Studio
 * starting template when they haven't customised one yet) plus the merge
 * data (name/role/contact) used to fill {{tokens}}.
 */
export async function loadMyCard(userId: string): Promise<MyCard | null> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: { user: true },
  });
  if (!profile) return null;

  const profileUrl = profile.username ? `${appUrl()}/u/${profile.username}` : appUrl();
  const merge: MergeData = {
    name: profile.user.name || "Your Name",
    jobTitle: profile.jobTitle || "",
    company: profile.company || "",
    url: profileUrl,
    email: profile.email || profile.user.email,
    phone: profile.phone || "",
    location: profile.location || "",
  };

  // A card still on a built-in preset (not "custom") always renders from the
  // CURRENT preset template, so brand/layout fixes flow through without a
  // manual "reset" — the saved snapshot is only authoritative once the user
  // has actually customised it in the designer (which sets cardPreset
  // "custom").
  const onPreset =
    profile.cardPreset != null &&
    (CARD_PRESETS as readonly string[]).includes(profile.cardPreset);
  const stored = parseTemplate(profile.cardDesign);
  const spec = onPreset
    ? await presetSpec(profile.cardPreset)
    : hasTemplate(stored)
      ? stored!
      : await presetSpec(profile.cardPreset);
  return { spec, merge, profileUrl };
}
