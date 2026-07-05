import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { appUrl } from "@/lib/constants";
import { Icon } from "@/components/Icon";
import { ProfileEditor } from "@/components/dashboard/ProfileEditor";

export default async function EditProfilePage() {
  const user = await requireUser();
  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    include: { links: { orderBy: { position: "asc" } } },
  });

  if (!profile) redirect("/login");

  const shareUrl = `${appUrl()}/u/${profile.username}`;

  // Link restriction (department-first, then org default) if in an org.
  const membership = await prisma.orgMember.findUnique({
    where: { userId: user.id },
    include: {
      org: { select: { allowedLinkTypes: true } },
      department: { select: { allowedLinkTypes: true } },
    },
  });
  let allowedPlatforms: string[] | undefined;
  if (membership) {
    try {
      const raw = membership.department?.allowedLinkTypes ?? membership.org.allowedLinkTypes;
      const v = JSON.parse(raw || "[]") as string[];
      if (Array.isArray(v) && v.length > 0) allowedPlatforms = v;
    } catch {
      /* none */
    }
  }

  return (
    <div>
      <header className="mb-6 flex items-center gap-3 md:mb-8">
        <Link
          href="/dashboard"
          aria-label="Back to your profile"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-outline text-muted transition hover:border-primary/40 hover:text-ink"
        >
          <Icon name="arrow_back" className="text-[20px]" />
        </Link>
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Edit profile</h1>
          <p className="mt-1 text-muted">Changes go live on your page as you save.</p>
        </div>
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
          panelColor: profile.panelColor,
          tileSize: profile.tileSize,
          avatarSize: profile.avatarSize,
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
