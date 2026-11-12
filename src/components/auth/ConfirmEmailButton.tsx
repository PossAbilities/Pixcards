"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { buttonClass } from "@/components/ui";
import { confirmEmail } from "@/lib/actions/verify";

export function ConfirmEmailButton({ token }: { token: string }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(
    token ? null : "This link is missing its code. Request a new one from the order page.",
  );
  const [isPending, startTransition] = useTransition();

  if (done) {
    return (
      <div role="status" className="space-y-4">
        <p className="flex items-start gap-2 text-sm text-green-700">
          <Icon name="check_circle" className="text-[20px] shrink-0" />
          Thanks — your email is confirmed.
        </p>
        <Link href="/dashboard/order" className={buttonClass("primary", "md", "w-full")}>
          Design and order my card
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={isPending || !token}
        onClick={() =>
          startTransition(async () => {
            const res = await confirmEmail(token);
            if (res.ok) setDone(true);
            else setError(res.error ?? "Something went wrong.");
          })
        }
        className={buttonClass("primary", "md", "w-full")}
      >
        {isPending ? "Confirming…" : "Confirm my email"}
      </button>
    </div>
  );
}
