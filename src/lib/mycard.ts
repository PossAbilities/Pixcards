import "server-only";
import { prisma } from "@/lib/db";
import { appUrl } from "@/lib/constants";
import { parseTemplate, hasTemplate, type CardTemplateSpec, type MergeData } from "@/lib/card-template";
import { presetSpec } from "@/lib/preset-cards";

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
  };

  const stored = parseTemplate(profile.cardDesign);
  const spec = hasTemplate(stored) ? stored! : await presetSpec(profile.cardPreset);
  return { spec, merge, profileUrl };
}
