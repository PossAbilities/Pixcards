"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { buttonClass } from "@/components/ui";
import { sendMyVerificationEmail } from "@/lib/actions/verify";

/** Shown to people on a free-card domain (e.g. PossAbilities staff). */
export function FreeCardBanner({ verified, email }: { verified: boolean; email: string }) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (verified) {
    return (
      <div className="mb-6 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <Icon name="redeem" className="text-[20px] mt-0.5 shrink-0" />
        <span>
          <strong>Your staff card is free.</strong> Design it below and place your order. There&apos;s nothing to pay.
        </span>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <div className="flex items-start gap-2">
        <Icon name="redeem" className="text-[20px] mt-0.5 shrink-0" />
        <div className="flex-1">
          <p>
            <strong>Staff get their card free.</strong> First, confirm that{" "}
            <span className="font-medium">{email}</span> is your email address.
          </p>
          {sent ? (
            <p role="status" className="mt-2 font-medium">
              Check your inbox for a &ldquo;Confirm your email&rdquo; message, then come back to this page.
            </p>
          ) : (
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  const res = await sendMyVerificationEmail();
                  if (res.ok) setSent(true);
                  else setError(res.error ?? "Something went wrong.");
                })
              }
              className={buttonClass("outline", "sm", "mt-2")}
            >
              {isPending ? "Sending…" : "Email me a confirmation link"}
            </button>
          )}
          {error && (
            <p role="alert" className="mt-2 text-red-700">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
