import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { cardTapUrl } from "@/lib/cards";
import { Card, SectionHeading } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { WalletButtons } from "@/components/WalletButtons";
import {
  isWalletConfigured,
  isGoogleWalletConfigured,
  appleWalletMissing,
} from "@/lib/wallet/config";
import { CardsManager, type MyCard } from "@/components/dashboard/CardsManager";

export default async function MyCardsPage() {
  const user = await requireUser();
  const [profile, cards] = await Promise.all([
    prisma.profile.findUnique({
      where: { userId: user.id },
      select: { username: true },
    }),
    prisma.card.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const rows: MyCard[] = cards.map((c) => ({
    id: c.id,
    code: c.code,
    label: c.label,
    active: c.active,
    tapCount: c.tapCount,
    tapUrl: cardTapUrl(c.code),
    createdAt: c.createdAt.toISOString(),
  }));

  const appleWallet = isWalletConfigured();
  const googleWallet = isGoogleWalletConfigured();
  const appleMissing = appleWalletMissing();

  return (
    <div>
      <header className="mb-6 md:mb-8">
        <h1 className="font-display text-3xl font-bold text-ink">My Cards</h1>
        <p className="text-muted mt-1">
          Add your card to your phone and manage your physical Pixcards.
        </p>
      </header>

      {/* Add to phone wallet */}
      <Card className="mb-6 p-6">
        <SectionHeading icon="wallet" title="Add your card to your phone" />
        {appleWallet || googleWallet ? (
          <>
            <p className="-mt-1 mb-4 text-sm text-muted">
              Save your digital business card to your phone&apos;s wallet for
              instant access and one-tap sharing.
            </p>
            {profile?.username ? (
              <WalletButtons
                username={profile.username}
                apple={appleWallet}
                google={googleWallet}
              />
            ) : (
              <p className="text-sm text-muted">
                Finish setting up your profile first.
              </p>
            )}
          </>
        ) : (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <Icon name="info" fill className="mt-0.5 text-[18px]" />
            <span>
              Wallet passes aren&apos;t available yet.{" "}
              {appleMissing.length === 5
                ? "The Apple Wallet certificate hasn't been added on the server."
                : `Still needed on the server: ${appleMissing.join(", ")}.`}
            </span>
          </div>
        )}
      </Card>

      <CardsManager cards={rows} />
    </div>
  );
}
