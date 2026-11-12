"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Card, Label, buttonClass, inputClass } from "@/components/ui";
import { adminCreateCardOrder } from "@/lib/actions/admin-cards";

export type OrderableUser = { id: string; name: string; email: string };
export type MaterialOption = { id: string; name: string };

/** Admin: put a card order straight into the print queue for someone. */
export function AdminNewOrderPanel({
  users,
  materials,
  initialUserId,
  onClose,
}: {
  users: OrderableUser[];
  materials: MaterialOption[];
  initialUserId?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState("");
  const [userId, setUserId] = useState(
    initialUserId && users.some((u) => u.id === initialUserId) ? initialUserId : "",
  );
  const [materialId, setMaterialId] = useState(materials[0]?.id ?? "white-gloss");
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState("0");
  const [handDelivered, setHandDelivered] = useState(true);
  const [ship, setShip] = useState({ shipName: "", shipAddress: "", shipCity: "", shipPostal: "" });
  const [emailReceipt, setEmailReceipt] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = q
      ? users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      : users;
    // Keep the selected person in the list even if the filter hides them.
    const sel = users.find((u) => u.id === userId);
    return sel && !list.includes(sel) ? [sel, ...list] : list;
  }, [users, filter, userId]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await adminCreateCardOrder({
        userId,
        material: materialId,
        quantity,
        pricePounds: Number(price) || 0,
        handDelivered,
        ...ship,
        emailReceipt,
      });
      if (res.ok && res.orderId) router.push(`/admin/orders/${res.orderId}`);
      else setError(res.error ?? "Could not create the order.");
    });
  }

  return (
    <Card className="mb-6 p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-ink">New card order</h2>
          <p className="mt-0.5 text-sm text-muted">
            Prints their saved card design. Goes straight into the print queue with no payment
            taken.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-high hover:text-ink"
        >
          <Icon name="close" className="text-[18px]" />
        </button>
      </div>

      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="no-user">Who is the card for?</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              aria-label="Filter people"
              placeholder="Type to filter…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className={`${inputClass} sm:max-w-[14rem]`}
            />
            <select
              id="no-user"
              required
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className={inputClass}
            >
              <option value="">Choose a person…</option>
              {shown.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} — {u.email}
                </option>
              ))}
            </select>
          </div>
          {userId && (
            <Link
              href={`/admin/users/${userId}/card`}
              className="mt-1.5 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              <Icon name="design_services" className="text-[16px]" />
              View or edit their card design first
            </Link>
          )}
        </div>

        <div>
          <Label htmlFor="no-mat">Card</Label>
          <select
            id="no-mat"
            value={materialId}
            onChange={(e) => setMaterialId(e.target.value)}
            className={inputClass}
          >
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="no-qty">Quantity</Label>
            <input
              id="no-qty"
              type="number"
              min={1}
              max={500}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(500, Math.floor(Number(e.target.value) || 1))))}
              className={inputClass}
            />
          </div>
          <div>
            <Label htmlFor="no-price">Price (£)</Label>
            <input
              id="no-price"
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <p className="-mt-2 text-xs text-muted sm:col-span-2">
          Price is for your records only (0 = free). Nobody is charged.
        </p>

        <label className="flex items-center gap-2.5 text-sm text-ink sm:col-span-2">
          <input
            type="checkbox"
            checked={handDelivered}
            onChange={(e) => setHandDelivered(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Hand delivered / collected (no posting address needed)
        </label>

        {!handDelivered && (
          <>
            <div className="sm:col-span-2">
              <Label htmlFor="no-sname">Delivery name</Label>
              <input
                id="no-sname"
                value={ship.shipName}
                onChange={(e) => setShip({ ...ship, shipName: e.target.value })}
                placeholder="Defaults to their name"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="no-addr">Address</Label>
              <input
                id="no-addr"
                required
                value={ship.shipAddress}
                onChange={(e) => setShip({ ...ship, shipAddress: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <Label htmlFor="no-city">City</Label>
              <input
                id="no-city"
                required
                value={ship.shipCity}
                onChange={(e) => setShip({ ...ship, shipCity: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <Label htmlFor="no-post">Postcode</Label>
              <input
                id="no-post"
                required
                value={ship.shipPostal}
                onChange={(e) => setShip({ ...ship, shipPostal: e.target.value })}
                className={inputClass}
              />
            </div>
          </>
        )}

        <label className="flex items-center gap-2.5 text-sm text-ink sm:col-span-2">
          <input
            type="checkbox"
            checked={emailReceipt}
            onChange={(e) => setEmailReceipt(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Email them an order confirmation
        </label>

        {error && (
          <p role="alert" className="text-sm text-red-600 sm:col-span-2">
            {error}
          </p>
        )}

        <div className="flex gap-2 sm:col-span-2">
          <button type="submit" disabled={isPending || !userId} className={buttonClass("primary", "md")}>
            <Icon name={isPending ? "progress_activity" : "print"} className={`text-[18px] ${isPending ? "animate-spin" : ""}`} />
            {isPending ? "Preparing artwork…" : "Create order"}
          </button>
          <button type="button" onClick={onClose} className={buttonClass("outline", "md")}>
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}
