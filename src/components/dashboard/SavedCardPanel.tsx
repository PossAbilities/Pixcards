"use client";

import { useActionState } from "react";
import { Icon } from "@/components/Icon";
import { Card, SectionHeading, buttonClass, inputClass, Label } from "@/components/ui";
import { orderPresetCard } from "@/lib/actions/checkout";
import { money } from "@/lib/constants";

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

  // Cache-bust the previews so they reflect the latest profile details.
  const v = Date.now();

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
        Prefer to start from scratch? Use the designer below instead.
      </p>
    </Card>
  );
}
