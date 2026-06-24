"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { Badge, buttonClass } from "@/components/ui";
import {
  generateCardsForOrder,
  setCardEncoded,
  adminDeleteCard,
} from "@/lib/actions/admin";

export type FulfilCard = {
  id: string;
  code: string;
  tapUrl: string;
  encoded: boolean;
};

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-stretch gap-2">
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-lg border border-outline bg-surface-low px-3 py-2 font-mono text-sm text-ink">
        {value}
      </code>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          } catch {
            /* ignore */
          }
        }}
        className={buttonClass("primary", "sm")}
      >
        <Icon name={copied ? "check" : "content_copy"} className="text-[16px]" />
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function CardItem({ card }: { card: FulfilCard }) {
  const [encoded, setEncoded] = useState(card.encoded);
  const [isPending, startTransition] = useTransition();

  function toggleEncoded() {
    const next = !encoded;
    setEncoded(next);
    startTransition(async () => {
      try {
        const res = await setCardEncoded(card.id, next);
        if (!res.ok) setEncoded(!next);
      } catch {
        setEncoded(!next);
      }
    });
  }

  function remove() {
    if (!confirm("Delete this card code? This cannot be undone.")) return;
    startTransition(async () => {
      try {
        await adminDeleteCard(card.id);
      } catch {
        /* ignore — revalidation will reconcile */
      }
    });
  }

  return (
    <div className="rounded-2xl border border-outline bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-base font-bold tracking-widest text-ink">
          {card.code}
        </span>
        {encoded ? (
          <Badge color="success">Encoded</Badge>
        ) : (
          <Badge color="warning">Needs encoding</Badge>
        )}
      </div>

      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-faint">
        Write this URL onto the chip
      </p>
      <CopyField value={card.tapUrl} />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={toggleEncoded}
          disabled={isPending}
          className={buttonClass(encoded ? "outline" : "secondary", "sm")}
        >
          <Icon
            name={encoded ? "check_circle" : "radio_button_unchecked"}
            className="text-[16px]"
          />
          {encoded ? "Encoded & shipped" : "Mark as encoded"}
        </button>
        <a
          href={card.tapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass("outline", "sm")}
        >
          <Icon name="open_in_new" className="text-[16px]" />
          Test tap
        </a>
        <button
          type="button"
          onClick={remove}
          disabled={isPending}
          className={buttonClass("ghost", "sm", "text-red-600 hover:bg-red-50")}
        >
          <Icon name="delete" className="text-[16px]" />
        </button>
      </div>
    </div>
  );
}

export function OrderNfcPanel({
  orderId,
  quantity,
  cards,
}: {
  orderId: string;
  quantity: number;
  cards: FulfilCard[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function generate() {
    setError(null);
    startTransition(async () => {
      const res = await generateCardsForOrder(orderId, quantity);
      if (!res.ok) setError(res.error ?? "Could not generate cards.");
    });
  }

  const allEncoded = cards.length > 0 && cards.every((c) => c.encoded);

  return (
    <div className="space-y-4">
      {/* Step-by-step prompt */}
      <div className="rounded-2xl border border-primary/20 bg-primary-soft/30 p-4">
        <p className="flex items-center gap-1.5 font-display text-sm font-bold text-primary-deep">
          <Icon name="contactless" fill className="text-[18px]" />
          How to activate this customer&apos;s NFC card
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink">
          <li>
            Generate the card code{quantity > 1 ? "s" : ""} below (one per
            physical card in this order).
          </li>
          <li>
            On your phone, open an NFC writer app (e.g. <strong>NFC Tools</strong>
            ) → <strong>Write</strong> → <strong>Add a record</strong> →{" "}
            <strong>URL</strong>.
          </li>
          <li>
            Paste the card&apos;s URL, hold the blank card to your phone and{" "}
            <strong>write</strong> it. Optionally <strong>lock</strong> the tag.
          </li>
          <li>
            Tap <em>Test tap</em> to confirm it opens the customer&apos;s
            profile, then <strong>Mark as encoded</strong> and print + ship.
          </li>
        </ol>
        <p className="mt-2 text-xs text-muted">
          These cards are pre-linked to the customer, so a tap opens their
          profile straight away — no activation step for them.
        </p>
      </div>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      {cards.length === 0 ? (
        <button
          type="button"
          onClick={generate}
          disabled={isPending}
          className={buttonClass("primary", "md")}
        >
          {isPending ? (
            <>
              <Icon
                name="progress_activity"
                className="text-[18px] animate-spin"
              />
              Generating…
            </>
          ) : (
            <>
              <Icon name="auto_awesome" className="text-[18px]" />
              Generate {quantity} card code{quantity > 1 ? "s" : ""}
            </>
          )}
        </button>
      ) : (
        <>
          {allEncoded && (
            <p className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
              <Icon name="check_circle" className="text-[16px]" />
              All cards encoded — ready to ship.
            </p>
          )}
          <div className="space-y-3">
            {cards.map((c) => (
              <CardItem key={c.id} card={c} />
            ))}
          </div>
          <button
            type="button"
            onClick={generate}
            disabled={isPending}
            className={buttonClass("outline", "sm")}
          >
            <Icon name="add" className="text-[16px]" />
            Add another card
          </button>
        </>
      )}
    </div>
  );
}
