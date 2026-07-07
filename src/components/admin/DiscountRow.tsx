"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { buttonClass, Badge } from "@/components/ui";
import {
  setDiscountActive,
  deleteDiscount,
  setDiscountPerUserLimit,
} from "@/lib/actions/discounts";
import { money } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export type AdminDiscount = {
  id: string;
  code: string;
  description: string;
  type: "PERCENT" | "FIXED";
  value: number;
  scope: "ALL" | "PRO" | "CARD";
  maxRedemptions: number | null;
  perUserLimit: number;
  timesRedeemed: number;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
};

const SCOPE: Record<
  AdminDiscount["scope"],
  { label: string; color: "info" | "primary" | "neutral" }
> = {
  ALL: { label: "Everything", color: "neutral" },
  PRO: { label: "Pro upgrade", color: "primary" },
  CARD: { label: "Card orders", color: "info" },
};

function valueLabel(d: AdminDiscount): string {
  return d.type === "PERCENT" ? `${d.value}% off` : `${money(d.value)} off`;
}

export function DiscountRow({ discount }: { discount: AdminDiscount }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [perUser, setPerUser] = useState(String(discount.perUserLimit));

  function savePerUser() {
    const n = Math.max(1, Math.floor(Number(perUser)) || 1);
    if (n === discount.perUserLimit) return;
    setError(null);
    startTransition(async () => {
      const res = await setDiscountPerUserLimit(discount.id, n);
      if (!res.ok) setError(res.error ?? "Failed to update limit.");
    });
  }

  const scope = SCOPE[discount.scope];
  const expired =
    discount.expiresAt !== null && new Date(discount.expiresAt) < new Date();

  function toggleActive() {
    setError(null);
    startTransition(async () => {
      const res = await setDiscountActive(discount.id, !discount.active);
      if (!res.ok) setError(res.error ?? "Failed to update code.");
    });
  }

  function remove() {
    if (
      !window.confirm(
        `Delete discount code “${discount.code}”? This cannot be undone.`,
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await deleteDiscount(discount.id);
      if (!res.ok) setError(res.error ?? "Failed to delete code.");
    });
  }

  return (
    <tr className="border-t border-black/5 align-top hover:bg-surface-low/40">
      <td className="px-4 py-3">
        <div className="font-mono font-semibold text-ink tracking-wide">
          {discount.code}
        </div>
        {discount.description && (
          <div className="text-xs text-muted mt-0.5">{discount.description}</div>
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap font-medium text-ink">
        {valueLabel(discount)}
      </td>
      <td className="px-4 py-3">
        <Badge color={scope.color}>{scope.label}</Badge>
      </td>
      <td className="px-4 py-3 whitespace-nowrap tabular-nums text-muted">
        {discount.timesRedeemed}/{discount.maxRedemptions ?? "∞"}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <input
          type="number"
          min={1}
          step={1}
          value={perUser}
          onChange={(e) => setPerUser(e.target.value)}
          onBlur={savePerUser}
          disabled={isPending}
          aria-label={`Uses per customer for ${discount.code}`}
          className="w-16 rounded-lg border border-outline bg-surface px-2 py-1 text-sm tabular-nums text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-muted">
        {discount.expiresAt ? (
          <span className={expired ? "text-amber-600 font-medium" : undefined}>
            {formatDate(discount.expiresAt)}
            {expired && " (expired)"}
          </span>
        ) : (
          "Never"
        )}
      </td>
      <td className="px-4 py-3">
        <Badge color={discount.active ? "success" : "neutral"}>
          {discount.active ? "Active" : "Inactive"}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={toggleActive}
            disabled={isPending}
            className={buttonClass(
              discount.active ? "outline" : "secondary",
              "sm",
            )}
          >
            {discount.active ? "Deactivate" : "Activate"}
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={isPending}
            aria-label={`Delete ${discount.code}`}
            className={buttonClass("danger", "sm")}
          >
            <Icon name="delete" className="text-[16px]" />
          </button>
        </div>
        {error && (
          <p className="mt-1 text-right text-xs font-medium text-red-600">
            {error}
          </p>
        )}
      </td>
    </tr>
  );
}
