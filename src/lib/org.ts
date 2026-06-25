import "server-only";
import { prisma } from "@/lib/db";
import type { OrgRole } from "@prisma/client";

export type MyOrg = {
  id: string;
  name: string;
  role: OrgRole;
  theme: string;
  template: string;
  accentColor: string;
  logoUrl: string | null;
  company: string;
};

/** The organisation (with the caller's role) the user belongs to, or null. */
export async function getMyOrg(userId: string): Promise<MyOrg | null> {
  const m = await prisma.orgMember.findUnique({
    where: { userId },
    include: { org: true },
  });
  if (!m) return null;
  return {
    id: m.org.id,
    name: m.org.name,
    role: m.role,
    theme: m.org.theme,
    template: m.org.template,
    accentColor: m.org.accentColor,
    logoUrl: m.org.logoUrl,
    company: m.org.company,
  };
}

export function isOrgAdminRole(role: OrgRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}
