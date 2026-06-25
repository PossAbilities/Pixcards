import crypto from "crypto";
import Link from "next/link";
import type { Metadata } from "next";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { buttonClass } from "@/components/ui";
import { AcceptInvite } from "@/components/org/AcceptInvite";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Join a team | ${APP_NAME}`,
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

export default async function OrgJoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const invite = await prisma.orgInvite.findUnique({
    where: { tokenHash },
    include: { org: true },
  });

  if (!invite || invite.acceptedAt || invite.expiresAt.getTime() < Date.now()) {
    return (
      <Shell>
        <Icon name="link_off" className="mx-auto text-[44px] text-faint" />
        <h1 className="mt-3 font-display text-xl font-bold text-ink">
          Invite invalid or expired
        </h1>
        <p className="mt-2 text-sm text-muted">
          Ask your organisation admin to send a fresh invitation.
        </p>
      </Shell>
    );
  }

  const user = await getSessionUser();
  if (!user) {
    const next = encodeURIComponent(`/org/join/${token}`);
    return (
      <Shell>
        <Icon name="groups" className="mx-auto text-[44px] text-primary" />
        <h1 className="mt-3 font-display text-xl font-bold text-ink">
          Join {invite.org.name}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Sign in or create your free account to join the team and get your
          branded card.
        </p>
        <Link href={`/login?next=${next}`} className={buttonClass("primary", "md", "mt-5 w-full")}>
          Log in to join
        </Link>
        <Link href={`/register?next=${next}`} className={buttonClass("outline", "md", "mt-2 w-full")}>
          Create a free account
        </Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <Icon name="groups" className="mx-auto text-[44px] text-primary" />
      <h1 className="mt-3 font-display text-xl font-bold text-ink">
        Join {invite.org.name}
      </h1>
      <p className="mt-2 text-sm text-muted">
        You&apos;ve been invited to join <strong>{invite.org.name}</strong> on
        Pixcards as <strong>{user.name}</strong>. Your card will use the team
        brand.
      </p>
      <AcceptInvite token={token} />
    </Shell>
  );
}
