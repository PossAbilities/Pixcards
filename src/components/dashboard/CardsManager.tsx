"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  claimCard,
  renameCard,
  setCardActive,
} from "@/lib/actions/cards";

export type MyCard = {
  id: string;
  code: string;
  label: string;
  active: boolean;
  tapCount: number;
  tapUrl: string;
  createdAt: string;
};

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
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
      className={buttonClass("outline", "sm")}
    >
      <Icon name={copied ? "check" : "content_copy"} className="text-[16px]" />
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}

function CardRow({ card }: { card: MyCard }) {
  const [label, setLabel] = useState(card.label);
  const [active, setActive] = useState(card.active);
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  function saveLabel() {
    startTransition(async () => {
      await renameCard(card.id, label);
      setEditing(false);
    });
  }

  function toggleActive() {
    const nextActive = !active;
    setActive(nextActive);
    startTransition(async () => {
      const res = await setCardActive(card.id, nextActive);
      if (!res.ok) setActive(!nextActive);
    });
  }

  return (
    <div className="rounded-2xl border border-outline bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Work card"
                maxLength={40}
                className={inputClass}
              />
              <button
                type="button"
                onClick={saveLabel}
                disabled={isPending}
                className={buttonClass("primary", "sm")}
              >
                Save
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="group inline-flex items-center gap-1.5 text-left"
            >
              <span className="font-semibold text-ink">
                {label || "Untitled card"}
              </span>
              <Icon
                name="edit"
                className="text-[15px] text-faint opacity-0 transition group-hover:opacity-100"
              />
            </button>
          )}
          <p className="mt-1 font-mono text-xs tracking-widest text-faint">
            {card.code}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {active ? (
            <Badge color="success">Active</Badge>
          ) : (
            <Badge color="neutral">Disabled</Badge>
          )}
          <span className="inline-flex items-center gap-1 text-xs text-muted">
            <Icon name="touch_app" className="text-[15px]" />
            {card.tapCount}
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-black/5 pt-3">
        <CopyButton value={card.tapUrl} />
        <button
          type="button"
          onClick={toggleActive}
          disabled={isPending}
          className={buttonClass(active ? "outline" : "secondary", "sm")}
        >
          <Icon
            name={active ? "toggle_on" : "toggle_off"}
            className="text-[16px]"
          />
          {active ? "Disable" : "Enable"}
        </button>
      </div>
    </div>
  );
}

export function CardsManager({ cards }: { cards: MyCard[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const justActivated = params.get("activated") === "1";

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function activate() {
    setError(null);
    startTransition(async () => {
      const res = await claimCard(code);
      if (res.ok) {
        setCode("");
        router.refresh();
      } else {
        setError(res.error ?? "Could not activate this card.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {justActivated && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <Icon name="check_circle" fill className="mt-0.5 text-[18px]" />
          <span>
            Card activated! Tapping it now opens your digital profile.
          </span>
        </div>
      )}

      {/* Activate a card */}
      <Card className="p-6">
        <SectionHeading icon="add_card" title="Activate a card" />
        <p className="-mt-1 mb-3 text-sm text-muted">
          Got a new Pixcard? Enter the code printed on it (or tap it on your
          phone) to link it to your profile.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="card-code">Card code</Label>
            <input
              id="card-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. K7QP4M2T"
              className={`${inputClass} font-mono tracking-widest`}
            />
          </div>
          <button
            type="button"
            onClick={activate}
            disabled={isPending || !code.trim()}
            className={buttonClass("primary", "md")}
          >
            <Icon name="bolt" fill className="text-[18px]" />
            Activate
          </button>
        </div>
        {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
      </Card>

      {/* Card list */}
      {cards.length === 0 ? (
        <Card className="p-10 text-center">
          <Icon name="contactless" className="text-[40px] text-faint" />
          <p className="mt-3 font-semibold text-ink">No cards yet</p>
          <p className="mt-1 text-sm text-muted">
            Order an NFC card or activate one you already have to see it here.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {cards.map((c) => (
            <CardRow key={c.id} card={c} />
          ))}
        </div>
      )}
    </div>
  );
}
