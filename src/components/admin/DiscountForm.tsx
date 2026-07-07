"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { buttonClass, inputClass, Label, Card, Badge } from "@/components/ui";
import { createDiscount } from "@/lib/actions/discounts";
import { money } from "@/lib/constants";

type DiscountType = "PERCENT" | "FIXED";
type DiscountScope = "ALL" | "PRO" | "CARD";

const SCOPE_LABEL: Record<DiscountScope, string> = {
  ALL: "Everything",
  PRO: "Pro upgrade",
  CARD: "Card orders",
};

export function DiscountForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<DiscountType>("PERCENT");
  // For PERCENT this is the percentage; for FIXED this is pounds (converted ×100).
  const [value, setValue] = useState("");
  const [scope, setScope] = useState<DiscountScope>("ALL");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [perUserLimit, setPerUserLimit] = useState("1");
  const [expiresAt, setExpiresAt] = useState("");

  function reset() {
    setCode("");
    setDescription("");
    setType("PERCENT");
    setValue("");
    setScope("ALL");
    setMaxRedemptions("");
    setPerUserLimit("1");
    setExpiresAt("");
  }

  function previewValueLabel(): string {
    const num = Number(value);
    if (!value || Number.isNaN(num) || num <= 0) return "discount";
    if (type === "PERCENT") return `${num}% off`;
    return `${money(Math.round(num * 100))} off`;
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const num = Number(value);
    if (!value || Number.isNaN(num) || num <= 0) {
      setError("Enter a discount value above 0.");
      return;
    }
    if (type === "PERCENT" && (num < 1 || num > 100)) {
      setError("Percentage must be between 1 and 100.");
      return;
    }

    const fd = new FormData();
    fd.set("code", code.trim());
    fd.set("description", description.trim());
    fd.set("type", type);
    // PERCENT → percent value; FIXED → convert pounds to pence.
    fd.set(
      "value",
      type === "FIXED" ? String(Math.round(num * 100)) : String(Math.round(num)),
    );
    fd.set("scope", scope);
    if (maxRedemptions.trim()) fd.set("maxRedemptions", maxRedemptions.trim());
    if (perUserLimit.trim()) fd.set("perUserLimit", perUserLimit.trim());
    if (expiresAt) fd.set("expiresAt", expiresAt);

    startTransition(async () => {
      const res = await createDiscount(fd);
      if (res.ok) {
        reset();
        router.refresh();
      } else {
        setError(res.error ?? "Failed to create discount code.");
      }
    });
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-5">
        <Icon name="sell" className="text-primary text-[22px]" />
        <h2 className="font-display text-lg font-semibold">New discount code</h2>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="discount-code">Code</Label>
            <input
              id="discount-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="SAVE20"
              required
              className={`${inputClass} font-mono uppercase tracking-wide`}
            />
          </div>
          <div>
            <Label htmlFor="discount-scope">Applies to</Label>
            <select
              id="discount-scope"
              value={scope}
              onChange={(e) => setScope(e.target.value as DiscountScope)}
              className={inputClass}
            >
              <option value="ALL">Everything</option>
              <option value="PRO">Pro upgrade</option>
              <option value="CARD">Card orders</option>
            </select>
          </div>
        </div>

        <div>
          <Label htmlFor="discount-description">Description (optional)</Label>
          <input
            id="discount-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Summer launch promo"
            className={inputClass}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="discount-type">Type</Label>
            <select
              id="discount-type"
              value={type}
              onChange={(e) => setType(e.target.value as DiscountType)}
              className={inputClass}
            >
              <option value="PERCENT">Percentage</option>
              <option value="FIXED">Fixed amount</option>
            </select>
          </div>
          <div>
            <Label htmlFor="discount-value">
              {type === "PERCENT" ? "% off" : "Amount off (£)"}
            </Label>
            <input
              id="discount-value"
              type="number"
              inputMode="decimal"
              min={type === "PERCENT" ? 1 : 0.01}
              max={type === "PERCENT" ? 100 : undefined}
              step={type === "PERCENT" ? 1 : 0.01}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={type === "PERCENT" ? "20" : "5.00"}
              required
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="discount-max">Max redemptions total (optional)</Label>
            <input
              id="discount-max"
              type="number"
              min={1}
              step={1}
              value={maxRedemptions}
              onChange={(e) => setMaxRedemptions(e.target.value)}
              placeholder="Unlimited"
              className={inputClass}
            />
          </div>
          <div>
            <Label htmlFor="discount-per-user">Uses per customer</Label>
            <input
              id="discount-per-user"
              type="number"
              min={1}
              step={1}
              value={perUserLimit}
              onChange={(e) => setPerUserLimit(e.target.value)}
              placeholder="1"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-muted">How many times each customer can use this code.</p>
          </div>
          <div>
            <Label htmlFor="discount-expires">Expires (optional)</Label>
            <input
              id="discount-expires"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-low/60 px-3 py-2.5">
          <span className="text-xs font-semibold text-faint uppercase tracking-wide">
            Preview
          </span>
          <Badge color="primary">
            <span className="font-mono">{code.trim() || "CODE"}</span>
          </Badge>
          <span className="text-sm text-muted">
            {previewValueLabel()} · {SCOPE_LABEL[scope]}
          </span>
        </div>

        {error && (
          <p className="text-sm font-medium text-red-600" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className={buttonClass("primary", "md", "w-full")}
        >
          {isPending ? (
            <>
              <Icon
                name="progress_activity"
                className="text-[16px] animate-spin"
              />
              Creating…
            </>
          ) : (
            <>
              <Icon name="add" className="text-[16px]" />
              Create code
            </>
          )}
        </button>
      </form>
    </Card>
  );
}
