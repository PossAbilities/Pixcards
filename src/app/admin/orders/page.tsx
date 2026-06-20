import { prisma } from "@/lib/db";
import { Icon } from "@/components/Icon";
import { Card, buttonClass } from "@/components/ui";
import { OrderRow, type AdminOrder } from "@/components/admin/OrderRow";

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
  });

  const rows: AdminOrder[] = orders.map((o) => ({
    id: o.id,
    status: o.status,
    material: o.material,
    cardName: o.cardName,
    quantity: o.quantity,
    priceCents: o.priceCents,
    trackingNumber: o.trackingNumber,
    createdAt: o.createdAt.toISOString(),
    user: { name: o.user.name, email: o.user.email },
  }));

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink">
            Order Management
          </h1>
          <p className="mt-1 text-muted">Production &amp; logistics</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className={buttonClass("outline", "sm")}>
            <Icon name="download" className="text-[16px]" />
            Export CSV
          </button>
          <button type="button" className={buttonClass("outline", "sm")}>
            <Icon name="filter_list" className="text-[16px]" />
            Filter
          </button>
        </div>
      </header>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[760px]">
            <thead>
              <tr className="text-xs font-semibold text-faint uppercase tracking-wide bg-surface-low/60">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Card Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted">
                    No orders yet.
                  </td>
                </tr>
              )}
              {rows.map((o) => (
                <OrderRow key={o.id} order={o} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
