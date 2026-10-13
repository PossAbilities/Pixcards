"use client";

import { useActionState } from "react";
import Link from "next/link";
import { unsubscribeWithToken } from "@/lib/actions/marketing";
import { buttonClass } from "@/components/ui";

export function UnsubscribeForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(unsubscribeWithToken, undefined);

  if (state?.done) {
    return (
      <p role="status" className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
        You&apos;ve been unsubscribed. You won&apos;t receive any more marketing
        emails from us.
      </p>
    );
  }

  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="token" value={token} />
      {state?.error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}{" "}
          <Link href="/dashboard/settings" className="font-semibold underline">
            Go to settings
          </Link>
        </p>
      )}
      <button type="submit" disabled={pending} className={buttonClass("primary", "lg", "w-full")}>
        {pending ? "Unsubscribing…" : "Unsubscribe me"}
      </button>
    </form>
  );
}
