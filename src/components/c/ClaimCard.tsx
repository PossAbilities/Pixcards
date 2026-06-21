"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { buttonClass } from "@/components/ui";
import { claimCard } from "@/lib/actions/cards";

export function ClaimCard({ code }: { code: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  function activate() {
    setError(null);
    startTransition(async () => {
      const res = await claimCard(code);
      if (res.ok) {
        setDone(true);
        router.push("/dashboard/cards?activated=1");
      } else {
        setError(res.error ?? "Could not activate this card.");
      }
    });
  }

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={activate}
        disabled={isPending || done}
        className={buttonClass("primary", "md", "w-full")}
      >
        {isPending || done ? (
          <>
            <Icon
              name="progress_activity"
              className="text-[18px] animate-spin"
            />
            Activating…
          </>
        ) : (
          <>
            <Icon name="bolt" fill className="text-[18px]" />
            Activate to my account
          </>
        )}
      </button>
      {error && (
        <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
      )}
    </div>
  );
}
