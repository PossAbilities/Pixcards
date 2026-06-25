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
          user: {
            select: {
              name: true,
              email: true,
              profile: {
                select: {
                  id: true,
                  username: true,
                  jobTitle: true,
                  phone: true,
                  email: true,
                  bio: true,
                  location: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.orgInvite.findMany({
        where: { orgId: myOrg.id, acceptedAt: null },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Team analytics (last 30 days).
    const profileIds = members
      .map((m) => m.user.profile?.id)
      .filter((x): x is string => Boolean(x));
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [views, taps, clicks, viewsByProfile] = await Promise.all([
      prisma.analyticsEvent.count({
        where: { profileId: { in: profileIds }, type: "VIEW", createdAt: { gte: since } },
      }),
      prisma.analyticsEvent.count({
        where: { profileId: { in: profileIds }, type: "TAP", createdAt: { gte: since } },
      }),
      prisma.analyticsEvent.count({
        where: { profileId: { in: profileIds }, type: "LINK_CLICK", createdAt: { gte: since } },
      }),
      prisma.analyticsEvent.groupBy({
        by: ["profileId"],
        where: { profileId: { in: profileIds }, type: "VIEW", createdAt: { gte: since } },
        _count: { _all: true },
      }),
    ]);
    const viewMap = new Map(viewsByProfile.map((v) => [v.profileId, v._count._all]));

    data = {
      id: myOrg.id,
      name: myOrg.name,
      company: myOrg.company,
      theme: myOrg.theme,
      template: myOrg.template,
      accentColor: myOrg.accentColor,
      role: myOrg.role,
      analytics: { views, taps, clicks },
      members: members.map((m) => ({
        id: m.id,
        name: m.user.name,
        email: m.user.email,
        username: m.user.profile?.username ?? null,
        role: m.role,
        jobTitle: m.user.profile?.jobTitle ?? "",
        phone: m.user.profile?.phone ?? "",
        contactEmail: m.user.profile?.email ?? "",
        bio: m.user.profile?.bio ?? "",
        location: m.user.profile?.location ?? "",
        views: m.user.profile?.id ? (viewMap.get(m.user.profile.id) ?? 0) : 0,
      })),
      invites: invites.map((i) => ({ id: i.id, email: i.email, role: i.role })),
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
