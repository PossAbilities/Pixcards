import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { appUrl } from "@/lib/constants";
import { Icon } from "@/components/Icon";
import { Card, SectionHeading, buttonClass } from "@/components/ui";
import { ProfileEditor } from "@/components/dashboard/ProfileEditor";
import { PRESET_OPTIONS } from "@/lib/card-preset-meta";

export default async function ProfilePage() {
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

  const presetLabel = profile.cardPreset
    ? (PRESET_OPTIONS.find((p) => p.id === profile.cardPreset)?.label ?? "Your card design")
    : null;
  const v = profile.updatedAt.getTime();

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

      {presetLabel && (
        <Card className="mb-6 p-6">
          <SectionHeading icon="bookmark" title={`Your card template — ${presetLabel}`} />
          <p className="-mt-1 mb-4 text-sm text-muted">
            Name, role and contact fill in automatically from the details
            below. Go to <strong>Order a Card</strong> to drag, resize and
            fully customise the design, or order it as-is.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["front", "back"] as const).map((side) => (
              <div key={side} className="overflow-hidden rounded-xl border border-outline bg-surface-low">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/card-art/my/${side}?v=${v}`}
                  alt={`${side} of your card`}
                  className="block aspect-[1013/638] w-full object-contain"
                />
              </div>
            ))}
          </div>
          <Link href="/dashboard/order" className={buttonClass("primary", "md", "mt-4")}>
            <Icon name="design_services" className="text-[18px]" />
            Edit & order this card
          </Link>
        </Card>
      )}

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
