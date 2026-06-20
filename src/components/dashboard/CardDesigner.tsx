"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Icon } from "@/components/Icon";
import {
  buttonClass,
  inputClass,
  Label,
  Badge,
  Card,
  SectionHeading,
  ProBadge,
} from "@/components/ui";
import { CardMockup } from "@/components/CardMockup";
import { CARD_MATERIALS, material, money } from "@/lib/constants";
import { createCardOrder } from "@/lib/actions/checkout";
import { cn } from "@/lib/utils";

type Props = {
  plan: "FREE" | "PRO";
  defaultName: string;
  defaultTitle: string;
};

type ActionState = { error: string } | null;

async function orderAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = await createCardOrder(formData);
  // On success the action redirects; only an error object comes back here.
  return result ?? null;
}

function SubmitButton({ total }: { total: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={buttonClass("primary", "lg", "w-full")}
    >
      {pending ? (
        <>
          <Icon name="progress_activity" className="animate-spin text-[20px]" />
          Processing…
        </>
      ) : (
        <>
          <Icon name="lock" className="text-[18px]" />
          Pay &amp; Place Order — {total}
        </>
      )}
    </button>
  );
}

export function CardDesigner({ plan, defaultName, defaultTitle }: Props) {
  const [materialId, setMaterialId] = useState<string>("matte-black");
  const [cardName, setCardName] = useState<string>(defaultName);
  const [quantity, setQuantity] = useState<number>(1);
  const [shipName, setShipName] = useState<string>(defaultName);
  const [shipAddress, setShipAddress] = useState<string>("");
  const [shipCity, setShipCity] = useState<string>("");
  const [shipPostal, setShipPostal] = useState<string>("");
  const [shipCountry, setShipCountry] = useState<string>("United Kingdom");

  const [state, formAction] = useActionState<ActionState, FormData>(
    orderAction,
    null,
  );

  const selected = material(materialId);
  const unitPrice = selected.priceCents;
  const totalCents = unitPrice * quantity;
  const total = money(totalCents);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(320px,420px)] gap-8 items-start">
      {/* LEFT — options form */}
      <div className="space-y-6">
        {/* Material picker */}
        <Card className="p-6">
          <SectionHeading icon="style" title="Choose your material" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CARD_MATERIALS.map((mat) => {
              const isSelected = mat.id === materialId;
              const locked = mat.pro && plan === "FREE";
              return (
                <button
                  key={mat.id}
                  type="button"
                  disabled={locked}
                  onClick={() => !locked && setMaterialId(mat.id)}
                  className={cn(
                    "group relative text-left rounded-xl border-2 p-4 transition-all",
                    isSelected
                      ? "border-primary bg-primary-soft/40 shadow-sm"
                      : "border-outline hover:border-primary/40 hover:bg-surface-low",
                    locked && "opacity-70 cursor-not-allowed",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-0.5 h-10 w-14 shrink-0 rounded-md border border-black/10 shadow-inner"
                      style={{ background: mat.swatch }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-semibold text-sm text-ink">
                          {mat.name}
                        </span>
                        {mat.pro && <ProBadge />}
                      </div>
                      <p className="text-xs text-muted mt-0.5 leading-snug">
                        {mat.description}
                      </p>
                      <p className="text-sm font-semibold text-primary-deep mt-1.5">
                        {money(mat.priceCents)}
                        <span className="text-faint font-normal"> / card</span>
                      </p>
                    </div>
                    {isSelected && (
                      <Icon
                        name="check_circle"
                        fill
                        className="text-primary text-[20px] shrink-0"
                      />
                    )}
                  </div>
                  {locked && (
                    <p className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-tertiary">
                      <Icon name="lock" className="text-[14px]" />
                      Upgrade to Pro to order metal cards
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Card text */}
        <Card className="p-6">
          <SectionHeading icon="badge" title="Card text" />
          <div>
            <Label htmlFor="cardName">Name on card</Label>
            <input
              id="cardName"
              type="text"
              value={cardName}
              maxLength={60}
              onChange={(e) => setCardName(e.target.value)}
              className={inputClass}
              placeholder="Your name"
            />
            <p className="mt-1.5 text-xs text-faint">
              The title beneath your name comes from your profile job title.
            </p>
          </div>
        </Card>

        {/* Quantity */}
        <Card className="p-6">
          <SectionHeading icon="tag" title="Quantity" />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className={buttonClass("outline", "md", "!px-3")}
              aria-label="Decrease quantity"
            >
              <Icon name="remove" className="text-[18px]" />
            </button>
            <input
              type="number"
              min={1}
              max={50}
              value={quantity}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isNaN(n)) return;
                setQuantity(Math.min(50, Math.max(1, Math.floor(n))));
              }}
              className={cn(inputClass, "w-24 text-center")}
            />
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(50, q + 1))}
              className={buttonClass("outline", "md", "!px-3")}
              aria-label="Increase quantity"
            >
              <Icon name="add" className="text-[18px]" />
            </button>
            <span className="text-sm text-muted">cards (1–50)</span>
          </div>
        </Card>

        {/* Shipping details */}
        <Card className="p-6">
          <SectionHeading icon="local_shipping" title="Shipping details" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label htmlFor="shipName">Recipient name</Label>
              <input
                id="shipName"
                type="text"
                value={shipName}
                onChange={(e) => setShipName(e.target.value)}
                className={inputClass}
                placeholder="Full name"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="shipAddress">Address</Label>
              <input
                id="shipAddress"
                type="text"
                value={shipAddress}
                onChange={(e) => setShipAddress(e.target.value)}
                className={inputClass}
                placeholder="Street address"
              />
            </div>
            <div>
              <Label htmlFor="shipCity">City</Label>
              <input
                id="shipCity"
                type="text"
                value={shipCity}
                onChange={(e) => setShipCity(e.target.value)}
                className={inputClass}
                placeholder="City"
              />
            </div>
            <div>
              <Label htmlFor="shipPostal">Postcode</Label>
              <input
                id="shipPostal"
                type="text"
                value={shipPostal}
                onChange={(e) => setShipPostal(e.target.value)}
                className={inputClass}
                placeholder="Postcode"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="shipCountry">Country</Label>
              <input
                id="shipCountry"
                type="text"
                value={shipCountry}
                onChange={(e) => setShipCountry(e.target.value)}
                className={inputClass}
                placeholder="Country"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* RIGHT — sticky live preview + summary + submit */}
      <div className="lg:sticky lg:top-6 space-y-6">
        <div className="rounded-2xl bg-gradient-to-br from-surface-high to-surface-low p-8 border border-black/5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-4 text-center">
            Live preview
          </p>
          <div className="[perspective:1200px]">
            <div className="transition-transform duration-300 [transform:rotateX(6deg)_rotateY(-9deg)] hover:[transform:rotateX(2deg)_rotateY(-3deg)]">
              <CardMockup
                name={cardName || "Your Name"}
                title={defaultTitle}
                materialId={materialId}
              />
            </div>
          </div>
        </div>

        <Card className="p-6">
          <form action={formAction} className="space-y-5">
            {/* hidden inputs mirror controlled state */}
            <input type="hidden" name="material" value={materialId} />
            <input type="hidden" name="cardName" value={cardName} />
            <input type="hidden" name="quantity" value={quantity} />
            <input type="hidden" name="design" value={JSON.stringify({})} />
            <input type="hidden" name="shipName" value={shipName} />
            <input type="hidden" name="shipAddress" value={shipAddress} />
            <input type="hidden" name="shipCity" value={shipCity} />
            <input type="hidden" name="shipPostal" value={shipPostal} />
            <input type="hidden" name="shipCountry" value={shipCountry} />

            <div>
              <h3 className="font-display text-lg font-semibold mb-4">
                Order summary
              </h3>
              <dl className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Material</dt>
                  <dd className="font-medium text-ink flex items-center gap-2">
                    <span
                      className="h-4 w-6 rounded border border-black/10"
                      style={{ background: selected.swatch }}
                    />
                    {selected.name}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Unit price</dt>
                  <dd className="font-medium text-ink">{money(unitPrice)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Quantity</dt>
                  <dd className="font-medium text-ink">× {quantity}</dd>
                </div>
                <div className="flex items-center justify-between border-t border-outline pt-3 mt-1">
                  <dt className="font-semibold text-ink">Total</dt>
                  <dd className="font-display text-lg font-bold text-primary-deep">
                    {total}
                  </dd>
                </div>
              </dl>
            </div>

            {state?.error && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
                <Icon name="error" className="text-[18px] mt-0.5 shrink-0" />
                <span>{state.error}</span>
              </div>
            )}

            <SubmitButton total={total} />

            <div className="space-y-2.5">
              <p className="flex items-center justify-center gap-1.5 text-xs text-muted">
                <Icon name="shield_lock" className="text-[15px]" />
                Secure checkout. Your NFC card will be pre-linked to your
                account.
              </p>
              <div className="flex justify-center">
                <Badge color="info">Demo mode — no real charge</Badge>
              </div>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
