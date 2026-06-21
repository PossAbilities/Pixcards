"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import {
  Badge,
  Card,
  SectionHeading,
  buttonClass,
  inputClass,
  Label,
} from "@/components/ui";
import {
  generateBlankCards,
  setCardEncoded,
  adminDeleteCard,
} from "@/lib/actions/admin";

export type AdminCardRow = {
  id: string;
  code: string;
  tapUrl: string;
  encoded: boolean;
  active: boolean;
  tapCount: number;
  orderId: string | null;
  owner: { name: string; username: string | null } | null;
  createdAt: string;
};

function CopyCode({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title="Copy tap URL"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } catch {
          /* ignore */
        }
      }}
      className="text-faint transition hover:text-primary"
    >
      <Icon name={copied ? "check" : "content_copy"} className="text-[16px]" />
    </button>
  );
}

function Row({ card }: { card: AdminCardRow }) {
  const [encoded, setEncoded] = useState(card.encoded);
  const [isPending, startTransition] = useTransition();

  return (
    <tr className="border-t border-black/5">
      <td className="py-3 pr-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold tracking-wider text-ink">
            {card.code}
          </span>
          <CopyCode value={card.tapUrl} />
        </div>
      </td>
      <td className="py-3 pr-3 text-sm">
        {card.owner ? (
          card.owner.username ? (
            <Link
              href={`/u/${card.owner.username}`}
              className="font-medium text-primary hover:underline"
            >
              {card.owner.name}
            </Link>
          ) : (
            <span className="text-ink">{card.owner.name}</span>
          )
        ) : (
          <Badge color="neutral">Unclaimed</Badge>
        )}
      </td>
      <td className="py-3 pr-3 text-sm">
        {card.orderId ? (
          <Link
            href={`/admin/orders/${card.orderId}`}
            className="font-mono text-xs text-muted hover:text-primary"
          >
            #{card.orderId.slice(-8).toUpperCase()}
          </Link>
        ) : (
          <span className="text-faint">—</span>
        )}
      </td>
      <td className="py-3 pr-3 text-sm tabular-nums text-muted">
        {card.tapCount}
      </td>
      <td className="py-3 pr-3">
        {encoded ? (
          <Badge color="success">Encoded</Badge>
        ) : (
          <Badge color="warning">Pending</Badge>
        )}
      </td>
      <td className="py-3 text-right">
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              const next = !encoded;
              setEncoded(next);
              startTransition(async () => {
                const res = await setCardEncoded(card.id, next);
                if (!res.ok) setEncoded(!next);
              });
            }}
            className={buttonClass("outline", "sm")}
          >
            {encoded ? "Unmark" : "Mark encoded"}
          </button>
          <button
            type="button"
            title="Delete card"
            disabled={isPending}
            onClick={() => {
              if (!confirm(`Delete card ${card.code}?`)) return;
              startTransition(async () => {
                await adminDeleteCard(card.id);
              });
            }}
            className="grid h-8 w-8 place-items-center rounded-lg text-red-500 hover:bg-red-50"
          >
            <Icon name="delete" className="text-[18px]" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export function AdminCardsTable({ cards }: { cards: AdminCardRow[] }) {
  const [qty, setQty] = useState(10);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => {
    const total = cards.length;
    const claimed = cards.filter((c) => c.owner).length;
    const encoded = cards.filter((c) => c.encoded).length;
    return { total, claimed, encoded };
  }, [cards]);

  function generate() {
    setError(null);
    startTransition(async () => {
      const res = await generateBlankCards(qty);
      if (!res.ok) setError(res.error ?? "Could not generate cards.");
    });
  }

  return (
    <div className="space-y-6">
      {/* Generate blank stock */}
      <Card className="p-6">
        <SectionHeading icon="auto_awesome" title="Generate blank stock cards" />
        <p className="-mt-1 mb-3 text-sm text-muted">
          Blank cards are <strong>unclaimed</strong> — encode them with the tap
          URL, then whoever taps one first activates it to their own account.
          Use this for cards sold without a known customer. (For a specific
          order, generate cards from the order page instead.)
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="sm:w-40">
            <Label htmlFor="qty">How many</Label>
            <input
              id="qty"
              type="number"
              min={1}
              max={200}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              className={inputClass}
            />
          </div>
          <button
            type="button"
            onClick={generate}
            disabled={isPending}
            className={buttonClass("primary", "md")}
          >
            <Icon name="add_card" className="text-[18px]" />
            Generate codes
          </button>
        </div>
        {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total", value: stats.total },
          { label: "Claimed", value: stats.claimed },
          { label: "Encoded", value: stats.encoded },
        ].map((s) => (
          <Card key={s.label} className="p-4 text-center">
            <p className="font-display text-2xl font-bold text-ink tabular-nums">
              {s.value}
            </p>
            <p className="text-xs font-semibold uppercase tracking-wide text-faint">
              {s.label}
            </p>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card className="p-0">
        {cards.length === 0 ? (
          <div className="p-10 text-center">
            <Icon name="contactless" className="text-[40px] text-faint" />
            <p className="mt-3 font-semibold text-ink">No cards yet</p>
            <p className="mt-1 text-sm text-muted">
              Generate a batch above to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-faint">
                  <th className="px-6 py-3">Code</th>
                  <th className="py-3 pr-3">Owner</th>
                  <th className="py-3 pr-3">Order</th>
                  <th className="py-3 pr-3">Taps</th>
                  <th className="py-3 pr-3">Status</th>
                  <th className="py-3 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="[&_td:first-child]:px-6 [&_td:last-child]:px-6">
                {cards.map((c) => (
                  <Row key={c.id} card={c} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
