"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { Card, buttonClass, inputClass } from "@/components/ui";
import { PRESET_OPTIONS } from "@/lib/card-preset-meta";
import { attachPresetToDomain } from "@/lib/actions/admin";

/**
 * Apply a card preset to every account on an email domain in one go
 * (e.g. brand all @possabilities.org.uk staff). Customised designs are
 * skipped automatically.
 */
export function DomainPresetTool() {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState(PRESET_OPTIONS[0]?.id ?? "");
  const [domain, setDomain] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function apply() {
    setMsg(null);
    setErr(null);
    start(async () => {
      const res = await attachPresetToDomain(preset, domain);
      if (res.ok) {
        setMsg(
          `Applied to ${res.updated} account${res.updated === 1 ? "" : "s"}` +
            (res.skipped ? ` — ${res.skipped} skipped (customised or no profile).` : "."),
        );
      } else {
        setErr(res.error ?? "Could not apply the preset.");
      }
    });
  }

  return (
    <Card className="p-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 text-left"
      >
        <Icon name="groups" className="text-[20px] text-primary" />
        <span className="flex-1 text-sm font-semibold text-ink">
          Apply a card preset to a whole email domain
        </span>
        <Icon name={open ? "expand_less" : "expand_more"} className="text-[20px] text-muted" />
      </button>

      {open && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1">
            <span className="mb-1 block text-xs font-semibold text-muted">Preset</span>
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
              className={inputClass}
            >
              {PRESET_OPTIONS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex-1">
            <span className="mb-1 block text-xs font-semibold text-muted">Email domain</span>
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="possabilities.org.uk"
              className={inputClass}
            />
          </label>
          <button
            type="button"
            onClick={apply}
            disabled={pending || !domain.trim()}
            className={buttonClass("primary", "md")}
          >
            {pending ? "Applying…" : "Apply"}
          </button>
        </div>
      )}

      {msg && (
        <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
          <Icon name="check_circle" className="text-[16px]" />
          {msg}
        </p>
      )}
      {err && <p className="mt-3 text-sm font-medium text-red-600">{err}</p>}
      {open && (
        <p className="mt-3 text-xs text-muted">
          Sets the brand theme and reseeds the starting card for every account on
          that domain. Accounts that have customised their own design are left
          untouched.
        </p>
      )}
    </Card>
  );
}
