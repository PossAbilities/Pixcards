"use client";

import { useState } from "react";
import { buttonClass, inputClass, Label } from "@/components/ui";
import { Icon } from "@/components/Icon";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sentTo, setSentTo] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // No email provider is configured yet, so we simply show the standard
    // privacy-preserving success state without revealing whether the account
    // exists.
    setSentTo(email.trim());
    setSubmitted(true);
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
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
          <Icon name="info" className="mr-1 align-[-3px] text-[15px]" />
          Demo note: this is a placeholder flow. Email delivery requires
          configuring an email provider, so no message is actually sent.
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

      <button type="submit" className={buttonClass("primary", "lg", "w-full mt-1")}>
        Send reset link
        <Icon name="arrow_forward" className="text-[20px]" />
      </button>
    </form>
  );
}
