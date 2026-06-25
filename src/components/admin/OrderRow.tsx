"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui";
import { buttonClass, inputClass } from "@/components/ui";
import { updateOrderStatus, deleteOrder } from "@/lib/actions/admin";
import { material, money, ORDER_STATUSES } from "@/lib/constants";
import { formatDate, initials } from "@/lib/utils";

export type AdminOrder = {
  id: string;
  status: string;
  material: string;
  cardName: string;
  quantity: number;
  priceCents: number;
  trackingNumber: string | null;
  createdAt: string;
  user: { name: string; email: string };
};

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

export function OrderRow({ order }: { order: AdminOrder }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(order.status);
  const [tracking, setTracking] = useState(order.trackingNumber ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const mat = material(order.material);
  const shortId = order.id.slice(-8).toUpperCase();

  function remove() {
    if (
      !confirm(
        `Delete order #${shortId}? This removes the order and its un-encoded cards. This can't be undone.`,
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await deleteOrder(order.id);
      if (res.ok) router.refresh();
      else setError(res.error ?? "Could not delete the order.");
    });
  }

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateOrderStatus(
        order.id,
        status,
        tracking.trim() || undefined,
      );
      if (res.ok) {
        setSaved(true);
        setOpen(false);
      } else {
        setError(res.error ?? "Failed to update order");
      }
    });
  }

  return (
    <>
      <tr className="border-t border-black/5 hover:bg-surface-low/50 transition-colors">
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="grid place-items-center w-9 h-9 rounded-full bg-primary-soft text-primary-deep font-bold text-xs shrink-0">
              {initials(order.user.name || "?")}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink truncate">
                {order.user.name}
              </p>
              <p className="text-xs text-muted truncate">{order.user.email}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span
              className="w-5 h-5 rounded-md border border-black/10 shrink-0"
              style={{ background: mat.swatch }}
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink truncate">
                {mat.name}
              </p>
              <p className="text-xs text-muted">
                Qty {order.quantity} · {money(order.priceCents)}
              </p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <Badge color={STATUS_COLOR[order.status] ?? "neutral"}>
            {order.status}
          </Badge>
          {saved && (
            <span className="ml-2 inline-flex items-center gap-0.5 text-xs text-emerald-600 font-semibold">
              <Icon name="check" className="text-[14px]" /> saved
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-muted whitespace-nowrap">
          {formatDate(order.createdAt)}
        </td>
        <td className="px-4 py-3 text-right">
          <div className="inline-flex items-center gap-2">
            <Link
              href={`/admin/orders/${order.id}`}
              className={buttonClass("outline", "sm")}
            >
              <Icon name="visibility" className="text-[16px]" />
              View
            </Link>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className={buttonClass("outline", "sm")}
            >
              <Icon name={open ? "close" : "edit"} className="text-[16px]" />
              {open ? "Close" : "Update"}
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={isPending}
              title={`Delete order #${shortId}`}
              className={buttonClass("danger", "sm")}
            >
              <Icon name="delete" className="text-[16px]" />
            </button>
          </div>
        </td>
      </tr>

      {open && (
        <tr className="border-t border-black/5 bg-surface-low/60">
          <td colSpan={5} className="px-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="sm:w-48">
                <label className="text-xs font-semibold text-muted mb-1.5 block">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={inputClass}
                >
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs font-semibold text-muted mb-1.5 block">
                  Tracking number
                </label>
                <input
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                  placeholder="e.g. RM123456789GB"
                  className={inputClass}
                />
              </div>
              <button
                type="button"
                onClick={save}
                disabled={isPending}
                className={buttonClass("primary", "md")}
              >
                {isPending ? (
                  <>
                    <Icon name="progress_activity" className="text-[16px] animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Icon name="save" className="text-[16px]" />
                    Save
                  </>
                )}
              </button>
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600 font-medium">{error}</p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
