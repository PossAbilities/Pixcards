"use client";

import { useFormStatus } from "react-dom";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";

export function UpgradeButton({
  label = "Upgrade to Pro",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-white shadow-sm shadow-primary/30 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/40 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60",
        className,
      )}
    >
      {pending ? (
        <>
          <Icon name="progress_activity" className="animate-spin text-[20px]" />
          Redirecting…
        </>
      ) : (
        <>
          <Icon name="bolt" className="fill text-[20px]" />
          {label}
        </>
      )}
    </button>
  );
}
