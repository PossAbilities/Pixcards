"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { buttonClass } from "@/components/ui";

/**
 * A friendly nudge, shown on the dashboard when a staff member's profile is
 * missing personal touches (photo, bio, LinkedIn, phone). Dismissible for the
 * browser session, so it reappears next time they sign in until it's complete.
 */
export function ProfilePrompt({
  missing,
  editHref,
}: {
  missing: string[];
  editHref: string;
}) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      setHidden(sessionStorage.getItem("pc-profile-prompt") === "dismissed");
    } catch {
      setHidden(false);
    }
  }, []);

  if (missing.length === 0 || hidden) return null;

  function dismiss() {
    try {
      sessionStorage.setItem("pc-profile-prompt", "dismissed");
    } catch {
      /* ignore */
    }
    setHidden(true);
  }

  return (
    <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-4">
      <div className="flex items-start gap-3">
        <Icon name="person_edit" className="mt-0.5 text-[20px] text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">Make your card yours</p>
          <p className="mt-0.5 text-sm text-muted">
            Add {missing.join(", ")} so people get the full picture when they tap
            your card.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link href={editHref} className={buttonClass("primary", "sm")}>
              <Icon name="edit" className="text-[16px]" />
              Complete your profile
            </Link>
            <button
              type="button"
              onClick={dismiss}
              className="text-xs font-semibold text-muted hover:text-ink"
            >
              Maybe later
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted hover:bg-black/5 hover:text-ink"
        >
          <Icon name="close" className="text-[18px]" />
        </button>
      </div>
    </div>
  );
}
