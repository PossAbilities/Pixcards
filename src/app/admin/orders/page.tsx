import { prisma } from "@/lib/db";
import { OrdersTable } from "@/components/admin/OrdersTable";
import { type AdminOrder } from "@/components/admin/OrderRow";

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

  return <OrdersTable orders={rows} />;
}
