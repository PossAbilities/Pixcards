import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DigitalCard, type CardData } from "@/components/DigitalCard";
import { SharePanel } from "@/components/public/SharePanel";
import { AddToWallet } from "@/components/AddToWallet";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { isWalletConfigured } from "@/lib/wallet/config";
import { appUrl, theme as getTheme, APP_NAME } from "@/lib/constants";

async function getProfile(username: string) {
  return prisma.profile.findUnique({
    where: { username },
    include: {
      links: { where: { active: true }, orderBy: { position: "asc" } },
      user: true,
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfile(username);
  if (!profile) {
    return { title: `Card not found | ${APP_NAME}` };
  }
  const name = profile.user.name || username;
  const titleBits = [name, profile.jobTitle].filter(Boolean).join(" — ");
  const description =
    profile.bio ||
    [profile.jobTitle, profile.company].filter(Boolean).join(" at ") ||
    `${name}'s digital business card on ${APP_NAME}.`;
  const url = `${appUrl()}/u/${username}`;
  return {
    title: `${titleBits} | ${APP_NAME}`,
    description,
    openGraph: {
      title: `${titleBits} | ${APP_NAME}`,
      description,
      url,
      type: "profile",
      images: profile.avatarUrl ? [{ url: profile.avatarUrl }] : undefined,
    },
    twitter: {
      card: "summary",
      title: `${titleBits} | ${APP_NAME}`,
      description,
    },
  };
}

export default async function PublicCardPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getProfile(username);
  const viewer = await getSessionUser();
  const isOwner = !!viewer && viewer.id === profile?.userId;

  if (!profile || (!profile.published && !isOwner)) {
    notFound();
  }

  // Record a public view (skip the owner's own preview).
  if (!isOwner) {
    try {
      await prisma.analyticsEvent.create({
        data: { profileId: profile.id, type: "VIEW", referrer: null },
      });
    } catch {
      /* tracking is best-effort */
    }
  }

  const shareUrl = `${appUrl()}/u/${username}`;
  const t = getTheme(profile.theme);
  const accent = profile.accentColor || t.accent;
  const walletEnabled = isWalletConfigured();

  const data: CardData = {
    name: profile.user.name || username,
    jobTitle: profile.jobTitle || undefined,
    company: profile.company || undefined,
    bio: profile.bio || undefined,
    location: profile.location || undefined,
    phone: profile.phone || undefined,
    email: profile.email || undefined,
    avatarUrl: profile.avatarUrl,
    headerUrl: profile.headerUrl,
    themeId: profile.theme,
    links: profile.links.map((l) => ({
      id: l.id,
      platform: l.platform,
      label: l.label,
      url: l.url,
      icon: l.icon,
    })),
  };

  return (
    <main className="min-h-dvh bg-background">
      {/* Subtle themed glow at the top for a premium feel */}
      <div
        className="absolute inset-x-0 top-0 h-56 -z-0 opacity-30 blur-3xl pointer-events-none"
        style={{ background: t.header }}
      />
      <div className="relative z-10 mx-auto max-w-md px-4 py-8 sm:py-12 flex flex-col gap-6">
        {!profile.published && isOwner && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-800">
            This card is unpublished — only you can see it.
          </div>
        )}

        {/* The hosted card */}
        <div className="overflow-hidden rounded-3xl bg-surface shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] ring-1 ring-black/5">
          <DigitalCard
            data={data}
            interactive
            profileId={profile.id}
            shareUrl={shareUrl}
          />
        </div>

        {/* Share tools */}
        <SharePanel
          shareUrl={shareUrl}
          accentColor={accent}
          name={data.name}
        />

        {walletEnabled && (
          <div className="flex justify-center">
            <AddToWallet username={username} />
          </div>
        )}

        {/* CTA + powered-by footer */}
        <div className="flex flex-col items-center gap-3 pt-2 text-center">
          <Link
            href="/register"
            className="text-sm font-semibold text-primary hover:text-primary-deep transition-colors"
          >
            Create your own free card →
          </Link>
          <Link
            href="/"
            className="text-xs font-medium tracking-wide text-faint hover:text-muted transition-colors"
          >
            Powered by {APP_NAME}
          </Link>
        </div>
      </div>
    </main>
  );
}
