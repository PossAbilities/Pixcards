"use client";

import { useActionState } from "react";
import { Icon } from "@/components/Icon";
import { inputClass } from "@/components/ui";
import { UpgradeButton } from "./UpgradeButton";
import { upgradeToPro } from "@/lib/actions/checkout";

type State = { error: string } | null;

async function upgradeAction(_prev: State, formData: FormData): Promise<State> {
  // upgradeToPro redirects on success; only an error object returns here.
  const result = await upgradeToPro(formData);
  return result ?? null;
}

export function UpgradePanel() {
  const [state, formAction] = useActionState<State, FormData>(
    upgradeAction,
    null,
  );

  return (
    <form action={formAction} className="mt-7 space-y-3">
      <div>
        <label
          htmlFor="discountCode"
          className="mb-1 block text-xs font-semibold text-muted"
        >
          Discount code (optional)
        </label>
        <input
          id="discountCode"
          name="discountCode"
          autoCapitalize="characters"
          className={`${inputClass} uppercase tracking-wide`}
          placeholder="e.g. SAVE20"
        />
      </div>

      {state?.error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <Icon name="error" className="mt-0.5 text-[18px] shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <UpgradeButton />
      <p className="text-center text-xs text-faint">
        Secure checkout · One-time payment
      </p>
    </form>
  );
}
