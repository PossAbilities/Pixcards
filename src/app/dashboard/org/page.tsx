import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { getMyOrg } from "@/lib/org";
import { OrgManager, type OrgData } from "@/components/dashboard/OrgManager";

export default async function OrgPage() {
  const user = await requireUser();
  const myOrg = await getMyOrg(user.id);

  let data: OrgData = null;
  if (myOrg) {
    const [members, invites] = await Promise.all([
      prisma.orgMember.findMany({
        where: { orgId: myOrg.id },
        include: {
          user: { select: { name: true, email: true, profile: { select: { username: true } } } },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.orgInvite.findMany({
        where: { orgId: myOrg.id, acceptedAt: null },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    data = {
      id: myOrg.id,
      name: myOrg.name,
      company: myOrg.company,
      theme: myOrg.theme,
      template: myOrg.template,
      accentColor: myOrg.accentColor,
      role: myOrg.role,
      members: members.map((m) => ({
        id: m.id,
        name: m.user.name,
        email: m.user.email,
        username: m.user.profile?.username ?? null,
        role: m.role,
      })),
      invites: invites.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
      })),
    };
  }

  return (
    <div>
      <header className="mb-6 md:mb-8">
        <h1 className="font-display text-3xl font-bold text-ink">
          Organisation
        </h1>
        <p className="text-muted mt-1">
          Manage your team&apos;s cards, brand and members in one place.
        </p>
      </header>
      <OrgManager data={data} />
    </div>
  );
}
