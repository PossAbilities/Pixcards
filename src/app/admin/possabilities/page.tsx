import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { DOMAIN_DESIGNS } from "@/lib/card-preset-meta";
import { getDomainDefaults } from "@/lib/domain-defaults";
import {
  PossabilitiesManager,
  type DomainAccount,
} from "@/components/admin/PossabilitiesManager";

export const metadata: Metadata = { title: "PossAbilities · Admin" };

const DOMAIN = "possabilities.org.uk";

/**
 * Admin console for every @possabilities.org.uk account: see each person's
 * chosen card design, change it per-account, or apply one design across the
 * whole domain in a single action.
 */
export default async function AdminPossabilitiesPage() {
  await requireAdmin();

  const users = await prisma.user.findMany({
    where: { email: { endsWith: `@${DOMAIN}` } },
    orderBy: { createdAt: "desc" },
    include: {
      profile: { select: { username: true, cardPreset: true } },
      _count: { select: { orders: true } },
    },
  });

  const accounts: DomainAccount[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    username: u.profile?.username ?? null,
    cardPreset: u.profile?.cardPreset ?? null,
    hasProfile: Boolean(u.profile),
    ordersCount: u._count.orders,
    createdAt: u.createdAt.toISOString(),
  }));

  const stored = await getDomainDefaults(DOMAIN);
  // Suggest the known brand values when nothing is saved yet, so the editor
  // starts ready to save rather than blank. (Not active until saved.)
  const defaults = {
    ...stored,
    company: stored.company || "PossAbilities",
    website: stored.website || "https://possabilities.org.uk",
  };

  return (
    <PossabilitiesManager
      domain={DOMAIN}
      accounts={accounts}
      designDefault={DOMAIN_DESIGNS[DOMAIN]?.default ?? "pa-colourbar"}
      designOptions={DOMAIN_DESIGNS[DOMAIN]?.options ?? []}
      defaults={defaults}
    />
  );
}
