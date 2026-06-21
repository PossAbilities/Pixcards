"use client";

import { useState, useTransition } from "react";
import { buttonClass, inputClass, Label } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { requestPasswordReset } from "@/lib/actions/password";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const address = email.trim();
    startTransition(async () => {
      await requestPasswordReset(address);
      // Always show the same privacy-preserving result, whether or not the
      // account exists.
      setSentTo(address);
      setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          <Icon name="check_circle" fill className="mt-0.5 shrink-0 text-[18px]" />
          <span>
            If an account exists for{" "}
            <span className="font-semibold">{sentTo || "that address"}</span>,
            we&rsquo;ve sent password reset instructions.
          </span>
        </div>
        <p className="px-1 text-xs leading-relaxed text-muted">
          The link expires in 60 minutes. Check your spam folder if it
          doesn&rsquo;t arrive within a few minutes.
        </p>
        <button
          type="button"
          onClick={() => {
            setSubmitted(false);
            setEmail("");
          }}
          className={buttonClass("outline", "md", "w-full")}
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="email">Email address</Label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className={buttonClass("primary", "lg", "w-full mt-1")}
      >
        {isPending ? (
          <>
            <Icon name="progress_activity" className="text-[20px] animate-spin" />
            Sending…
          </>
        ) : (
          <>
            Send reset link
            <Icon name="arrow_forward" className="text-[20px]" />
          </>
        )}
      </button>
    </form>
  );
}
