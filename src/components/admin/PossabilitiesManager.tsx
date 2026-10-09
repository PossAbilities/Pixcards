"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Badge, Card, buttonClass } from "@/components/ui";
import { PRESET_OPTIONS } from "@/lib/card-preset-meta";
import { setUserCardPreset, attachPresetToDomain } from "@/lib/actions/admin";
import { colorFromString, formatDate, initials } from "@/lib/utils";

export type DomainAccount = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  cardPreset: string | null;
  hasProfile: boolean;
  ordersCount: number;
  createdAt: string;
};

/** Human label for a preset id (falls back to the raw id). */
function presetLabel(id: string | null): string {
  if (!id) return "None";
  if (id === "custom") return "Custom (edited)";
  return PRESET_OPTIONS.find((p) => p.id === id)?.label ?? id;
}

/** Short chip label for the account's current design. */
function shortLabel(id: string | null): string {
  switch (id) {
    case "pa-colourbar":
      return "A · Colour Bar";
    case "pa-wave":
      return "B · Purple Wave";
    case "pa-bigpink":
      return "C · Big Pink";
    case "custom":
      return "Custom";
    case null:
      return "None";
    default:
      return presetLabel(id);
  }
}

export function PossabilitiesManager({
  domain,
  accounts,
  designDefault,
  designOptions,
}: {
  domain: string;
  accounts: DomainAccount[];
  designDefault: string;
  designOptions: string[];
}) {
  const router = useRouter();
  const [bulkPreset, setBulkPreset] = useState(designDefault);
  const [bulkMsg, setBulkMsg] = useState<string | null>(null);
  const [bulkErr, setBulkErr] = useState<string | null>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Count accounts per design, for the summary row.
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of accounts) m[a.cardPreset ?? "none"] = (m[a.cardPreset ?? "none"] ?? 0) + 1;
    return m;
  }, [accounts]);

  function applyToAll() {
    if (
      !confirm(
        `Apply “${presetLabel(bulkPreset)}” to all ${accounts.length} @${domain} accounts?\n\n` +
          "Accounts that have customised their own design are skipped.",
      )
    )
      return;
    setBulkMsg(null);
    setBulkErr(null);
    start(async () => {
      const res = await attachPresetToDomain(bulkPreset, domain);
      if (res.ok) {
        setBulkMsg(
          `Applied to ${res.updated} account${res.updated === 1 ? "" : "s"}` +
            (res.skipped ? ` — ${res.skipped} skipped (customised or no profile).` : "."),
        );
        router.refresh();
      } else {
        setBulkErr(res.error ?? "Could not apply the design.");
      }
    });
  }

  function setRow(userId: string, preset: string) {
    setRowBusy(userId);
    setBulkMsg(null);
    setBulkErr(null);
    start(async () => {
      const res = await setUserCardPreset(userId, preset || null);
      setRowBusy(null);
      if (res.ok) router.refresh();
      else alert(res.error ?? "Could not change the design.");
    });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <header className="mb-5">
        <div className="flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-tertiary-bright">
          <Icon name="domain" className="text-[18px]" />
          DOMAIN CONSOLE
        </div>
        <h1 className="mt-1 font-display text-2xl font-bold text-ink">
          PossAbilities accounts
        </h1>
        <p className="mt-1 text-sm text-muted">
          Everyone signed up with an <strong className="text-ink">@{domain}</strong>{" "}
          email ({accounts.length} account{accounts.length === 1 ? "" : "s"}). Set each
          person&apos;s card design, or roll one design out across the whole domain.
        </p>
      </header>

      {/* Bulk apply */}
      <Card className="mb-5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1">
            <span className="mb-1 block text-xs font-semibold text-muted">
              Apply a design to the whole domain
            </span>
            <select
              value={bulkPreset}
              onChange={(e) => setBulkPreset(e.target.value)}
              className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
            >
              {(designOptions.length ? designOptions : PRESET_OPTIONS.map((p) => p.id)).map(
                (id) => (
                  <option key={id} value={id}>
                    {presetLabel(id)}
                  </option>
                ),
              )}
            </select>
          </label>
          <button
            type="button"
            onClick={applyToAll}
            disabled={pending}
            className={buttonClass("primary", "md")}
          >
            <Icon name="groups" className="text-[18px]" />
            Apply to all {accounts.length}
          </button>
        </div>
        {bulkMsg && (
          <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
            <Icon name="check_circle" className="text-[16px]" />
            {bulkMsg}
          </p>
        )}
        {bulkErr && <p className="mt-3 text-sm font-medium text-red-600">{bulkErr}</p>}
        <p className="mt-3 text-xs text-muted">
          Sets the brand theme and reseeds the starting card for every account on the
          domain. Accounts that have customised their own design are left untouched.
        </p>
      </Card>

      {/* Per-account table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-low/60 text-[11px] font-semibold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Current design</th>
                <th className="px-4 py-3 text-center">Orders</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Set design</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted">
                    No @{domain} accounts yet.
                  </td>
                </tr>
              )}
              {accounts.map((a) => (
                <tr
                  key={a.id}
                  className="border-t border-black/5 transition-colors hover:bg-surface-low/50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                        style={{ background: colorFromString(a.name || a.email) }}
                      >
                        {initials(a.name || a.email)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{a.name}</p>
                        <p className="truncate text-xs text-muted">{a.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {a.cardPreset === "custom" ? (
                      <Badge color="neutral">Custom</Badge>
                    ) : a.cardPreset ? (
                      <Badge color="primary">{shortLabel(a.cardPreset)}</Badge>
                    ) : (
                      <span className="text-xs text-faint">
                        {a.hasProfile ? "None" : "No profile"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-sm tabular-nums text-ink">
                    {a.ordersCount}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-muted">
                    {formatDate(a.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={a.cardPreset === "custom" ? "custom" : a.cardPreset ?? ""}
                        disabled={!a.hasProfile || (pending && rowBusy === a.id)}
                        onChange={(e) => setRow(a.id, e.target.value)}
                        className="rounded-lg border border-outline bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
                      >
                        <option value="">None</option>
                        {a.cardPreset === "custom" && (
                          <option value="custom">Custom (their own edit)</option>
                        )}
                        {(designOptions.length
                          ? designOptions
                          : PRESET_OPTIONS.map((p) => p.id)
                        ).map((id) => (
                          <option key={id} value={id}>
                            {presetLabel(id)}
                          </option>
                        ))}
                      </select>
                      {pending && rowBusy === a.id && (
                        <Icon name="progress_activity" className="animate-spin text-[18px] text-muted" />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Design spread summary */}
      {accounts.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted">
          {Object.entries(counts).map(([id, n]) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-full bg-surface-low px-2.5 py-1 font-medium"
            >
              {shortLabel(id === "none" ? null : id)}: <strong className="text-ink">{n}</strong>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
