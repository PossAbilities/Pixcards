import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { Card } from "@/components/ui";
import { DiscountForm } from "@/components/admin/DiscountForm";
import {
  DiscountRow,
  type AdminDiscount,
} from "@/components/admin/DiscountRow";

export default async function AdminDiscountsPage() {
  await requireAdmin();

  const discounts = await prisma.discountCode.findMany({
    orderBy: { createdAt: "desc" },
  });

  const rows: AdminDiscount[] = discounts.map((d) => ({
    id: d.id,
    code: d.code,
    description: d.description ?? "",
    type: d.type,
    value: d.value,
    scope: d.scope,
    maxRedemptions: d.maxRedemptions,
    timesRedeemed: d.timesRedeemed,
    expiresAt: d.expiresAt ? d.expiresAt.toISOString() : null,
    active: d.active,
    createdAt: d.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-extrabold text-ink">
          Discount codes
        </h1>
        <p className="mt-1 text-muted">
          Create codes customers can redeem at checkout.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,380px)_1fr]">
        <div className="lg:sticky lg:top-6 lg:self-start">
          <DiscountForm />
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[820px]">
              <thead>
                <tr className="text-xs font-semibold text-faint uppercase tracking-wide bg-surface-low/60">
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3">Applies to</th>
                  <th className="px-4 py-3">Redeemed</th>
                  <th className="px-4 py-3">Expires</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-muted"
                    >
                      No discount codes yet. Create one to get started.
                    </td>
                  </tr>
                ) : (
                  rows.map((d) => <DiscountRow key={d.id} discount={d} />)
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
