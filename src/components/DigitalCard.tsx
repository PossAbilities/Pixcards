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
  templateId?: string;
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
  const template = data.templateId || "classic";
  const [copied, setCopied] = useState(false);
  const dark = t.surface !== "#ffffff";
  const mutedColor = dark ? "#94a3b8" : "#777587";
  const subtleColor = dark ? "#64748b" : "#9ca3af";

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
    const url =
      shareUrl || (typeof window !== "undefined" ? window.location.href : "");
    if (navigator.share) {
      try {
        await navigator.share({
          title: data.name,
          text: `${data.name} — digital card`,
          url,
        });
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

  /* --- shared pieces --------------------------------------------------- */

  function wrapLink(
    link: CardLink,
    cls: string,
    style: React.CSSProperties,
    children: React.ReactNode,
  ) {
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
        {children}
      </a>
    ) : (
      <div key={link.id} className={cls} style={style}>
        {children}
      </div>
    );
  }

  const avatarNode = (size: number, border = true) => (
    <div
      className="rounded-full overflow-hidden grid place-items-center font-bold font-display"
      style={{
        width: size,
        height: size,
        border: border ? `4px solid ${t.surface}` : undefined,
        background: t.accent,
        color: "#fff",
        fontSize: size * 0.32,
        boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
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
  );

  const actionButtons = (
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
  );

  const sectionLabel = (
    <p
      className="text-xs font-semibold uppercase tracking-widest"
      style={{ color: subtleColor }}
    >
      Connect with me
    </p>
  );

  const linkRows = (
    <div className="flex flex-col gap-3">
      {data.links.length === 0 && (
        <p className="text-sm text-center py-6" style={{ color: subtleColor }}>
          No links added yet.
        </p>
      )}
      {data.links.map((link) =>
        wrapLink(
          link,
          "flex items-center gap-3 p-3 rounded-xl border transition hover:shadow-md hover:-translate-y-0.5",
          {
            borderColor: dark ? "#1e293b" : "#eceef0",
            background: dark ? "#0f172a" : "#fff",
          },
          <>
            <BrandTile platform={link.platform} size={40} radius={10} dark={dark} />
            <span className="flex-1 text-left font-semibold text-sm truncate">
              {link.label}
            </span>
            <Icon
              name="chevron_right"
              className="text-[20px]"
              style={{ color: subtleColor }}
            />
          </>,
        ),
      )}
    </div>
  );

  const linkGrid = (
    <div className="grid grid-cols-3 gap-3">
      {data.links.length === 0 && (
        <p
          className="col-span-3 text-sm text-center py-6"
          style={{ color: subtleColor }}
        >
          No links added yet.
        </p>
      )}
      {data.links.map((link) =>
        wrapLink(
          link,
          "flex flex-col items-center gap-2 p-3 rounded-2xl border transition hover:shadow-md hover:-translate-y-0.5",
          {
            borderColor: dark ? "#1e293b" : "#eceef0",
            background: dark ? "#0f172a" : "#fff",
          },
          <>
            <BrandTile platform={link.platform} size={46} radius={14} dark={dark} />
            <span className="text-[11px] font-semibold text-center truncate w-full">
              {link.label}
            </span>
          </>,
        ),
      )}
    </div>
  );

  const footer = (
    <div className="py-6 flex flex-col items-center gap-1 mt-auto">
      <span
        className="text-[11px] font-bold tracking-widest opacity-60 font-display"
        style={{ color: t.accent }}
      >
        POWERED BY PIXCARDS
      </span>
    </div>
  );

  const wrapperCls = cn("flex flex-col min-h-full", className);
  const wrapperStyle: React.CSSProperties = {
    background: t.surface,
    color: t.ink,
  };

  /* --- SPOTLIGHT ------------------------------------------------------- */
  if (template === "spotlight") {
    return (
      <div className={wrapperCls} style={wrapperStyle}>
        <div className="relative shrink-0" style={{ height: 340 }}>
          <div
            className="absolute inset-0"
            style={{
              background: data.avatarUrl
                ? `center/cover no-repeat url("${data.avatarUrl}")`
                : t.header,
            }}
          />
          {!data.avatarUrl && (
            <div className="absolute inset-0 grid place-items-center text-white/90 font-display font-bold text-6xl">
              {initials(data.name || "P")}
            </div>
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.15) 45%, transparent 72%)",
            }}
          />
          <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
            <h1 className="font-display text-2xl font-bold leading-tight drop-shadow">
              {data.name || "Your Name"}
            </h1>
            {(data.jobTitle || data.company) && (
              <p className="text-sm font-medium text-white/90 mt-0.5">
                {[data.jobTitle, data.company].filter(Boolean).join(" · ")}
              </p>
            )}
            {data.location && (
              <span className="inline-flex items-center gap-1 text-xs text-white/80 mt-1">
                <Icon name="location_on" className="text-[15px]" />
                {data.location}
              </span>
            )}
          </div>
        </div>

        {data.bio && (
          <p
            className="px-5 mt-4 text-sm leading-relaxed text-center"
            style={{ color: dark ? "#cbd5e1" : "#464555" }}
          >
            {data.bio}
          </p>
        )}

        {actionButtons}

        <div className="px-5 mt-6 flex flex-col gap-3 flex-1">
          {sectionLabel}
          {linkRows}
        </div>

        {footer}
      </div>
    );
  }

  /* --- GRID ------------------------------------------------------------ */
  if (template === "grid") {
    return (
      <div className={wrapperCls} style={wrapperStyle}>
        <div className="relative h-28 shrink-0">
          <div
            className="absolute inset-0"
            style={{
              background: data.headerUrl
                ? `center/cover no-repeat url("${data.headerUrl}")`
                : t.header,
            }}
          />
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
            {avatarNode(80)}
          </div>
        </div>

        <div className="mt-12 px-5 text-center flex flex-col items-center gap-1">
          <h1 className="font-display text-xl font-bold leading-tight">
            {data.name || "Your Name"}
          </h1>
          {(data.jobTitle || data.company) && (
            <p className="text-xs font-medium" style={{ color: mutedColor }}>
              {[data.jobTitle, data.company].filter(Boolean).join(" · ")}
            </p>
          )}
          {data.bio && (
            <p
              className="text-[13px] leading-relaxed mt-1.5 max-w-xs"
              style={{ color: dark ? "#cbd5e1" : "#464555" }}
            >
              {data.bio}
            </p>
          )}
        </div>

        <div className="px-5 mt-5">
          <button
            type="button"
            onClick={interactive ? saveContact : undefined}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm shadow-md transition active:scale-95"
            style={{ background: t.accent }}
          >
            <Icon name="person_add" className="text-[20px]" />
            Save Contact
          </button>
        </div>

        <div className="px-5 mt-6 flex-1">{linkGrid}</div>

        {footer}
      </div>
    );
  }

  /* --- MINIMAL --------------------------------------------------------- */
  if (template === "minimal") {
    return (
      <div className={wrapperCls} style={wrapperStyle}>
        <div className="pt-10 px-5 flex flex-col items-center text-center gap-1.5">
          {avatarNode(96)}
          <h1 className="font-display text-2xl font-bold leading-tight mt-3">
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
              style={{ color: mutedColor }}
            >
              <Icon name="location_on" className="text-[16px]" />
              {data.location}
            </span>
          )}
        </div>

        {actionButtons}

        <div className="px-5 mt-6 flex flex-col gap-3 flex-1">
          {sectionLabel}
          {linkRows}
        </div>

        {footer}
      </div>
    );
  }

  /* --- CLASSIC (default) ----------------------------------------------- */
  return (
    <div className={wrapperCls} style={wrapperStyle}>
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
          {avatarNode(96)}
        </div>
      </div>

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
            style={{ color: mutedColor }}
          >
            <Icon name="location_on" className="text-[16px]" />
            {data.location}
          </span>
        )}
      </div>

      {actionButtons}

      <div className="px-5 mt-6 flex flex-col gap-3 flex-1">
        {sectionLabel}
        {linkRows}
      </div>

      {footer}
    </div>
  );
}
