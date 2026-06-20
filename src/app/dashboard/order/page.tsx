import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { Icon } from "@/components/Icon";
import { CardDesigner } from "@/components/dashboard/CardDesigner";

export default async function OrderPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const user = await requireUser();
  const { cancelled } = await searchParams;

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { jobTitle: true },
  });
  const defaultTitle =
    profile?.jobTitle && profile.jobTitle.trim().length > 0
      ? profile.jobTitle
      : "Pixcards Member";

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

      <CardDesigner
        plan={user.plan}
        defaultName={user.name}
        defaultTitle={defaultTitle}
      />
    </div>
  );
}
