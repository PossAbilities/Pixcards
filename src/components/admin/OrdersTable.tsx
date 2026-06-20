"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { Card, buttonClass } from "@/components/ui";
import { material, money, ORDER_STATUSES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { OrderRow, type AdminOrder } from "@/components/admin/OrderRow";

type StatusFilter = "ALL" | (typeof ORDER_STATUSES)[number];

const FILTERS: StatusFilter[] = ["ALL", ...ORDER_STATUSES];

function csvCell(value: string | number): string {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(orders: AdminOrder[]): string {
  const header = [
    "Order ID",
    "User",
    "Email",
    "Card Type",
    "Quantity",
    "Price",
    "Status",
    "Date",
    "Tracking",
  ];
  const lines = orders.map((o) =>
    [
      o.id,
      o.user.name,
      o.user.email,
      material(o.material).name,
      o.quantity,
      money(o.priceCents),
      o.status,
      formatDate(o.createdAt),
      o.trackingNumber ?? "",
    ]
      .map(csvCell)
      .join(","),
  );
  return [header.map(csvCell).join(","), ...lines].join("\r\n");
}

export function OrdersTable({ orders }: { orders: AdminOrder[] }) {
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [menuOpen, setMenuOpen] = useState(false);

  const visible = useMemo(
    () =>
      filter === "ALL"
        ? orders
        : orders.filter((o) => o.status === filter),
    [orders, filter],
  );

  function exportCsv() {
    const csv = buildCsv(visible);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 10);
    const suffix = filter === "ALL" ? "all" : filter.toLowerCase();
    a.download = `orders-${suffix}-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink">
            Order Management
          </h1>
          <p className="mt-1 text-muted">
            Production &amp; logistics ·{" "}
            <span className="font-medium text-ink tabular-nums">
              {visible.length}
            </span>{" "}
            {visible.length === 1 ? "order" : "orders"}
            {filter !== "ALL" && (
              <>
                {" "}
                in <span className="font-medium text-ink">{filter}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            disabled={visible.length === 0}
            className={buttonClass("outline", "sm")}
          >
            <Icon name="download" className="text-[16px]" />
            Export CSV
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className={buttonClass("outline", "sm")}
            >
              <Icon name="filter_list" className="text-[16px]" />
              Filter
              {filter !== "ALL" && (
                <span className="ml-0.5 inline-flex items-center px-1.5 py-0.5 rounded-full bg-primary-soft text-primary-deep text-[10px] font-bold">
                  {filter}
                </span>
              )}
            </button>
            {menuOpen && (
              <>
                <button
                  type="button"
                  aria-hidden
                  tabIndex={-1}
                  onClick={() => setMenuOpen(false)}
                  className="fixed inset-0 z-10 cursor-default"
                />
                <div className="absolute right-0 top-11 z-20 w-44 rounded-xl border border-black/5 bg-surface shadow-lg p-1">
                  {FILTERS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => {
                        setFilter(f);
                        setMenuOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                        f === filter
                          ? "bg-primary-soft text-primary-deep font-semibold"
                          : "text-ink hover:bg-surface-low",
                      )}
                    >
                      {f === "ALL" ? "All statuses" : f}
                      {f === filter && (
                        <Icon name="check" className="text-[16px]" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
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
              {visible.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted">
                    {orders.length === 0
                      ? "No orders yet."
                      : `No orders with status “${filter}”.`}
                  </td>
                </tr>
              )}
              {visible.map((o) => (
                <OrderRow key={o.id} order={o} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
