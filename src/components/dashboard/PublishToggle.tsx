"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";
import { togglePublished } from "@/lib/actions/profile";

export function PublishToggle({ initial }: { initial: boolean }) {
  const [published, setPublished] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    const next = !published;
    setPublished(next);
    setError(null);
    startTransition(async () => {
      const res = await togglePublished(next);
      if (!res.ok) {
        setPublished(!next);
        setError(res.error ?? "Could not update");
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-ink">
          {published ? "Profile is live" : "Profile is hidden"}
        </p>
        <p className="text-xs text-muted">
          {published
            ? "Anyone with your link can view your card."
            : "Your public page returns a not-found state."}
        </p>
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={published}
        aria-label="Toggle profile visibility"
        disabled={isPending}
        onClick={toggle}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-60",
          published ? "bg-primary" : "bg-surface-high",
        )}
      >
        <span
          className={cn(
            "inline-flex items-center justify-center h-5 w-5 rounded-full bg-white shadow transform transition-transform",
            published ? "translate-x-6" : "translate-x-1",
          )}
        >
          <Icon
            name={published ? "check" : "close"}
            className={cn(
              "text-[12px]",
              published ? "text-primary" : "text-faint",
            )}
          />
        </span>
      </button>
    </div>
  );
}
