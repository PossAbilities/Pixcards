import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { appUrl, theme as getTheme } from "@/lib/constants";
import { Icon } from "@/components/Icon";
import type { CardData } from "@/components/DigitalCard";
import { ProfileShowcase } from "@/components/dashboard/ProfileShowcase";


/** Safe-parse the saved tile order (JSON array of tokens). */
function parseTileOrder(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : null;
  } catch {
    return null;
  }
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: Promise<{ admin?: string }>;
}) {
  const user = await requireUser();
  const adminDenied = (await searchParams)?.admin === "denied";
  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    include: {
      links: { where: { active: true }, orderBy: { position: "asc" } },
    },
  });

  if (!profile) redirect("/login");

  const shareUrl = `${appUrl()}/u/${profile.username}`;
  const t = getTheme(profile.theme);
  const accent = profile.accentColor || t.accent;
  // Big data-URI images go through the image endpoint, same as the live page.
  const imgUrl = (kind: "avatar" | "header", value: string | null) =>
    value
      ? value.startsWith("data:")
        ? `/api/img/${kind}/${profile.id}`
        : value
      : undefined;

  const data: CardData = {
    name: user.name || profile.username,
    jobTitle: profile.jobTitle || undefined,
    company: profile.company || undefined,
    bio: profile.bio || undefined,
    location: profile.location || undefined,
    phone: profile.phone || undefined,
    email: profile.email || undefined,
    avatarUrl: imgUrl("avatar", profile.avatarUrl),
    headerUrl: imgUrl("header", profile.headerUrl),
    themeId: profile.theme,
    templateId: profile.template,
    brandHeader: profile.brandHeader || undefined,
    accent,
    panelColor: profile.panelColor || undefined,
    tileSize: profile.tileSize,
    tileLayout: profile.tileLayout,
    avatarSize: profile.avatarSize,
    tileOrder: parseTileOrder(profile.tileOrder),
    links: profile.links.map((l) => ({
      id: l.id,
      platform: l.platform,
      label: l.label,
      url: l.url,
      icon: l.icon,
    })),
  };

  return (
    <div>
      {adminDenied && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Icon name="shield_person" className="mt-0.5 text-[18px]" />
          <span>
            The admin panel needs an admin account — you&apos;re signed in as{" "}
            <strong>{user.email}</strong>. Log out, then sign in with your
            admin account to access it.
          </span>
        </div>
      )}
      <header className="mb-6 text-center md:mb-8">
        <h1 className="font-display text-3xl font-bold text-ink">
          Your digital profile
        </h1>
        <p className="mt-1 text-muted">
          This is what people see when they scan your card.
        </p>
      </header>

      <ProfileShowcase data={data} shareUrl={shareUrl} accent={accent} />
    </div>
  );
}
