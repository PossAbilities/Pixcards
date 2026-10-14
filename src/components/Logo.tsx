import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/",
  mark = true,
  onDark = false,
}: {
  className?: string;
  href?: string;
  mark?: boolean;
  /** White wordmark for dark backgrounds (e.g. the admin sidebar). */
  onDark?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2 group", className)}
    >
      {mark && (
        <span className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-deep text-white shadow-sm shadow-primary/30 transition-transform group-hover:scale-105">
          <span aria-hidden="true" className="material-symbols-outlined text-[22px] fill">
            contactless
          </span>
        </span>
      )}
      <span
        className={cn(
          "font-display text-2xl font-extrabold tracking-tight",
          onDark ? "text-white" : "text-primary-deep",
        )}
      >
        Pixcards
      </span>
    </Link>
  );
}
