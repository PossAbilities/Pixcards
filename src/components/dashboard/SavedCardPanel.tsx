"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import QRCode from "qrcode";
import { Icon } from "@/components/Icon";
import { Card, SectionHeading, buttonClass, inputClass, Label } from "@/components/ui";
import { orderMyCard, applyMyCardBrandTheme } from "@/lib/actions/mycard";
import { money } from "@/lib/constants";
import type { CardTemplateSpec, MergeData } from "@/lib/card-template";
import { PersonalCardDesigner } from "./PersonalCardDesigner";

type State = { error?: string } | null;

/**
 * Your saved card template on the order page — live preview (front/back),
 * a full drag/resize/edit designer (same tools as building a card from
 * scratch), and the order form.
 */
export function SavedCardPanel({
  unitPriceCents,
  defaultName,
  spec,
  merge,
}: {
  unitPriceCents: number;
  defaultName: string;
  spec: CardTemplateSpec;
  merge: MergeData;
}) {
  const [state, action, pending] = useActionState<State, FormData>(
    async (_prev, formData) => (await orderMyCard(formData)) ?? null,
    null,
  );

  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(() => Date.now());
  const [qrPreview, setQrPreview] = useState("");
  const [themeMsg, setThemeMsg] = useState<string | null>(null);
  const [themeErr, setThemeErr] = useState<string | null>(null);
  const [themePending, startTheme] = useTransition();

  useEffect(() => {
    QRCode.toDataURL(merge.url, { margin: 1, width: 256 })
      .then(setQrPreview)
      .catch(() => {});
  }, [merge.url]);

  function applyBrandTheme() {
    setThemeMsg(null);
    setThemeErr(null);
    startTheme(async () => {
      const res = await applyMyCardBrandTheme();
      if (res.ok) setThemeMsg("Done — your digital profile now matches this card.");
      else setThemeErr(res.error ?? "Could not update your profile.");
    });
  }

  return (
    <Card className="mb-8 p-6">
      <SectionHeading icon="bookmark" title="Your card" />
      <p className="-mt-1 mb-4 text-sm text-muted">
        Design the front and back exactly how you want — drag, resize, swap
        in your logo — then order it. Name/role/contact fields stay linked to
        your Profile.
      </p>

      {/* Digital profile doesn't auto-update when you edit the card design —
          this pushes the matching brand look (colours + layout) to it. */}
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-outline bg-surface-low p-4">
        <Icon name="auto_awesome" className="text-[22px] text-primary" />
        <p className="flex-1 text-sm text-muted">
          Your shared profile page has its own look and doesn&apos;t update
          automatically when you edit the card above.
        </p>
        <button type="button" onClick={applyBrandTheme} disabled={themePending} className={buttonClass("outline", "sm")}>
          {themePending ? "Applying…" : "Match my profile to this card"}
        </button>
      </div>
      {themeMsg && (
        <p className="-mt-3 mb-5 flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
          <Icon name="check_circle" className="text-[16px]" />
          {themeMsg}{" "}
          <a href={merge.url} target="_blank" rel="noopener noreferrer" className="underline">
            View my profile ↗
          </a>
        </p>
      )}
      {themeErr && <p className="-mt-3 mb-5 text-sm font-medium text-red-600">{themeErr}</p>}

      {editing ? (
        <PersonalCardDesigner
          initialSpec={spec}
          previewMerge={merge}
          qrPreview={qrPreview}
          onClose={() => setEditing(false)}
          onSaved={() => setV(Date.now())}
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["front", "back"] as const).map((side) => (
              <div key={side} className="overflow-hidden rounded-xl border border-outline bg-surface-low">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/card-art/my/${side}?v=${v}`}
                  alt={`${side} of your card`}
                  className="block aspect-[1013/638] w-full object-contain"
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setEditing(true)}
            className={buttonClass("outline", "md", "mt-4")}
          >
            <Icon name="design_services" className="text-[18px]" />
            Edit design
          </button>

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
        </>
      )}
    </Card>
  );
}
