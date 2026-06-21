"use client";

import { useState } from "react";
import { Icon } from "./Icon";
import { BrandTile } from "./BrandIcon";
import { theme as getTheme } from "@/lib/constants";
import { buildVCard, initials, cn } from "@/lib/utils";

export type CardLink = {
  id: string;
  platform: string;
  label: string;
  url: string;
  icon: string;
};

export type CardData = {
  name: string;
  jobTitle?: string;
  company?: string;
  bio?: string;
  location?: string;
  phone?: string;
  email?: string;
  avatarUrl?: string | null;
  headerUrl?: string | null;
  themeId: string;
  links: CardLink[];
};

export function DigitalCard({
  data,
  interactive = false,
  profileId,
  shareUrl,
  className,
}: {
  data: CardData;
  interactive?: boolean;
  profileId?: string;
  shareUrl?: string;
  className?: string;
}) {
  const t = getTheme(data.themeId);
  const [copied, setCopied] = useState(false);
  const dark = t.surface !== "#ffffff";

  function track(type: string, linkId?: string) {
    if (!interactive || !profileId) return;
    try {
      navigator.sendBeacon(
        "/api/track",
        JSON.stringify({ profileId, type, linkId }),
      );
    } catch {
      /* ignore */
    }
  }

  function saveContact() {
    track("SAVE_CONTACT");
    const vcard = buildVCard({
      name: data.name,
      jobTitle: data.jobTitle,
      company: data.company,
      phone: data.phone,
      email: data.email,
      url: shareUrl,
    });
    const blob = new Blob([vcard], { type: "text/vcard" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `${data.name.replace(/\s+/g, "-")}.vcf`;
    a.click();
    URL.revokeObjectURL(href);
  }

  async function share() {
    const url = shareUrl || (typeof window !== "undefined" ? window.location.href : "");
    if (navigator.share) {
      try {
        await navigator.share({ title: data.name, text: `${data.name} — digital card`, url });
        return;
      } catch {
        /* fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className={cn("flex flex-col min-h-full", className)}
      style={{ background: t.surface, color: t.ink }}
    >
      {/* Header */}
      <div className="relative h-36 shrink-0">
        <div
          className="absolute inset-0"
          style={{
            background: data.headerUrl
              ? `center/cover no-repeat url("${data.headerUrl}")`
              : t.header,
          }}
        />
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
          <div
            className="w-24 h-24 rounded-full border-4 overflow-hidden shadow-lg grid place-items-center text-2xl font-bold font-display"
            style={{
              borderColor: t.surface,
              background: t.accent,
              color: "#fff",
            }}
          >
            {data.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.avatarUrl}
                alt={data.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{initials(data.name || "P")}</span>
            )}
          </div>
        </div>
      </div>

      {/* Identity */}
      <div className="mt-14 px-5 text-center flex flex-col items-center gap-1.5">
        <h1 className="font-display text-2xl font-bold leading-tight">
          {data.name || "Your Name"}
        </h1>
        {(data.jobTitle || data.company) && (
          <span
            className="inline-block text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full"
            style={{ background: `${t.accent}1a`, color: t.accent }}
          >
            {[data.jobTitle, data.company].filter(Boolean).join(" · ")}
          </span>
        )}
        {data.bio && (
          <p
            className="text-sm leading-relaxed mt-2 max-w-xs"
            style={{ color: dark ? "#cbd5e1" : "#464555" }}
          >
            {data.bio}
          </p>
        )}
        {data.location && (
          <span
            className="inline-flex items-center gap-1 text-xs mt-1"
            style={{ color: dark ? "#94a3b8" : "#777587" }}
          >
            <Icon name="location_on" className="text-[16px]" />
            {data.location}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-5 mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={interactive ? saveContact : undefined}
          className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl text-white font-semibold text-sm shadow-md transition active:scale-95"
          style={{ background: t.accent }}
        >
          <Icon name="person_add" className="text-[20px]" />
          Save Contact
        </button>
        <button
          type="button"
          onClick={interactive ? share : undefined}
          className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl font-semibold text-sm border-2 transition active:scale-95"
          style={{
            borderColor: dark ? "#334155" : "#e2e8f0",
            background: dark ? "transparent" : "#fff",
            color: t.ink,
          }}
        >
          <Icon name={copied ? "check" : "ios_share"} className="text-[20px]" />
          {copied ? "Copied!" : "Share My Card"}
        </button>
      </div>

      {/* Links */}
      <div className="px-5 mt-6 flex flex-col gap-3 flex-1">
        <p
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: dark ? "#64748b" : "#9ca3af" }}
        >
          Connect with me
        </p>
        {data.links.length === 0 && (
          <p className="text-sm text-center py-6" style={{ color: dark ? "#64748b" : "#9ca3af" }}>
            No links added yet.
          </p>
        )}
        {data.links.map((link) => {
          const Inner = (
            <>
              <BrandTile platform={link.platform} size={40} radius={10} dark={dark} />
              <span className="flex-1 text-left font-semibold text-sm truncate">
                {link.label}
              </span>
              <Icon
                name="chevron_right"
                className="text-[20px]"
                style={{ color: dark ? "#64748b" : "#9ca3af" }}
              />
            </>
          );
          const cls =
            "flex items-center gap-3 p-3 rounded-xl border transition hover:shadow-md hover:-translate-y-0.5";
          const style: React.CSSProperties = {
            borderColor: dark ? "#1e293b" : "#eceef0",
            background: dark ? "#0f172a" : "#fff",
          };
          return interactive ? (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("LINK_CLICK", link.id)}
              className={cls}
              style={style}
            >
              {Inner}
            </a>
          ) : (
            <div key={link.id} className={cls} style={style}>
              {Inner}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="py-6 flex flex-col items-center gap-1">
        <span
          className="text-[11px] font-bold tracking-widest opacity-60 font-display"
          style={{ color: t.accent }}
        >
          POWERED BY PIXCARDS
        </span>
      </div>
    </div>
  );
}
