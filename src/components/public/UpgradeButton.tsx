"use client";

import { useFormStatus } from "react-dom";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";
import { buttonClass } from "@/components/ui";

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
      className={buttonClass("primary", "lg", cn("w-full", className))}
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
