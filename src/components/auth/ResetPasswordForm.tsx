"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { buttonClass, inputClass, Label } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { resetPassword, type ResetState } from "@/lib/actions/password";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={buttonClass("primary", "lg", "w-full mt-1")}
    >
      {pending ? (
        <>
          <Icon name="progress_activity" className="text-[20px] animate-spin" />
          Saving…
        </>
      ) : (
        <>
          Set new password
          <Icon name="arrow_forward" className="text-[20px]" />
        </>
      )}
    </button>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState<ResetState, FormData>(
    resetPassword,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      {state?.error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <Icon name="error" fill className="mt-0.5 shrink-0 text-[18px]" />
          <span>{state.error}</span>
        </div>
      )}

      <div>
        <Label htmlFor="password">New password</Label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          placeholder="At least 8 characters"
          className={inputClass}
        />
      </div>

      <div>
        <Label htmlFor="confirm">Confirm new password</Label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          placeholder="Re-enter your password"
          className={inputClass}
        />
      </div>

      <SubmitButton />
    </form>
  );
}
