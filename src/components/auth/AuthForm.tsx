"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { loginAction, registerAction, type AuthState } from "@/app/(auth)/actions";
import { buttonClass, inputClass, Label } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { domainDesignsForEmail } from "@/lib/card-preset-meta";

/** Short name + descriptor for each selectable design in the picker. */
const DESIGN_META: Record<string, { name: string; blurb: string }> = {
  "pa-colourbar": { name: "Colour Bar", blurb: "Clean & formal" },
  "pa-wave": { name: "Purple Wave", blurb: "Warm & friendly" },
  "pa-bigpink": { name: "Big Pink", blurb: "Bold & playful" },
};

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

export function AuthForm({
  mode,
  next,
}: {
  mode: "login" | "register";
  next?: string;
}) {
  const action = mode === "login" ? loginAction : registerAction;
  const [state, formAction] = useActionState<AuthState, FormData>(
    action,
    undefined,
  );
  const altHref = (target: string) =>
    next ? `${target}?next=${encodeURIComponent(next)}` : target;

  // When a registrant's email is on a domain with its own branded designs
  // (e.g. @possabilities.org.uk), let them pick one as their starting card.
  const [email, setEmail] = useState("");
  const [design, setDesign] = useState("");
  const domainDesigns = mode === "register" ? domainDesignsForEmail(email) : null;
  const designOptions = domainDesigns?.options ?? [];
  useEffect(() => {
    if (designOptions.length === 0) {
      if (design) setDesign("");
    } else if (!designOptions.includes(design)) {
      setDesign(domainDesigns?.default ?? designOptions[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designOptions.join(",")]);

  return (
    <form action={formAction} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
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
          onChange={(e) => setEmail(e.target.value)}
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

      {designOptions.length > 0 && (
        <div className="rounded-2xl border border-outline bg-surface-low/50 p-3">
          <input type="hidden" name="design" value={design} />
          <div className="mb-2 flex items-center gap-1.5">
            <Icon name="palette" className="text-[18px] text-primary" />
            <span className="text-sm font-semibold text-ink">
              Choose your card design
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {designOptions.map((id) => {
              const meta = DESIGN_META[id] ?? { name: id, blurb: "" };
              const selected = design === id;
              return (
                <button
                  type="button"
                  key={id}
                  onClick={() => setDesign(id)}
                  aria-pressed={selected}
                  className={
                    "group overflow-hidden rounded-xl border-2 bg-surface text-left transition-colors " +
                    (selected
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-outline hover:border-primary/50")
                  }
                >
                  <img
                    src={`/api/preset-preview/${id}`}
                    alt={`${meta.name} card`}
                    loading="lazy"
                    className="aspect-[1013/638] w-full object-cover"
                  />
                  <div className="px-2 py-1.5">
                    <p className="truncate text-xs font-bold text-ink">{meta.name}</p>
                    <p className="truncate text-[11px] text-muted">{meta.blurb}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-muted">
            You can fine-tune or change it anytime after signing up.
          </p>
        </div>
      )}

      <SubmitButton mode={mode} />

      <p className="text-center text-sm text-muted pt-1">
        {mode === "login" ? (
          <>
            New to Pixcards?{" "}
            <Link
              href={altHref("/register")}
              className="font-semibold text-primary hover:text-primary-deep"
            >
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link
              href={altHref("/login")}
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
