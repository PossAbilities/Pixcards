"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { buttonClass, inputClass, Label } from "@/components/ui";
import { updateOrderStatus } from "@/lib/actions/admin";
import { ORDER_STATUSES } from "@/lib/constants";

export function OrderStatusForm({
  orderId,
  currentStatus,
  currentTracking,
}: {
  orderId: string;
  currentStatus: string;
  currentTracking: string;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [tracking, setTracking] = useState(currentTracking);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateOrderStatus(
        orderId,
        status,
        tracking.trim() || undefined,
      );
      if (res.ok) {
        setSaved(true);
      } else {
        setError(res.error ?? "Failed to update order");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="sm:w-44">
          <Label htmlFor="order-status">Status</Label>
          <select
            id="order-status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setSaved(false);
            }}
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
          <Label htmlFor="order-tracking">Tracking number</Label>
          <input
            id="order-tracking"
            value={tracking}
            onChange={(e) => {
              setTracking(e.target.value);
              setSaved(false);
            }}
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
              <Icon
                name="progress_activity"
                className="text-[16px] animate-spin"
              />
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

      {saved && !isPending && (
        <p className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
          <Icon name="check_circle" className="text-[16px]" />
          Changes saved.
        </p>
      )}
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}
