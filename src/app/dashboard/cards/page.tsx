import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { cardTapUrl } from "@/lib/cards";
import { CardsManager, type MyCard } from "@/components/dashboard/CardsManager";

export default async function MyCardsPage() {
  const user = await requireUser();
  const cards = await prisma.card.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const rows: MyCard[] = cards.map((c) => ({
    id: c.id,
    code: c.code,
    label: c.label,
    active: c.active,
    tapCount: c.tapCount,
    tapUrl: cardTapUrl(c.code),
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <div>
      <header className="mb-6 md:mb-8">
        <h1 className="font-display text-3xl font-bold text-ink">My Cards</h1>
        <p className="text-muted mt-1">
          Manage the physical Pixcards linked to your profile.
        </p>
      </header>
      <CardsManager cards={rows} />
    </div>
  );
}
