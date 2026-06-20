import Link from "next/link";
import { prisma } from "@/lib/db";
import { Icon } from "@/components/Icon";
import { Badge, Card, buttonClass } from "@/components/ui";
import { material, money } from "@/lib/constants";
import { formatDate, initials } from "@/lib/utils";

type StatColor = "primary" | "tertiary" | "amber" | "indigo";

const STAT_CHIP: Record<StatColor, string> = {
  primary: "bg-primary-soft text-primary-deep",
  tertiary: "bg-tertiary-soft text-tertiary",
  amber: "bg-amber-100 text-amber-700",
  indigo: "bg-indigo-100 text-indigo-700",
};

function StatCard({
  icon,
  color,
  label,
  value,
  delta,
}: {
  icon: string;
  color: StatColor;
  label: string;
  value: string;
  delta: number;
}) {
  const up = delta >= 0;
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <span
          className={`grid place-items-center w-11 h-11 rounded-xl ${STAT_CHIP[color]}`}
        >
          <Icon name={icon} fill className="text-[22px]" />
        </span>
        <span
          className={
            up
              ? "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700"
              : "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700"
          }
        >
          <Icon
            name={up ? "trending_up" : "trending_down"}
            className="text-[14px]"
          />
          {up ? "+" : ""}
          {delta}%
        </span>
      </div>
      <p className="mt-4 font-display text-3xl font-extrabold text-ink tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </Card>
  );
}

const STATUS_COLOR: Record<
  string,
  "neutral" | "primary" | "success" | "warning" | "danger" | "info"
> = {
  PENDING: "neutral",
  PAID: "info",
  PRINTING: "warning",
  SHIPPED: "primary",
  DELIVERED: "success",
  CANCELLED: "danger",
};

export default async function AdminOverviewPage() {
  const [
    totalUsers,
    proUsers,
    totalOrders,
    pendingOrders,
    activeCards,
    revenueAgg,
    recentOrders,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { plan: "PRO" } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: { in: ["PENDING", "PAID"] } } }),
    prisma.order.count({ where: { status: { in: ["SHIPPED", "DELIVERED"] } } }),
    prisma.order.aggregate({
      _sum: { priceCents: true },
      where: { status: { not: "CANCELLED" } },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { user: { select: { name: true } } },
    }),
  ]);

  const revenue = revenueAgg._sum.priceCents ?? 0;
  const nf = new Intl.NumberFormat("en-GB");

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink">
            Overview
          </h1>
          <p className="mt-1 text-muted">
            Platform performance, orders and fulfilment at a glance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/orders"
            aria-label={`Recent orders${pendingOrders > 0 ? `, ${pendingOrders} pending` : ""}`}
            className="relative grid place-items-center w-11 h-11 rounded-xl bg-surface border border-black/5 text-muted hover:text-ink hover:bg-surface-low transition-colors"
          >
            <Icon name="notifications" className="text-[22px]" />
            {pendingOrders > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-tertiary-bright ring-2 ring-surface" />
            )}
          </Link>
          <Link href="/dashboard/order" className={buttonClass("primary", "md")}>
            <Icon name="add" className="text-[18px]" />
            Create Order
          </Link>
        </div>
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon="group"
          color="primary"
          label="Total Users"
          value={nf.format(totalUsers)}
          delta={12}
        />
        <StatCard
          icon="contactless"
          color="tertiary"
          label="Active Cards"
          value={nf.format(activeCards)}
          delta={8}
        />
        <StatCard
          icon="pending_actions"
          color="amber"
          label="Pending Orders"
          value={nf.format(pendingOrders)}
          delta={-4}
        />
        <StatCard
          icon="payments"
          color="indigo"
          label="Total Revenue"
          value={money(revenue)}
          delta={18}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent orders */}
        <Card className="lg:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-black/5">
            <div className="flex items-center gap-2">
              <Icon name="receipt_long" className="text-primary text-[22px]" />
              <h2 className="font-display text-lg font-semibold">
                Recent Orders
              </h2>
            </div>
            <Link
              href="/admin/orders"
              className="text-sm font-semibold text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-semibold text-faint uppercase tracking-wide">
                  <th className="px-5 py-2.5">User</th>
                  <th className="px-5 py-2.5">Card Type</th>
                  <th className="px-5 py-2.5">Status</th>
                  <th className="px-5 py-2.5">Date</th>
                  <th className="px-5 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-muted">
                      No orders yet.
                    </td>
                  </tr>
                )}
                {recentOrders.map((o) => (
                  <tr
                    key={o.id}
                    className="border-t border-black/5 hover:bg-surface-low/50 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="grid place-items-center w-8 h-8 rounded-full bg-primary-soft text-primary-deep font-bold text-[11px] shrink-0">
                          {initials(o.user.name || "?")}
                        </span>
                        <span className="text-sm font-medium text-ink truncate">
                          {o.user.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-muted">
                      {material(o.material).name}
                    </td>
                    <td className="px-5 py-3">
                      <Badge color={STATUS_COLOR[o.status] ?? "neutral"}>
                        {o.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-sm text-muted whitespace-nowrap">
                      {formatDate(o.createdAt)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href="/admin/orders"
                        className="text-sm font-semibold text-primary hover:underline"
                      >
                        Update
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Fulfilment health */}
        <div className="rounded-2xl bg-gradient-to-br from-primary to-primary-deep text-white p-6 shadow-sm shadow-primary/30">
          <div className="flex items-center gap-2">
            <Icon name="local_shipping" fill className="text-[22px]" />
            <h2 className="font-display text-lg font-semibold">
              Fulfilment Health
            </h2>
          </div>
          <p className="mt-1 text-sm text-white/70">
            Live production & inventory signals.
          </p>

          <div className="mt-6 space-y-5">
            <div>
              <div className="flex items-center justify-between text-sm font-medium">
                <span>Batch Processing</span>
                <span className="tabular-nums">85%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-tertiary-bright"
                  style={{ width: "85%" }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm font-medium">
                <span>Inventory Levels</span>
                <span className="tabular-nums">42%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-400"
                  style={{ width: "42%" }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-white/60 text-xs">Total Orders</p>
              <p className="font-display text-xl font-bold tabular-nums">
                {nf.format(totalOrders)}
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-white/60 text-xs">Pro Members</p>
              <p className="font-display text-xl font-bold tabular-nums">
                {nf.format(proUsers)}
              </p>
            </div>
          </div>

          <Link
            href="/admin/orders"
            className={buttonClass(
              "secondary",
              "md",
              "w-full mt-6 bg-white text-primary-deep hover:bg-white/90",
            )}
          >
            <Icon name="fact_check" className="text-[18px]" />
            Review fulfilment queue
          </Link>
        </div>
      </div>
    </div>
  );
}
