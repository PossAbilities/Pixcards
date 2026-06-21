"use client";

import { useActionState, useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { inputClass, buttonClass } from "@/components/ui";
import { UpgradeButton } from "./UpgradeButton";
import { upgradeToPro } from "@/lib/actions/checkout";
import { previewDiscount } from "@/lib/actions/discounts";
import { PRO_PRICE_CENTS, money } from "@/lib/constants";
import { cn } from "@/lib/utils";

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
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<{ amountOffCents: number; finalCents: number } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [checking, startCheck] = useTransition();

  function applyCode() {
    if (!code.trim()) {
      setMsg({ ok: false, text: "Enter a code first." });
      return;
    }
    startCheck(async () => {
      const res = await previewDiscount(code.trim(), "PRO", PRO_PRICE_CENTS);
      if (res.ok && res.amountOffCents !== undefined && res.finalCents !== undefined) {
        setApplied({ amountOffCents: res.amountOffCents, finalCents: res.finalCents });
        setMsg({
          ok: true,
          text:
            res.finalCents <= 0
              ? "Code applied — your upgrade is free!"
              : `Code applied — you save ${money(res.amountOffCents)}.`,
        });
      } else {
        setApplied(null);
        setMsg({ ok: false, text: res.reason ?? "That code isn't valid." });
      }
    });
  }

  return (
    <form action={formAction} className="mt-7 space-y-3">
      <div>
        <label
          htmlFor="discountCode"
          className="mb-1 block text-xs font-semibold text-muted"
        >
          Discount code (optional)
        </label>
        <div className="flex gap-2">
          <input
            id="discountCode"
            name="discountCode"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setMsg(null);
              setApplied(null);
            }}
            className={`${inputClass} uppercase tracking-wide`}
            placeholder="e.g. SAVE20"
          />
          <button
            type="button"
            onClick={applyCode}
            disabled={checking || !code.trim()}
            className={buttonClass("outline", "md", "shrink-0")}
          >
            {checking ? "…" : "Apply"}
          </button>
        </div>
        {msg && (
          <p
            className={cn(
              "mt-1.5 flex items-center gap-1 text-xs font-medium",
              msg.ok ? "text-emerald-600" : "text-red-600",
            )}
          >
            <Icon
              name={msg.ok ? "check_circle" : "error"}
              className="text-[14px]"
            />
            {msg.text}
          </p>
        )}
      </div>

      {applied && (
        <div className="flex items-baseline justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm">
          <span className="font-medium text-emerald-700">You pay</span>
          <span className="font-display font-bold text-emerald-700">
            {money(applied.finalCents)}{" "}
            <span className="font-normal text-emerald-600/70 line-through">
              {money(PRO_PRICE_CENTS)}
            </span>
          </span>
        </div>
      )}

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
