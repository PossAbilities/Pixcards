import type { Metadata } from "next";
import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { cardTapUrl } from "@/lib/cards";
import { AdminCardsTable, type AdminCardRow } from "@/components/admin/AdminCardsTable";
import { NewOrderLauncher } from "@/components/admin/NewOrderLauncher";
import { CARD_MATERIALS } from "@/lib/constants";

export const metadata: Metadata = { title: "Cards · Admin" };

export default async function AdminCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ newOrder?: string }>;
}) {
  await requireAdmin();
  const { newOrder } = await searchParams;
  // Anyone with a profile has a card design that can be printed.
  const orderable = await prisma.user.findMany({
    where: { profile: { isNot: null } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });
  const cards = await prisma.card.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, profile: { select: { username: true } } } },
    },
  });

  const rows: AdminCardRow[] = cards.map((c) => ({
    id: c.id,
    code: c.code,
    tapUrl: cardTapUrl(c.code),
    encoded: c.encoded,
    active: c.active,
    tapCount: c.tapCount,
    orderId: c.orderId,
    owner: c.user
      ? { name: c.user.name, username: c.user.profile?.username ?? null }
      : null,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <div>
      <header className="mb-6 md:mb-8">
        <h1 className="font-display text-3xl font-bold text-ink">NFC Cards</h1>
        <p className="text-muted mt-1">
          Create print orders, generate card codes, encode chips and track activation.
        </p>
      </header>
      <NewOrderLauncher
        users={orderable}
        materials={CARD_MATERIALS.map((m) => ({ id: m.id, name: m.name }))}
        initialUserId={newOrder}
      />
      <AdminCardsTable cards={rows} />
    </div>
  );
}
