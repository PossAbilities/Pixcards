import "server-only";
import { prisma } from "@/lib/db";
import { platform } from "@/lib/constants";

/**
 * Shared helpers for putting a user's profile in line with their organisation.
 * Kept out of the "use server" action files so they can't be called directly
 * from the browser.
 */

export type SharedLink = { platform: string; label: string; url: string };

export function parseSharedLinks(json: string): SharedLink[] {
  try {
    const v = JSON.parse(json) as SharedLink[];
    if (Array.isArray(v)) {
      return v
        .filter((l) => l && typeof l.url === "string" && l.url.trim())
        .slice(0, 12)
        .map((l) => ({
          platform: String(l.platform || "custom"),
          label: String(l.label || "").slice(0, 60),
          url: String(l.url).slice(0, 400),
        }));
    }
  } catch {
    /* ignore */
  }
  return [];
}

/** Replace a member's org-locked links with the given set. */
export async function applyLinksToMember(userId: string, links: SharedLink[]) {
  const profile = await prisma.profile.findUnique({ where: { userId }, select: { id: true } });
  if (!profile) return;
  await prisma.link.deleteMany({ where: { profileId: profile.id, orgLocked: true } });
  if (links.length === 0) return;
  await prisma.link.createMany({
    data: links.map((l, i) => ({
      profileId: profile.id,
      platform: l.platform,
      label: l.label || platform(l.platform).label,
      url: l.url,
      icon: platform(l.platform).icon,
      position: i,
      orgLocked: true,
    })),
  });
}

/** Apply an organisation's locked branding + shared links to one user. */
export async function syncProfileToOrg(userId: string, orgId: string) {
  const org = await prisma.organisation.findUnique({ where: { id: orgId } });
  if (!org) return;
  await prisma.profile.updateMany({
    where: { userId },
    data: {
      theme: org.theme,
      template: org.template,
      accentColor: org.accentColor,
      brandHeader: org.brandHeader,
      ...(org.company ? { company: org.company } : {}),
    },
  });
  await applyLinksToMember(userId, parseSharedLinks(org.sharedLinks));
}
