import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { appUrl } from "@/lib/constants";
import { ProfileEditor } from "@/components/dashboard/ProfileEditor";

export default async function ProfilePage() {
  const user = await requireUser();
  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    include: { links: { orderBy: { position: "asc" } } },
  });

  if (!profile) redirect("/login");

  const shareUrl = `${appUrl()}/u/${profile.username}`;

  // Org link restriction (if the user belongs to an organisation).
  const membership = await prisma.orgMember.findUnique({
    where: { userId: user.id },
    include: { org: { select: { allowedLinkTypes: true } } },
  });
  let allowedPlatforms: string[] | undefined;
  if (membership) {
    try {
      const v = JSON.parse(membership.org.allowedLinkTypes || "[]") as string[];
      if (Array.isArray(v) && v.length > 0) allowedPlatforms = v;
    } catch {
      /* none */
    }
  }

  return (
    <div>
      <header className="mb-6 md:mb-8">
        <h1 className="font-display text-3xl font-bold text-ink">
          Edit Your Digital Profile
        </h1>
        <p className="text-muted mt-1">
          Manage how your professional identity appears to the world.
        </p>
      </header>

      <ProfileEditor
        plan={user.plan}
        shareUrl={shareUrl}
        profile={{
          name: user.name,
          username: profile.username,
          jobTitle: profile.jobTitle,
          company: profile.company,
          bio: profile.bio,
          location: profile.location,
          phone: profile.phone,
          email: profile.email,
          avatarUrl: profile.avatarUrl,
          headerUrl: profile.headerUrl,
          theme: profile.theme,
          template: profile.template,
          accentColor: profile.accentColor,
          brandHeader: profile.brandHeader,
        }}
        links={profile.links.map((l) => ({
          id: l.id,
          platform: l.platform,
          label: l.label,
          url: l.url,
          icon: l.icon,
          orgLocked: l.orgLocked,
        }))}
        allowedPlatforms={allowedPlatforms}
      />
    </div>
  );
}
