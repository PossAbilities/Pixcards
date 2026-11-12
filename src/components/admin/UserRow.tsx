"use client";

import Link from "next/link";

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
  adminCreateOrganisation,
  adminSendInvite,
  adminSendPasswordReset,
  adminSetUserOrganisation,
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
  orgId: string | null;
  orgName: string | null;
  orgRole: "OWNER" | "ADMIN" | "MEMBER" | null;
  ordersCount: number;
  createdAt: string;
  invitedAt: string | null;
  inviteAcceptedAt: string | null;
};

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const PRO_DURATIONS: { label: string; days: number | null }[] = [
  { label: "1 month", days: 30 },
  { label: "3 months", days: 90 },
  { label: "6 months", days: 180 },
  { label: "1 year", days: 365 },
  { label: "Lifetime", days: null },
];

export type AdminOrgOption = { id: string; name: string };

const ORG_ROLE_LABEL = { OWNER: "Owner", ADMIN: "Admin", MEMBER: "Member" } as const;

export function UserRow({
  user,
  orgs,
  currentAdminId,
}: {
  user: AdminUser;
  orgs: AdminOrgOption[];
  currentAdminId: string;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<
    { top?: number; bottom?: number; right: number; maxHeight: number } | null
  >(null);
  const [selOrg, setSelOrg] = useState(user.orgId ?? "");
  const [selRole, setSelRole] = useState<"OWNER" | "ADMIN" | "MEMBER">(
    user.orgRole ?? "MEMBER",
  );
  const [notice, setNotice] = useState<string | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [proOpen, setProOpen] = useState(false);

  function toggleMenu() {
    if (open) {
      setOpen(false);
      return;
    }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      const right = window.innerWidth - r.right;
      const below = window.innerHeight - r.bottom - 12;
      const above = r.top - 12;
      // Open upwards for rows near the bottom of the screen; scroll if still tall.
      setMenuPos(
        below >= 420 || below >= above
          ? { top: r.bottom + 6, right, maxHeight: below }
          : { bottom: window.innerHeight - r.top + 6, right, maxHeight: above },
      );
    }
    setSelOrg(user.orgId ?? "");
    setSelRole(user.orgRole ?? "MEMBER");
    setNotice(null);
    setOpen(true);
  }
  const [durationDays, setDurationDays] = useState<number | null>(30);
  const [complimentary, setComplimentary] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isSelf = user.id === currentAdminId;
  const isPro = user.plan === "PRO";

  function createOrg() {
    if (!orgName.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await adminCreateOrganisation(user.id, orgName.trim());
      if (res.ok) setOrgName("");
      else {
        setError(res.error ?? "Could not create organisation.");
        alert(res.error ?? "Could not create organisation.");
      }
    });
  }

  const invitePending = !!user.invitedAt && !user.inviteAcceptedAt;

  function sendInvite() {
    const verb = user.invitedAt ? "Resend the invitation to" : "Email";
    if (
      !confirm(
        `${verb} ${user.name} (${user.email}) with a link to set their password and finish their card? Any earlier link stops working.`,
      )
    )
      return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await adminSendInvite(user.id);
      if (res.ok) setNotice(`Invitation sent to ${user.email}.`);
      else setError(res.error ?? "Could not send the invitation.");
    });
  }

  function sendReset() {
    if (
      !confirm(
        `Email ${user.name} (${user.email}) a link to choose a new password? The link lasts 60 minutes. Their current password keeps working until they change it.`,
      )
    )
      return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await adminSendPasswordReset(user.id);
      if (res.ok) setNotice(`Password reset email sent to ${user.email}.`);
      else setError(res.error ?? "Could not send the reset email.");
    });
  }

  const orgChanged = selOrg !== (user.orgId ?? "") || (selOrg !== "" && selRole !== (user.orgRole ?? "MEMBER"));

  function saveOrg() {
    if (!orgChanged) return;
    if (!selOrg && !confirm(`Remove ${user.name} from ${user.orgName}? Their organisation branding stays, but shared team links are removed.`)) return;
    if (selOrg && user.orgId && selOrg !== user.orgId) {
      const target = orgs.find((o) => o.id === selOrg)?.name ?? "the new organisation";
      if (!confirm(`Move ${user.name} from ${user.orgName} to ${target}? Their card will take on ${target}'s branding and links.`)) return;
    }
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await adminSetUserOrganisation(user.id, selOrg || null, selRole);
      if (res.ok) setNotice("Organisation updated.");
      else setError(res.error ?? "Could not update the organisation.");
    });
  }

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
              {invitePending && (
                <span
                  className="ml-1.5 inline-block rounded-full bg-amber-100 px-2 py-0.5 align-middle text-[10px] font-semibold text-amber-800"
                  title={`Invited ${shortDate(user.invitedAt!)} — hasn't set a password yet`}
                >
                  Invited
                </span>
              )}
            </p>
            <p className="text-xs text-muted truncate">
              {user.username ? `@${user.username}` : "no profile"}
              {user.orgName && (
                <>
                  {" · "}
                  <span className="text-ink/70">{user.orgName}</span>
                </>
              )}
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
              className="fixed z-50 w-64 overflow-y-auto rounded-xl border border-black/5 bg-surface shadow-lg p-1 text-left"
              style={{
                top: menuPos?.top,
                bottom: menuPos?.bottom,
                right: menuPos?.right ?? 16,
                maxHeight: menuPos?.maxHeight,
              }}
            >
              <button
                type="button"
                onClick={sendInvite}
                disabled={isPending}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink hover:bg-surface-low transition-colors disabled:opacity-50"
              >
                <Icon name="forward_to_inbox" className="text-[18px] text-primary" />
                {user.invitedAt ? "Resend invitation" : "Send invitation"}
              </button>
              <p className="px-3 pb-1.5 -mt-1 text-[11px] text-faint">
                {user.inviteAcceptedAt
                  ? `Invited ${shortDate(user.invitedAt!)} · account set up ${shortDate(user.inviteAcceptedAt)}`
                  : user.invitedAt
                    ? `Last invited ${shortDate(user.invitedAt)} · not set up yet`
                    : "Emails a 7-day link to set a password, then add their photo, bio and links."}
              </p>
              <button
                type="button"
                onClick={sendReset}
                disabled={isPending}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink hover:bg-surface-low transition-colors disabled:opacity-50"
              >
                <Icon name="lock_reset" className="text-[18px] text-primary" />
                Send password reset
              </button>
              <p className="px-3 pb-1.5 -mt-1 text-[11px] text-faint">
                Emails a 60-minute link to choose a new password.
              </p>
              <div className="my-1 h-px bg-black/5" />
              <Link
                href={`/admin/users/${user.id}/card`}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink hover:bg-surface-low transition-colors"
              >
                <Icon name="design_services" className="text-[18px] text-primary" />
                Design their card
              </Link>
              <Link
                href={`/admin/cards?newOrder=${encodeURIComponent(user.id)}`}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink hover:bg-surface-low transition-colors"
              >
                <Icon name="print" className="text-[18px] text-primary" />
                Create a print order
              </Link>
              <div className="my-1 h-px bg-black/5" />
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
                  <Icon name="corporate_fare" className="text-[18px] text-primary" />
                  Organisation
                </span>
                <select
                  aria-label="Organisation"
                  value={selOrg}
                  onChange={(e) => setSelOrg(e.target.value)}
                  disabled={isPending}
                  className="mt-1.5 w-full rounded-lg border border-outline bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
                >
                  <option value="">No organisation</option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
                {selOrg && (
                  <select
                    aria-label="Role in organisation"
                    value={selRole}
                    onChange={(e) => setSelRole(e.target.value as typeof selRole)}
                    disabled={isPending}
                    className="mt-1.5 w-full rounded-lg border border-outline bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
                  >
                    {(["MEMBER", "ADMIN", "OWNER"] as const).map((r) => (
                      <option key={r} value={r}>{ORG_ROLE_LABEL[r]}</option>
                    ))}
                  </select>
                )}
                {orgChanged && (
                  <button
                    type="button"
                    onClick={saveOrg}
                    disabled={isPending}
                    className={buttonClass("outline", "sm", "mt-1.5 w-full")}
                  >
                    {selOrg ? "Save organisation" : "Remove from organisation"}
                  </button>
                )}
                {!user.orgName && (
                  <>
                    <span className="mt-2.5 block text-[11px] font-medium text-muted">
                      Or create a new one with this user as owner:
                    </span>
                    <div className="mt-1 flex gap-2">
                      <input
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="New organisation name"
                        aria-label="New organisation name"
                        disabled={isPending}
                        className="min-w-0 flex-1 rounded-lg border border-outline bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={createOrg}
                        disabled={isPending || !orgName.trim()}
                        className={buttonClass("outline", "sm")}
                      >
                        Create
                      </button>
                    </div>
                  </>
                )}
              </div>
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
              {notice && (
                <p role="status" className="px-3 py-1.5 text-xs text-green-700">{notice}</p>
              )}
              {error && (
                <p role="alert" className="px-3 py-1.5 text-xs text-red-600">{error}</p>
              )}
            </div>
          </>
        )}
      </td>
    </tr>
  );
}
