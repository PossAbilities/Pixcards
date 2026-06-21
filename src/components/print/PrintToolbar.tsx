"use client";

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { buttonClass } from "@/components/ui";

export function PrintToolbar({ backHref }: { backHref: string }) {
  return (
    <div className="pc-toolbar sticky top-0 z-10 border-b border-black/5 bg-surface/90 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"
          >
            <Icon name="arrow_back" className="text-[18px]" />
            Back to order
          </Link>
          <span className="hidden text-xs text-faint sm:inline">
            A5 · fold in half · slot the card inside
          </span>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className={buttonClass("primary", "md")}
        >
          <Icon name="print" className="text-[18px]" />
          Print / Save PDF
        </button>
      </div>
    </div>
  );
}
