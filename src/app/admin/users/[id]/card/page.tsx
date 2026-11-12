import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { loadMyCard } from "@/lib/mycard";
import { PRESET_OPTIONS } from "@/lib/card-preset-meta";
import { Icon } from "@/components/Icon";
import { buttonClass } from "@/components/ui";
import { AdminCardDesigner } from "@/components/admin/AdminCardDesigner";
import {
  adminSaveUserCardDesign,
  adminResetUserCardDesign,
} from "@/lib/actions/admin-cards";

export const metadata: Metadata = { title: "Card design · Admin" };

/** Admin view of one person's card: change template, edit the design, then order it. */
export default async function AdminUserCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, profile: { select: { cardPreset: true } } },
  });
  if (!user) notFound();
  const card = await loadMyCard(user.id);

  return (
    <div>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/admin/users"
            className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"
          >
            <Icon name="arrow_back" className="text-[18px]" />
            Users
          </Link>
          <h1 className="font-display text-3xl font-bold text-ink">{user.name}&apos;s card</h1>
          <p className="mt-1 text-muted">
            {user.email} · changes here save to their account, so they&apos;ll see them too.
          </p>
        </div>
        {card && (
          <Link
            href={`/admin/cards?newOrder=${encodeURIComponent(user.id)}`}
            className={buttonClass("primary", "md")}
          >
            <Icon name="print" className="text-[18px]" />
            Create a print order
          </Link>
        )}
      </header>

      {card ? (
        <AdminCardDesigner
          userId={user.id}
          currentPreset={user.profile?.cardPreset ?? null}
          presets={PRESET_OPTIONS}
          spec={card.spec}
          merge={card.merge}
          saveAction={adminSaveUserCardDesign.bind(null, user.id)}
          resetAction={adminResetUserCardDesign.bind(null, user.id)}
        />
      ) : (
        <p className="rounded-xl border border-outline bg-surface p-6 text-sm text-muted">
          This person doesn&apos;t have a profile yet, so there&apos;s no card to design.
        </p>
      )}
    </div>
  );
}
