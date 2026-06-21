import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { buttonClass } from "@/components/ui";
import { ClaimCard } from "@/components/c/ClaimCard";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { normaliseCardCode } from "@/lib/cards";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Activate your card | ${APP_NAME}`,
  robots: { index: false },
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo href="/" />
        </div>
        <div className="rounded-3xl bg-surface p-7 text-center shadow-xl ring-1 ring-black/5">
          {children}
        </div>
      </div>
    </main>
  );
}

export default async function CardTapPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: raw } = await params;
  const code = normaliseCardCode(raw);

  const card = await prisma.card.findUnique({
    where: { code },
    include: { user: { include: { profile: true } } },
  });

  // Unknown code.
  if (!card) {
    return (
      <Shell>
        <Icon
          name="help"
          className="mx-auto text-[44px] text-faint"
        />
        <h1 className="mt-3 font-display text-xl font-bold text-ink">
          Card not recognised
        </h1>
        <p className="mt-2 text-sm text-muted">
          We couldn&apos;t find a Pixcard with this code. Check the link or get
          in touch and we&apos;ll help.
        </p>
        <Link href="/" className={buttonClass("outline", "md", "mt-5 w-full")}>
          Go to {APP_NAME}
        </Link>
      </Shell>
    );
  }

  // Deactivated by its owner.
  if (!card.active) {
    return (
      <Shell>
        <Icon name="block" className="mx-auto text-[44px] text-faint" />
        <h1 className="mt-3 font-display text-xl font-bold text-ink">
          This card is inactive
        </h1>
        <p className="mt-2 text-sm text-muted">
          The owner has temporarily disabled this card.
        </p>
      </Shell>
    );
  }

  // Claimed → record the tap and forward to the owner's profile.
  if (card.userId && card.user?.profile?.username) {
    await prisma.card
      .update({
        where: { id: card.id },
        data: { tapCount: { increment: 1 }, lastTapAt: new Date() },
      })
      .catch(() => {});
    redirect(`/u/${card.user.profile.username}`);
  }

  // Claimed but the owner hasn't finished their profile yet.
  if (card.userId) {
    return (
      <Shell>
        <Icon name="hourglass_empty" className="mx-auto text-[44px] text-primary" />
        <h1 className="mt-3 font-display text-xl font-bold text-ink">
          Almost there
        </h1>
        <p className="mt-2 text-sm text-muted">
          This card is active, but its owner is still setting up their profile.
          Check back shortly.
        </p>
      </Shell>
    );
  }

  // Unclaimed → activation flow.
  const user = await getSessionUser();
  if (!user) {
    const next = encodeURIComponent(`/c/${code}`);
    return (
      <Shell>
        <Icon name="contactless" className="mx-auto text-[44px] text-primary" />
        <h1 className="mt-3 font-display text-xl font-bold text-ink">
          Activate your Pixcard
        </h1>
        <p className="mt-2 text-sm text-muted">
          Sign in or create a free account to link this card to your digital
          profile. After that, every tap opens your card.
        </p>
        <p className="mt-4 rounded-lg bg-surface-low py-2 font-mono text-sm font-bold tracking-widest text-ink">
          {code}
        </p>
        <Link
          href={`/login?next=${next}`}
          className={buttonClass("primary", "md", "mt-5 w-full")}
        >
          <Icon name="login" className="text-[18px]" />
          Log in to activate
        </Link>
        <Link
          href={`/register?next=${next}`}
          className={buttonClass("outline", "md", "mt-2 w-full")}
        >
          Create a free account
        </Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <Icon name="contactless" className="mx-auto text-[44px] text-primary" />
      <h1 className="mt-3 font-display text-xl font-bold text-ink">
        Activate this card
      </h1>
      <p className="mt-2 text-sm text-muted">
        Link this Pixcard to your account, <strong>{user.name}</strong>. Once
        activated, tapping it opens your digital profile.
      </p>
      <p className="mt-4 rounded-lg bg-surface-low py-2 font-mono text-sm font-bold tracking-widest text-ink">
        {code}
      </p>
      <ClaimCard code={code} />
    </Shell>
  );
}
