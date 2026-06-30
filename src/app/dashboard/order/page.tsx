import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { Icon } from "@/components/Icon";
import { CardStudio } from "@/components/dashboard/CardStudio";
import { SavedCardPanel } from "@/components/dashboard/SavedCardPanel";
import { appUrl, material } from "@/lib/constants";
import { loadMyCard } from "@/lib/mycard";

export default async function OrderPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const user = await requireUser();
  const { cancelled } = await searchParams;

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { jobTitle: true, username: true, avatarUrl: true, cardPreset: true },
  });
  // The saved-card panel is shown once the user has chosen a card template
  // (via the admin attach or by saving their own design).
  const showSavedCard = Boolean(profile?.cardPreset);
  const myCard = showSavedCard ? await loadMyCard(user.id) : null;
  const presetPrice = material("white-gloss").priceCents;
  const defaultTitle =
    profile?.jobTitle && profile.jobTitle.trim().length > 0
      ? profile.jobTitle
      : "Pixcards Member";
  const shareUrl = profile?.username
    ? `${appUrl()}/u/${profile.username}`
    : appUrl();

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
          Design Your Pixcard
        </h1>
        <p className="mt-1 text-muted">
          Pick a material, personalise your card, and we&apos;ll print and ship
          a physical NFC card linked to your profile.
        </p>
      </header>

      {cancelled && (
        <div className="mb-6 flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <Icon name="info" className="text-[20px] mt-0.5 shrink-0" />
          <span>Checkout cancelled — your order was not placed.</span>
        </div>
      )}

      {showSavedCard && myCard ? (
        <>
          <SavedCardPanel
            unitPriceCents={presetPrice}
            defaultName={user.name}
            spec={myCard.spec}
            merge={myCard.merge}
          />
          <details className="group rounded-2xl border border-outline bg-surface">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5">
              <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Icon name="design_services" className="text-[18px] text-muted" />
                Design a different card from scratch
              </span>
              <Icon name="expand_more" className="text-[20px] text-muted transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-outline p-5 pt-2">
              <CardStudio
                plan={user.plan}
                defaultName={user.name}
                defaultTitle={defaultTitle}
                shareUrl={shareUrl}
                avatarUrl={profile?.avatarUrl ?? null}
              />
            </div>
          </details>
        </>
      ) : (
        <CardStudio
          plan={user.plan}
          defaultName={user.name}
          defaultTitle={defaultTitle}
          shareUrl={shareUrl}
          avatarUrl={profile?.avatarUrl ?? null}
        />
      )}
    </div>
  );
}
