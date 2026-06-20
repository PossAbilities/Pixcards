"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { loginAction, registerAction, type AuthState } from "@/app/(auth)/actions";
import { buttonClass, inputClass, Label } from "@/components/ui";
import { Icon } from "@/components/Icon";

function SubmitButton({ mode }: { mode: "login" | "register" }) {
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
          {mode === "login" ? "Signing in…" : "Creating account…"}
        </>
      ) : (
        <>
          {mode === "login" ? "Log in" : "Create account"}
          <Icon name="arrow_forward" className="text-[20px]" />
        </>
      )}
    </button>
  );
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const action = mode === "login" ? loginAction : registerAction;
  const [state, formAction] = useActionState<AuthState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <Icon name="error" fill className="text-[18px] mt-0.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      {mode === "register" && (
        <div>
          <Label htmlFor="name">Full name</Label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            placeholder="Alex Morgan"
            className={inputClass}
          />
        </div>
      )}

      <div>
        <Label htmlFor="email">Email address</Label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@company.com"
          className={inputClass}
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          {mode === "login" && (
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-primary hover:text-primary-deep mb-1.5"
            >
              Forgot password?
            </Link>
          )}
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          placeholder={mode === "login" ? "Enter your password" : "At least 8 characters"}
          className={inputClass}
        />
      </div>

      <SubmitButton mode={mode} />

      <p className="text-center text-sm text-muted pt-1">
        {mode === "login" ? (
          <>
            New to Pixcards?{" "}
            <Link
              href="/register"
              className="font-semibold text-primary hover:text-primary-deep"
            >
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-primary hover:text-primary-deep"
            >
              Log in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
