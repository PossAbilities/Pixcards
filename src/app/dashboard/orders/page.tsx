import Link from "next/link";
import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { material, money } from "@/lib/constants";
import { Icon } from "@/components/Icon";
import { buttonClass, Badge, Card } from "@/components/ui";
import { cn, formatDate } from "@/lib/utils";

type BadgeColor = "neutral" | "primary" | "success" | "warning" | "danger" | "info";

const STATUS_BADGE: Record<string, BadgeColor> = {
  PENDING: "neutral",
  PAID: "info",
  PRINTING: "warning",
  SHIPPED: "primary",
  DELIVERED: "success",
  CANCELLED: "danger",
};

const TIMELINE: { status: string; label: string; icon: string }[] = [
  { status: "PENDING", label: "Pending", icon: "schedule" },
  { status: "PAID", label: "Paid", icon: "credit_card" },
  { status: "PRINTING", label: "Printing", icon: "print" },
  { status: "SHIPPED", label: "Shipped", icon: "local_shipping" },
  { status: "DELIVERED", label: "Delivered", icon: "check_circle" },
];

function StatusTimeline({ status }: { status: string }) {
  if (status === "CANCELLED") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm font-medium text-red-700">
        <Icon name="cancel" className="text-[18px]" />
        This order was cancelled.
      </div>
    );
  }
  const currentIndex = TIMELINE.findIndex((s) => s.status === status);
  return (
    <div className="flex items-center">
      {TIMELINE.map((step, i) => {
        const done = i <= currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <div key={step.status} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors",
                  done
                    ? "border-primary bg-primary text-white"
                    : "border-outline bg-surface text-faint",
                  isCurrent && "ring-4 ring-primary-soft",
                )}
              >
                <Icon name={step.icon} className="text-[18px]" />
              </div>
              <span
                className={cn(
                  "text-[11px] font-semibold",
                  done ? "text-ink" : "text-faint",
                )}
              >
                {step.label}
              </span>
            </div>
            {i < TIMELINE.length - 1 && (
              <div
                className={cn(
                  "mx-1 h-0.5 flex-1 rounded-full -translate-y-2.5",
                  i < currentIndex ? "bg-primary" : "bg-outline",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const user = await requireUser();
  const { success } = await searchParams;

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
            My Orders
          </h1>
          <p className="mt-1 text-muted">
            Track your physical NFC card orders.
          </p>
        </div>
        <Link href="/dashboard/order" className={buttonClass("primary", "md")}>
          <Icon name="add" className="text-[18px]" />
          Order a new card
        </Link>
      </header>

      {success && (
        <div className="mb-6 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          <Icon name="celebration" className="text-[20px] mt-0.5 shrink-0" />
          <span>Order placed! 🎉 We&apos;ll start production shortly.</span>
        </div>
      )}

      {orders.length === 0 ? (
        <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary-soft">
            <Icon name="credit_card" className="text-primary text-[40px]" />
          </div>
          <h2 className="font-display text-xl font-semibold text-ink">
            You haven&apos;t ordered a physical card yet
          </h2>
          <p className="mt-1.5 max-w-sm text-sm text-muted">
            Design a premium NFC card linked to your profile and start sharing
            with a tap.
          </p>
          <Link
            href="/dashboard/order"
            className={buttonClass("primary", "lg", "mt-6")}
          >
            <Icon name="design_services" className="text-[20px]" />
            Design your card
          </Link>
        </Card>
      ) : (
        <div className="space-y-5">
          {orders.map((order) => {
            const mat = material(order.material);
            const badgeColor = STATUS_BADGE[order.status] ?? "neutral";
            return (
              <Card key={order.id} className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <span
                      className="h-12 w-16 shrink-0 rounded-md border border-black/10 shadow-inner"
                      style={{ background: mat.swatch }}
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display font-semibold text-ink">
                          {mat.name}
                        </h3>
                        <Badge color={badgeColor}>{order.status}</Badge>
                      </div>
                      <p className="mt-0.5 text-sm text-muted">
                        Card name:{" "}
                        <span className="font-medium text-ink">
                          {order.cardName || "—"}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-faint">
                        Ordered {formatDate(order.createdAt)} · Qty{" "}
                        {order.quantity}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg font-bold text-primary-deep">
                      {money(order.priceCents)}
                    </p>
                    {order.trackingNumber && (
                      <p className="mt-1 flex items-center justify-end gap-1 text-xs text-muted">
                        <Icon name="package_2" className="text-[14px]" />
                        Tracking:{" "}
                        <span className="font-medium text-ink">
                          {order.trackingNumber}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6 border-t border-outline pt-5">
                  <StatusTimeline status={order.status} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
