"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { buttonClass } from "@/components/ui";
import { acceptOrgInvite } from "@/lib/actions/org";

export function AcceptInvite({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function accept() {
    setError(null);
    startTransition(async () => {
      const res = await acceptOrgInvite(token);
      if (res.ok) router.push("/dashboard/org");
      else setError(res.error ?? "Could not accept the invite.");
    });
  }

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={accept}
        disabled={isPending}
        className={buttonClass("primary", "md", "w-full")}
      >
        {isPending ? (
          <>
            <Icon name="progress_activity" className="text-[18px] animate-spin" />
            Joining…
          </>
        ) : (
          <>
            <Icon name="group_add" className="text-[18px]" />
            Join the team
          </>
        )}
      </button>
      {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}
