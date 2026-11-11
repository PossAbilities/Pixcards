"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { Card, Label, buttonClass, inputClass } from "@/components/ui";
import { adminCreateUser } from "@/lib/actions/admin";
import type { AdminOrgOption } from "@/components/admin/UserRow";

const EMPTY = { name: "", email: "", jobTitle: "", phone: "", orgId: "", orgRole: "MEMBER" as const };

/**
 * Admin form to set up an account for someone, so their card can be started
 * (and ordered) before they've logged in themselves.
 */
export function AddUserPanel({
  orgs,
  onClose,
}: {
  orgs: AdminOrgOption[];
  onClose: () => void;
}) {
  const [form, setForm] = useState<{
    name: string;
    email: string;
    jobTitle: string;
    phone: string;
    orgId: string;
    orgRole: "OWNER" | "ADMIN" | "MEMBER";
  }>(EMPTY);
  const [sendInvite, setSendInvite] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(null);
    startTransition(async () => {
      const res = await adminCreateUser({ ...form, sendInvite });
      if (!res.ok) {
        setError(res.error ?? "Could not create the account.");
        return;
      }
      const who = form.name.trim();
      if (sendInvite && res.invited) {
        setDone(`${who} has been added and their invitation is on its way.`);
      } else if (sendInvite) {
        setDone(
          `${who} has been added, but the invitation email failed (${res.inviteError ?? "unknown error"}). Try "Send invitation" from their menu.`,
        );
      } else {
        setDone(
          `${who} has been added. Set up their card, then use "Send invitation" from their menu when you're ready.`,
        );
      }
      setForm(EMPTY);
      setSendInvite(false);
    });
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-ink">Add a user</h2>
          <p className="mt-0.5 text-sm text-muted">
            Set up an account for someone so you can start their card. They
            won&apos;t get an email until you send an invitation.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-high hover:text-ink"
        >
          <Icon name="close" className="text-[18px]" />
        </button>
      </div>

      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="au-name">Full name</Label>
          <input
            id="au-name"
            required
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className={inputClass}
            autoComplete="off"
          />
        </div>
        <div>
          <Label htmlFor="au-email">Email</Label>
          <input
            id="au-email"
            type="email"
            required
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            className={inputClass}
            autoComplete="off"
          />
        </div>
        <div>
          <Label htmlFor="au-job">Job title (optional)</Label>
          <input
            id="au-job"
            value={form.jobTitle}
            onChange={(e) => set("jobTitle", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <Label htmlFor="au-phone">Phone (optional)</Label>
          <input
            id="au-phone"
            type="tel"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <Label htmlFor="au-org">Organisation</Label>
          <select
            id="au-org"
            value={form.orgId}
            onChange={(e) => set("orgId", e.target.value)}
            className={inputClass}
          >
            <option value="">No organisation</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        {form.orgId && (
          <div>
            <Label htmlFor="au-role">Role in organisation</Label>
            <select
              id="au-role"
              value={form.orgRole}
              onChange={(e) => set("orgRole", e.target.value as typeof form.orgRole)}
              className={inputClass}
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
              <option value="OWNER">Owner</option>
            </select>
          </div>
        )}

        <label className="flex items-start gap-2.5 text-sm text-ink sm:col-span-2">
          <input
            type="checkbox"
            checked={sendInvite}
            onChange={(e) => setSendInvite(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-primary"
          />
          <span>
            Send the invitation email now
            <span className="block text-xs text-muted">
              Leave unticked to set up their card first and invite them later.
            </span>
          </span>
        </label>

        {error && (
          <p role="alert" className="text-sm text-red-600 sm:col-span-2">
            {error}
          </p>
        )}
        {done && (
          <p role="status" className="text-sm text-green-700 sm:col-span-2">
            {done}
          </p>
        )}

        <div className="flex gap-2 sm:col-span-2">
          <button type="submit" disabled={isPending} className={buttonClass("primary", "md")}>
            {isPending ? (
              <>
                <Icon name="progress_activity" className="text-[18px] animate-spin" />
                Adding…
              </>
            ) : (
              <>
                <Icon name="person_add" className="text-[18px]" />
                Add user
              </>
            )}
          </button>
          <button type="button" onClick={onClose} className={buttonClass("outline", "md")}>
            Done
          </button>
        </div>
      </form>
    </Card>
  );
}
