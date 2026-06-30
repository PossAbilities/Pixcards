"use client";

import { useActionState, useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { Card, SectionHeading, buttonClass, inputClass, Label } from "@/components/ui";
import { orderPresetCard, saveCardLogo } from "@/lib/actions/checkout";
import { money } from "@/lib/constants";
import { cn } from "@/lib/utils";

type State = { error?: string } | null;

/**
 * Featured "Perspective Studio" card template on the order page — previews the
 * baked front/back (filled from the user's profile) and orders it directly.
 */
export function SavedCardPanel({
  unitPriceCents,
  defaultName,
}: {
  unitPriceCents: number;
  defaultName: string;
}) {
  const [state, action, pending] = useActionState<State, FormData>(
    async (_prev, formData) => (await orderPresetCard(formData)) ?? null,
    null,
  );

  // Cache-bust the previews; bumped when the logo changes so they re-render.
  const [v, setV] = useState(() => Date.now());
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoErr, setLogoErr] = useState<string | null>(null);
  const [, startLogo] = useTransition();

  function onLogo(e: React.ChangeEvent<HTMLInputElement>, variant: "light" | "dark") {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setLogoErr("Keep the logo under 2 MB.");
      return;
    }
    setLogoErr(null);
    setLogoBusy(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      startLogo(async () => {
        const res = await saveCardLogo(dataUrl, variant);
        setLogoBusy(false);
        if (res.ok) setV(Date.now());
        else setLogoErr(res.error ?? "Could not save the logo.");
      });
    };
    reader.onerror = () => { setLogoBusy(false); setLogoErr("Could not read that file."); };
    reader.readAsDataURL(file);
  }

  function removeLogo(variant: "light" | "dark") {
    setLogoBusy(true);
    startLogo(async () => {
      await saveCardLogo(null, variant);
      setLogoBusy(false);
      setV(Date.now());
    });
  }

  return (
    <Card className="mb-8 p-6">
      <SectionHeading icon="bookmark" title="Your saved template — Perspective Studio" />
      <p className="-mt-1 mb-4 text-sm text-muted">
        Your branded card, filled automatically from your profile (name, role,
        contact) with the QR pointing to your digital card. Edit those details
        on your Profile and they flow straight onto the card.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {(["front", "back"] as const).map((side) => (
          <div key={side} className="overflow-hidden rounded-xl border border-outline bg-surface-low">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/card-art/preset/${side}?v=${v}`}
              alt={`${side} of your card`}
              className="block aspect-[1013/638] w-full object-contain"
            />
          </div>
        ))}
      </div>

      {/* Logos: replace the top-left wordmark. White on the dark front, dark on
          the light back. Both optional. */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-outline p-3">
          <p className="text-xs font-semibold text-ink">White logo — front (dark)</p>
          <p className="mt-0.5 text-xs text-faint">Transparent PNG/SVG, light/white artwork.</p>
          <div className="mt-2 flex items-center gap-3">
            <label className={cn(buttonClass("outline", "sm"), logoBusy && "pointer-events-none opacity-60")}>
              <Icon name="upload" className="text-[16px]" /> Upload
              <input type="file" accept="image/png,image/svg+xml,image/webp" onChange={(e) => onLogo(e, "light")} className="hidden" />
            </label>
            <button type="button" onClick={() => removeLogo("light")} disabled={logoBusy} className="text-xs font-semibold text-muted hover:text-primary">
              Remove
            </button>
          </div>
        </div>
        <div className="rounded-xl border border-outline p-3">
          <p className="text-xs font-semibold text-ink">Dark logo — back (light)</p>
          <p className="mt-0.5 text-xs text-faint">Transparent PNG/SVG, dark/navy artwork.</p>
          <div className="mt-2 flex items-center gap-3">
            <label className={cn(buttonClass("outline", "sm"), logoBusy && "pointer-events-none opacity-60")}>
              <Icon name="upload" className="text-[16px]" /> Upload
              <input type="file" accept="image/png,image/svg+xml,image/webp" onChange={(e) => onLogo(e, "dark")} className="hidden" />
            </label>
            <button type="button" onClick={() => removeLogo("dark")} disabled={logoBusy} className="text-xs font-semibold text-muted hover:text-primary">
              Remove
            </button>
          </div>
        </div>
      </div>
      {logoErr && <p className="mt-2 text-sm font-medium text-red-600">{logoErr}</p>}
      {logoBusy && <p className="mt-2 text-xs text-muted">Saving logo…</p>}

      <form action={action} className="mt-5 grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="quantity" value="1" />
        <div className="sm:col-span-2">
          <Label htmlFor="sp-name">Delivery name</Label>
          <input id="sp-name" name="shipName" defaultValue={defaultName} required className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="sp-addr">Address</Label>
          <input id="sp-addr" name="shipAddress" required className={inputClass} />
        </div>
        <div>
          <Label htmlFor="sp-city">City</Label>
          <input id="sp-city" name="shipCity" required className={inputClass} />
        </div>
        <div>
          <Label htmlFor="sp-post">Postcode</Label>
          <input id="sp-post" name="shipPostal" required className={inputClass} />
        </div>
        <input type="hidden" name="shipCountry" value="United Kingdom" />

        <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className={buttonClass("primary", "md")}>
            <Icon name="shopping_cart_checkout" className="text-[18px]" />
            {pending ? "Starting checkout…" : `Order this design · ${money(unitPriceCents)}`}
          </button>
          <span className="text-xs text-muted">White CR80 card · secure checkout</span>
          {state?.error && <span className="text-sm font-medium text-red-600">{state.error}</span>}
        </div>
      </form>

      <p className="mt-4 text-xs text-faint">
        To change the name, role or contact details, edit your{" "}
        <strong>Profile</strong> — they flow onto the card automatically.
      </p>
    </Card>
  );
}
