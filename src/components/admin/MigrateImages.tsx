"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { buttonClass } from "@/components/ui";
import { migrateImagesToStorage } from "@/lib/actions/storage";

export function MigrateImages({ pending }: { pending: number }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run() {
    setMsg(null);
    setError(null);
    startTransition(async () => {
      const res = await migrateImagesToStorage();
      if (res.ok) {
        setMsg(
          `Done — moved ${res.profiles ?? 0} profile image set(s) and ${res.orders ?? 0} order(s) to storage.`,
        );
      } else {
        setError(res.error ?? "Migration failed.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-outline p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">
            Migrate existing images to storage
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {pending > 0
              ? `${pending} record(s) still hold inline data-URI images. Move them to the CDN for smaller, faster pages.`
              : "No inline images found — everything is already on storage."}
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={isPending || pending === 0}
          className={buttonClass("primary", "md")}
        >
          {isPending ? (
            <>
              <Icon name="progress_activity" className="text-[18px] animate-spin" />
              Migrating…
            </>
          ) : (
            <>
              <Icon name="cloud_sync" className="text-[18px]" />
              Migrate now
            </>
          )}
        </button>
      </div>
      {msg && (
        <p className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
          <Icon name="check_circle" className="text-[16px]" />
          {msg}
        </p>
      )}
      {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}
