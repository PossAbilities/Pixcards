"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { Badge, ProBadge } from "@/components/ui";
import { setUserPlan, setUserRole, deleteUser } from "@/lib/actions/admin";
import { colorFromString, formatDate, initials } from "@/lib/utils";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  plan: "FREE" | "PRO";
  role: "USER" | "ADMIN";
  ordersCount: number;
  createdAt: string;
};

export function UserRow({
  user,
  currentAdminId,
}: {
  user: AdminUser;
  currentAdminId: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isSelf = user.id === currentAdminId;

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error ?? "Action failed");
        if (res.error) alert(res.error);
      } else {
        setOpen(false);
      }
    });
  }

  function togglePlan() {
    run(() => setUserPlan(user.id, user.plan === "PRO" ? "FREE" : "PRO"));
  }

  function toggleRole() {
    run(() => setUserRole(user.id, user.role === "ADMIN" ? "USER" : "ADMIN"));
  }

  function remove() {
    if (!confirm(`Delete ${user.name}? This cannot be undone.`)) return;
    run(() => deleteUser(user.id));
  }

  return (
    <tr className="border-t border-black/5 hover:bg-surface-low/50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <span
            className="grid place-items-center w-9 h-9 rounded-full text-white font-bold text-xs shrink-0"
            style={{ background: colorFromString(user.name || user.email) }}
          >
            {initials(user.name || user.email)}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink truncate">
              {user.name}
            </p>
            <p className="text-xs text-muted truncate">
              {user.username ? `@${user.username}` : "no profile"}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-muted truncate max-w-[220px]">
        {user.email}
      </td>
      <td className="px-4 py-3">
        {user.plan === "PRO" ? <ProBadge /> : <Badge color="neutral">Free</Badge>}
        {user.role === "ADMIN" && (
          <Badge color="primary" className="ml-1.5">
            Admin
          </Badge>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-ink text-center tabular-nums">
        {user.ordersCount}
      </td>
      <td className="px-4 py-3 text-sm text-muted whitespace-nowrap">
        {formatDate(user.createdAt)}
      </td>
      <td className="px-4 py-3 text-right relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={isPending}
          aria-label="Actions"
          className="grid place-items-center w-8 h-8 rounded-lg text-muted hover:bg-surface-high hover:text-ink transition-colors ml-auto"
        >
          <Icon
            name={isPending ? "progress_activity" : "more_vert"}
            className={isPending ? "text-[18px] animate-spin" : "text-[18px]"}
          />
        </button>

        {open && (
          <>
            <button
              type="button"
              aria-hidden
              tabIndex={-1}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-10 cursor-default"
            />
            <div className="absolute right-4 top-12 z-20 w-52 rounded-xl border border-black/5 bg-surface shadow-lg p-1 text-left">
              <button
                type="button"
                onClick={togglePlan}
                disabled={isPending}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink hover:bg-surface-low transition-colors disabled:opacity-50"
              >
                <Icon name="bolt" className="text-[18px] text-tertiary" />
                {user.plan === "PRO" ? "Downgrade to Free" : "Upgrade to Pro"}
              </button>
              <button
                type="button"
                onClick={toggleRole}
                disabled={isPending || (isSelf && user.role === "ADMIN")}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink hover:bg-surface-low transition-colors disabled:opacity-40"
              >
                <Icon name="shield_person" className="text-[18px] text-primary" />
                {user.role === "ADMIN" ? "Revoke admin" : "Make admin"}
              </button>
              <div className="my-1 h-px bg-black/5" />
              <button
                type="button"
                onClick={remove}
                disabled={isPending || isSelf}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
              >
                <Icon name="delete" className="text-[18px]" />
                Delete user
              </button>
              {error && (
                <p className="px-3 py-1.5 text-xs text-red-600">{error}</p>
              )}
            </div>
          </>
        )}
      </td>
    </tr>
  );
}
