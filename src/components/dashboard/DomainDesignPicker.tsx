"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, SectionHeading, buttonClass } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { chooseDomainDesign } from "@/lib/actions/mycard";
import { DESIGN_META } from "@/lib/card-preset-meta";
import { cn } from "@/lib/utils";

/**
 * Lets people on a domain with its own branded designs (e.g. PossAbilities)
 * pick their card + matching profile from the dashboard, not only at sign-up.
 */
export function DomainDesignPicker({
  options,
  current,
  orgLabel,
}: {
  options: string[];
  current: string | null;
  orgLabel: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(
    current && options.includes(current) ? current : options[0],
  );
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const isCurrent = selected === current;

  function apply() {
    setMsg(null);
    start(async () => {
      const res = await chooseDomainDesign(selected);
      if (res.ok) {
        setMsg({ ok: true, text: `${DESIGN_META[selected]?.name ?? "Design"} applied to your card and profile.` });
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error ?? "That didn't save. Please try again." });
      }
    });
  }

  return (
    <Card className="mb-8 p-6">
      <SectionHeading icon="palette" title={`${orgLabel} card designs`} />
      <p className="-mt-2 mb-4 text-sm text-muted">
        Your organisation has its own branded designs. Choosing one updates both
        your printed card and your digital profile.
      </p>
      <div role="radiogroup" aria-label={`${orgLabel} card designs`} className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
        {options.map((id) => {
          const meta = DESIGN_META[id] ?? { name: id, blurb: "" };
          const active = selected === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setSelected(id)}
              className={cn(
                "overflow-hidden rounded-xl border-2 bg-surface text-left transition-colors",
                active ? "border-primary ring-2 ring-primary/30" : "border-outline hover:border-primary/50",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/preset-preview/${id}`}
                alt={`${meta.name} card`}
                loading="lazy"
                className="aspect-[1013/638] w-full object-cover"
              />
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-ink">{meta.name}</span>
                  <span className="block truncate text-xs text-muted">{meta.blurb}</span>
                </span>
                {id === current && (
                  <span className="shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary-deep">
                    Current
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={apply} disabled={pending || isCurrent} className={buttonClass("primary", "md")}>
          <Icon name={isCurrent ? "check" : "auto_awesome"} className="text-[18px]" />
          {pending ? "Applying…" : isCurrent ? "In use" : "Use this design"}
        </button>
        {current === "custom" && !isCurrent && (
          <span className="text-xs text-muted">This replaces the card design you customised.</span>
        )}
        {msg && (
          <span role={msg.ok ? "status" : "alert"} className={cn("text-sm font-medium", msg.ok ? "text-emerald-700" : "text-red-700")}>
            {msg.text}
          </span>
        )}
      </div>
    </Card>
  );
}
