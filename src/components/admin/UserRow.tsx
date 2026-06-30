"use client";

import { useRef, useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { Badge, ProBadge, buttonClass } from "@/components/ui";
import {
  setUserPlan,
  setUserRole,
  deleteUser,
  grantPro,
  revokePro,
  setUserCardPreset,
  clearUserCardsAndOrders,
} from "@/lib/actions/admin";
import { PRESET_OPTIONS } from "@/lib/card-preset-meta";
import { cn, colorFromString, formatDate, initials } from "@/lib/utils";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  plan: "FREE" | "PRO";
  proUntil: string | null;
  proComplimentary: boolean;
  role: "USER" | "ADMIN";
  cardPreset: string | null;
  ordersCount: number;
  createdAt: string;
};

const PRO_DURATIONS: { label: string; days: number | null }[] = [
  { label: "1 month", days: 30 },
  { label: "3 months", days: 90 },
  { label: "6 months", days: 180 },
  { label: "1 year", days: 365 },
  { label: "Lifetime", days: null },
];

export function UserRow({
  user,
  currentAdminId,
}: {
  user: AdminUser;
  currentAdminId: string;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [proOpen, setProOpen] = useState(false);

  function toggleMenu() {
    if (open) {
      setOpen(false);
      return;
    }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setMenuPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    setOpen(true);
  }
  const [durationDays, setDurationDays] = useState<number | null>(30);
  const [complimentary, setComplimentary] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isSelf = user.id === currentAdminId;
  const isPro = user.plan === "PRO";

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

  function grant() {
    setError(null);
    startTransition(async () => {
      const res = await grantPro(user.id, durationDays, complimentary);
      if (!res.ok) {
        setError(res.error ?? "Action failed");
        if (res.error) alert(res.error);
      } else {
        setProOpen(false);
        setOpen(false);
      }
    });
  }

  function revoke() {
    if (!confirm(`Revoke Pro from ${user.name}? They will return to Free.`))
      return;
    setError(null);
    startTransition(async () => {
      const res = await revokePro(user.id);
      if (!res.ok) {
        setError(res.error ?? "Action failed");
        if (res.error) alert(res.error);
      } else {
        setProOpen(false);
        setOpen(false);
      }
    });
  }

  function toggleRole() {
    run(() => setUserRole(user.id, user.role === "ADMIN" ? "USER" : "ADMIN"));
  }

  function remove() {
    if (!confirm(`Delete ${user.name}? This cannot be undone.`)) return;
    run(() => deleteUser(user.id));
  }

  function clearCards() {
    if (
      !confirm(
        `Delete ALL card orders and NFC cards for ${user.name} (${user.email})? This can't be undone.`,
      )
    )
      return;
    run(() => clearUserCardsAndOrders(user.id));
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
        <div className="flex items-center gap-1.5">
          {isPro ? <ProBadge /> : <Badge color="neutral">Free</Badge>}
          {user.role === "ADMIN" && <Badge color="primary">Admin</Badge>}
          {isPro && user.proComplimentary && (
            <Badge color="success">Comp</Badge>
          )}
        </div>
        {isPro && (
          <p className="mt-1 text-[11px] text-faint whitespace-nowrap">
            {user.proUntil === null
              ? "Lifetime"
              : `Until ${new Date(user.proUntil).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}`}
          </p>
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
          ref={btnRef}
          type="button"
          onClick={toggleMenu}
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
              onClick={() => {
                setOpen(false);
                setProOpen(false);
              }}
              className="fixed inset-0 z-40 cursor-default"
            />
            <div
              className="fixed z-50 w-60 rounded-xl border border-black/5 bg-surface shadow-lg p-1 text-left"
              style={{ top: menuPos?.top ?? 0, right: menuPos?.right ?? 16 }}
            >
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
                onClick={() => setProOpen((v) => !v)}
                disabled={isPending}
                aria-expanded={proOpen}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink hover:bg-surface-low transition-colors disabled:opacity-50"
              >
                <Icon name="workspace_premium" className="text-[18px] text-tertiary" />
                Manage Pro
                <Icon
                  name={proOpen ? "expand_less" : "expand_more"}
                  className="text-[18px] text-faint ml-auto"
                />
              </button>
              {proOpen && (
                <div className="mx-1 mb-1 rounded-lg bg-surface-low/70 p-3 space-y-2.5">
                  <label className="block">
                    <span className="text-[11px] font-semibold text-muted">
                      Duration
                    </span>
                    <select
                      value={durationDays === null ? "lifetime" : String(durationDays)}
                      onChange={(e) =>
                        setDurationDays(
                          e.target.value === "lifetime"
                            ? null
                            : Number(e.target.value),
                        )
                      }
                      disabled={isPending}
                      className="mt-1 w-full rounded-lg border border-outline bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
                    >
                      {PRO_DURATIONS.map((d) => (
                        <option
                          key={d.label}
                          value={d.days === null ? "lifetime" : String(d.days)}
                        >
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={complimentary}
                      onChange={(e) => setComplimentary(e.target.checked)}
                      disabled={isPending}
                      className="h-4 w-4 rounded border-outline text-primary focus:ring-primary/40"
                    />
                    Complimentary (free grant)
                  </label>
                  <button
                    type="button"
                    onClick={grant}
                    disabled={isPending}
                    className={buttonClass("primary", "sm", "w-full")}
                  >
                    {isPending ? "Saving…" : "Grant Pro"}
                  </button>
                  {isPro && (
                    <button
                      type="button"
                      onClick={revoke}
                      disabled={isPending}
                      className={cn(buttonClass("outline", "sm", "w-full"), "text-red-600")}
                    >
                      Revoke Pro
                    </button>
                  )}
                </div>
              )}
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
              <div className="px-3 py-2">
                <span className="flex items-center gap-2 text-sm text-ink">
                  <Icon name="badge" className="text-[18px] text-primary" />
                  Card template
                </span>
                <select
                  value={user.cardPreset ?? ""}
                  onChange={(e) =>
                    run(() => setUserCardPreset(user.id, e.target.value || null))
                  }
                  disabled={isPending}
                  className="mt-1.5 w-full rounded-lg border border-outline bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
                >
                  <option value="">None</option>
                  {user.cardPreset === "custom" && (
                    <option value="custom">Custom (their own edited design)</option>
                  )}
                  {PRESET_OPTIONS.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
                <span className="mt-1 block text-[11px] text-faint">
                  Seeds an editable starting design + themes their digital
                  profile. They can drag/resize/edit it freely afterwards.
                </span>
              </div>
              <div className="my-1 h-px bg-black/5" />
              <button
                type="button"
                onClick={clearCards}
                disabled={isPending}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
              >
                <Icon name="credit_card_off" className="text-[18px]" />
                Clear orders &amp; cards
              </button>
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
