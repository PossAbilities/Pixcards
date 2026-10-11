import "server-only";
import { prisma } from "@/lib/db";

/** A standard link derived from a domain's defaults. */
export type StdLink = { platform: string; label: string; url: string; icon: string };

export type DomainDefaultsData = {
  company: string;
  website: string;
  linkedin: string;
  facebook: string;
  instagram: string;
};

const EMPTY: DomainDefaultsData = {
  company: "",
  website: "",
  linkedin: "",
  facebook: "",
  instagram: "",
};

/** Read a domain's standard-details template (empty object if none set). */
export async function getDomainDefaults(domain: string): Promise<DomainDefaultsData> {
  const clean = domain.trim().toLowerCase().replace(/^@+/, "");
  const row = await prisma.domainDefaults.findUnique({ where: { domain: clean } });
  return row
    ? {
        company: row.company,
        website: row.website,
        linkedin: row.linkedin,
        facebook: row.facebook,
        instagram: row.instagram,
      }
    : { ...EMPTY };
}

/** The standard contact/social links implied by a domain's defaults. */
export function standardLinks(d: DomainDefaultsData): StdLink[] {
  const host = (u: string) => u.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/+$/, "");
  const links: StdLink[] = [];
  if (d.website.trim())
    links.push({ platform: "website", label: host(d.website) || "Website", url: d.website.trim(), icon: "language" });
  if (d.linkedin.trim())
    links.push({ platform: "linkedin", label: "LinkedIn", url: d.linkedin.trim(), icon: "link" });
  if (d.facebook.trim())
    links.push({ platform: "facebook", label: "Facebook", url: d.facebook.trim(), icon: "link" });
  if (d.instagram.trim())
    links.push({ platform: "instagram", label: "Instagram", url: d.instagram.trim(), icon: "link" });
  return links;
}

/** True when `data` has anything worth applying. */
export function hasDomainDefaults(d: DomainDefaultsData): boolean {
  return Boolean(d.company.trim() || standardLinks(d).length > 0);
}

/**
 * Pre-fill a profile with a domain's standard details. Sets the company and
 * adds any standard links the profile doesn't already have (matched by
 * platform, so a person's own LinkedIn isn't duplicated). Links are created
 * UNLOCKED — the person can edit or remove them. Nothing is overwritten:
 * company is only set when `overwriteCompany` is true or it's currently blank.
 */
export async function applyDomainDefaultsToProfile(
  profileId: string,
  d: DomainDefaultsData,
  opts: { overwriteCompany?: boolean } = {},
): Promise<void> {
  const existing = await prisma.link.findMany({
    where: { profileId },
    select: { platform: true, position: true },
  });
  const havePlatforms = new Set(existing.map((l) => l.platform.toLowerCase()));
  let position = existing.reduce((m, l) => Math.max(m, l.position), -1) + 1;

  const toCreate = standardLinks(d).filter((l) => !havePlatforms.has(l.platform.toLowerCase()));
  if (toCreate.length > 0) {
    await prisma.link.createMany({
      data: toCreate.map((l) => ({
        profileId,
        platform: l.platform,
        label: l.label,
        url: l.url,
        icon: l.icon,
        position: position++,
        active: true,
      })),
    });
  }

  if (d.company.trim()) {
    if (opts.overwriteCompany) {
      await prisma.profile.update({ where: { id: profileId }, data: { company: d.company.trim() } });
    } else {
      const p = await prisma.profile.findUnique({ where: { id: profileId }, select: { company: true } });
      if (p && !p.company.trim()) {
        await prisma.profile.update({ where: { id: profileId }, data: { company: d.company.trim() } });
      }
    }
  }
}
