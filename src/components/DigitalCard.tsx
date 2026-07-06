"use client";

import { useState } from "react";
import { Icon } from "./Icon";
import { BrandTile } from "./BrandIcon";
import { theme as getTheme } from "@/lib/constants";
import { buildVCard, initials, cn, orderByTokens } from "@/lib/utils";

function rgbOf(hex?: string | null): [number, number, number] | null {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return null;
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

/** Perceived luminance 0–1 of a hex colour. */
function luminance(hex?: string | null): number {
  const rgb = rgbOf(hex);
  if (!rgb) return 1;
  return (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
}

/** Black or white, whichever reads better on a given hex colour. */
function readableInk(hex?: string | null): string {
  if (!rgbOf(hex)) return "#12142f";
  return luminance(hex) > 0.62 ? "#12142f" : "#ffffff";
}

/** Mix a hex colour toward white by `t` (0 = colour, 1 = white). */
function mixWhite(hex: string, t: number): string {
  const rgb = rgbOf(hex);
  if (!rgb) return "#ffffff";
  const m = rgb.map((c) => Math.round(c + (255 - c) * t));
  return `#${m.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

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
  /** Optional custom brand gradient that overrides the preset theme header. */
  brandHeader?: string | null;
  /** Optional brand accent that overrides the preset theme accent. */
  accent?: string | null;
  /** Optional second brand colour (e.g. a lime panel) for the "brand" template. */
  panelColor?: string | null;
  /** Size of the contact/social icon squares: sm | md | lg */
  tileSize?: string | null;
  /** Size of the profile photo: sm | md | lg */
  avatarSize?: string | null;
  /** Drag & drop order of the icon squares ("email", "phone", link ids). */
  tileOrder?: string[] | null;
  links: CardLink[];
};

export function DigitalCard({
  data,
  interactive = false,
  profileId,
  shareUrl,
  className,
  hideBranding = false,
}: {
  data: CardData;
  interactive?: boolean;
  profileId?: string;
  shareUrl?: string;
  className?: string;
  hideBranding?: boolean;
}) {
  const t = getTheme(data.themeId);
  const headerBg = data.brandHeader || t.header;
  const accent = data.accent || t.accent;
  const panel = data.panelColor || `${accent}1a`;
  const panelInk = readableInk(data.panelColor);
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

  async function saveContact() {
    track("SAVE_CONTACT");

    // Embed the avatar as the contact photo when we can fetch it.
    let photoBase64: string | undefined;
    let photoType: "JPEG" | "PNG" = "JPEG";
    if (data.avatarUrl) {
      try {
        const res = await fetch(data.avatarUrl);
        const blob = await res.blob();
        // Embed photos up to ~3MB (cropped avatars are far smaller); above
        // that the vCard gets unwieldy so we skip the photo.
        if (blob.size > 0 && blob.size < 3_000_000) {
          photoType = blob.type.includes("png") ? "PNG" : "JPEG";
          const bytes = new Uint8Array(await blob.arrayBuffer());
          let bin = "";
          for (let i = 0; i < bytes.length; i++)
            bin += String.fromCharCode(bytes[i]);
          photoBase64 = btoa(bin);
        }
      } catch {
        /* no photo — still save the rest */
      }
    }

    const vcard = buildVCard({
      name: data.name,
      jobTitle: data.jobTitle,
      company: data.company,
      phone: data.phone,
      email: data.email,
      url: shareUrl,
      photoBase64,
      photoType,
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
        background: accent,
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

  // Full-bleed cover image. Rendered as <img> (not a CSS background) so iOS
  // Safari can downscale-decode it and reuse the decoded bitmap shared with
  // the avatar — a CSS cover-background of a large data-URI here is what
  // crashes the live preview on mobile.
  const coverImg = (url: string, alt: string) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      decoding="async"
      className="absolute inset-0 h-full w-full object-cover"
    />
  );

  const actionButtons = (
    <div className="px-5 mt-5 grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={interactive ? saveContact : undefined}
        className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-semibold text-sm transition active:scale-95"
        style={{ background: accent, boxShadow: `0 10px 24px -8px ${accent}99` }}
      >
        <Icon name="person_add" className="text-[20px]" />
        Save Contact
      </button>
      <button
        type="button"
        onClick={interactive ? share : undefined}
        className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm border-2 transition active:scale-95"
        style={{
          borderColor: dark ? "#334155" : "#e6e8ec",
          background: dark ? "transparent" : "#fff",
          color: t.ink,
        }}
      >
        <Icon name={copied ? "check" : "ios_share"} className="text-[20px]" />
        {copied ? "Copied!" : "Share"}
      </button>
    </div>
  );

  const sectionLabel = (
    <div className="flex items-center gap-2.5">
      <span
        className="text-xs font-semibold uppercase tracking-widest"
        style={{ color: subtleColor }}
      >
        Connect with me
      </span>
      <span className="h-px flex-1" style={{ background: dark ? "#1e293b" : "#eceef0" }} />
    </div>
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

  // Tappable contact rows (email/phone) with accent icons — mirrors the
  // printed card. Each shows only when the field is set.
  const contactItem = (icon: string, label: string, href: string) => {
    const inner = (
      <>
        <span
          className="grid place-items-center rounded-[10px] shrink-0"
          style={{ width: 40, height: 40, background: accent, color: "#fff" }}
        >
          <Icon name={icon} className="text-[20px]" />
        </span>
        <span className="flex-1 text-left font-semibold text-sm truncate">{label}</span>
      </>
    );
    const cls =
      "flex items-center gap-3 p-3 rounded-xl border transition hover:shadow-md hover:-translate-y-0.5";
    const style: React.CSSProperties = {
      borderColor: dark ? "#1e293b" : "#eceef0",
      background: dark ? "#0f172a" : "#fff",
    };
    return interactive ? (
      <a key={icon} href={href} className={cls} style={style}>
        {inner}
      </a>
    ) : (
      <div key={icon} className={cls} style={style}>
        {inner}
      </div>
    );
  };
  const contactRows =
    data.email || data.phone ? (
      <div className="flex flex-col gap-3">
        {data.email && contactItem("mail", data.email, `mailto:${data.email}`)}
        {data.phone && contactItem("call", data.phone, `tel:${data.phone}`)}
      </div>
    ) : null;

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

  const footer = hideBranding ? null : (
    <div className="py-6 flex flex-col items-center gap-1 mt-auto">
      <span
        className="text-[11px] font-bold tracking-widest opacity-60 font-display"
        style={{ color: accent }}
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

  /* --- BRAND — a literal echo of the printed card: navy hero, lime panel,
         gradient strip, blob cut-out, pill CTA ------------------------- */
  if (template === "brand") {
    // The panel colour doubles as the body fill. A light brand colour (lime)
    // reads well filling the page; a heavy mid-tone (teal) becomes oppressive,
    // so fill with a soft tint of it instead and keep the full colour for the
    // accents (role, strip, gradient). Keeps Perspective's full lime intact.
    const panelIsLight = luminance(panel) > 0.72;
    const bodyBg = panelIsLight ? panel : mixWhite(panel, 0.9);
    const bodyInk = readableInk(bodyBg);
    const inkOnWhite = readableInk("#ffffff");
    const strip = `linear-gradient(90deg, ${panel} 0%, #5aa0e0 50%, ${accent} 100%)`;
    // User-selectable icon-square + photo sizes (Profile → Card layout).
    const TILE = { sm: { px: 44, r: 12, icon: 20 }, md: { px: 56, r: 16, icon: 26 }, lg: { px: 72, r: 20, icon: 34 } } as const;
    const tile = TILE[(data.tileSize as keyof typeof TILE) ?? "md"] ?? TILE.md;
    const AVATAR = { sm: 48, md: 60, lg: 84 } as const;
    const avatarPx = AVATAR[(data.avatarSize as keyof typeof AVATAR) ?? "md"] ?? AVATAR.md;
    // Icon-only square action tile (email/phone) — same visual weight as the
    // social BrandTiles beside it.
    const actionTile = (icon: string, href: string, label: string) => {
      const inner = (
        <span
          className="grid place-items-center"
          style={{ width: tile.px, height: tile.px, borderRadius: tile.r, background: accent, color: "#fff", boxShadow: "0 6px 16px -8px rgba(0,0,0,0.35)" }}
        >
          <Icon name={icon} style={{ fontSize: tile.icon }} />
        </span>
      );
      return interactive ? (
        <a key={icon} href={href} aria-label={label} className="transition hover:-translate-y-0.5 active:scale-95">
          {inner}
        </a>
      ) : (
        <div key={icon}>{inner}</div>
      );
    };
    const hasTiles = Boolean(data.email || data.phone || data.links.length > 0);
    // Rounded-square hero photo in a slim brand-gradient ring — matches the
    // rounded-square contact tiles and ties the brand colours together
    // (teal→magenta for PossAbilities, lime→orange for Perspective).
    const brandAvatar = (size: number) => {
      const radius = Math.round(size * 0.3);
      return (
        <div
          className="shrink-0"
          style={{
            padding: 3,
            borderRadius: radius + 3,
            background: `linear-gradient(135deg, ${panel}, ${accent})`,
            boxShadow: "0 10px 24px -8px rgba(0,0,0,0.5)",
          }}
        >
          <div
            className="grid place-items-center overflow-hidden font-display font-bold"
            style={{ width: size, height: size, borderRadius: radius, background: accent, color: "#fff", fontSize: size * 0.34 }}
          >
            {data.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.avatarUrl} alt={data.name} className="h-full w-full object-cover" />
            ) : (
              <span>{initials(data.name || "P")}</span>
            )}
          </div>
        </div>
      );
    };
    // Visitors see this page — third-person copy ("Share Ryan's card"),
    // never "my card".
    const firstName = (data.name || "").trim().split(/\s+/)[0];
    const shareLabel = firstName ? `Share ${firstName}’s card` : "Share this card";
    return (
      <div className={wrapperCls} style={{ ...wrapperStyle, background: bodyBg }}>
        {/* Hero — navy card-front: small avatar badge, bold name, role, ring */}
        <div className="relative shrink-0 overflow-hidden px-6 pb-9 pt-8" style={{ background: headerBg }}>
          <span
            className="pointer-events-none absolute right-6 top-7 h-7 w-7 rounded-full border-[3px]"
            style={{ borderColor: accent }}
            aria-hidden
          />
          <div className="flex items-center gap-3.5">
            {brandAvatar(avatarPx)}
            {/* pr keeps the name/role clear of the ring accent pinned top-right */}
            <div className="min-w-0 pr-8">
              <h1 className="font-display text-2xl font-bold leading-tight tracking-tight text-white truncate">
                {data.name || "Your Name"}
              </h1>
              {(data.jobTitle || data.company) && (
                <p className="mt-0.5 truncate text-sm font-semibold" style={{ color: panel }}>
                  {[data.jobTitle, data.company].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </div>
          {data.location && (
            <span className="mt-3 inline-flex items-center gap-1 text-xs text-white/65">
              <Icon name="location_on" className="text-[14px]" />
              {data.location}
            </span>
          )}
          {/* Signature gradient strip — same recipe as the printed card edge. */}
          <div className="absolute inset-x-0 bottom-0 h-2" style={{ background: strip }} aria-hidden />
        </div>

        {/* Body — runs to the bottom of the page: blob cut-out, tagline,
            CTA pills, icon-square actions */}
        <div className="relative -mt-px flex flex-1 flex-col overflow-hidden px-6 pb-7 pt-7" style={{ background: bodyBg }}>
          <span
            className="pointer-events-none absolute -right-6 -top-12 h-28 w-28 rounded-full"
            style={{ background: headerBg }}
            aria-hidden
          />
          {data.bio && (
            /* pr keeps the tagline's opening lines clear of the blob cut-out */
            <p className="relative pr-14 font-display text-[19px] font-bold leading-snug" style={{ color: bodyInk }}>
              {data.bio}
            </p>
          )}

          <div className="relative mt-5">
            <button
              type="button"
              onClick={interactive ? saveContact : undefined}
              className="flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold text-white transition active:scale-95"
              style={{ background: accent, boxShadow: `0 10px 24px -8px ${accent}99` }}
            >
              <Icon name="person_add" className="text-[20px]" />
              Save Contact
            </button>
            <button
              type="button"
              onClick={interactive ? share : undefined}
              className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-full border py-3 text-sm font-semibold transition active:scale-95"
              style={{ background: "#ffffff", color: inkOnWhite, borderColor: `${inkOnWhite}1f` }}
            >
              <Icon name={copied ? "check" : "ios_share"} className="text-[18px]" />
              {copied ? "Copied!" : shareLabel}
            </button>
          </div>

          {/* Icon squares — each square IS the action (mailto / tel / open
              link), shown in the user's drag & drop order. */}
          {hasTiles && (
            <div className="relative mt-6 flex flex-wrap gap-3">
              {orderByTokens(
                [
                  ...(data.email
                    ? [{ key: "email", node: actionTile("mail", `mailto:${data.email}`, "Email") }]
                    : []),
                  ...(data.phone
                    ? [{ key: "phone", node: actionTile("call", `tel:${data.phone}`, "Call") }]
                    : []),
                  ...data.links.map((link) => ({
                    key: link.id,
                    node: wrapLink(
                      link,
                      "transition hover:-translate-y-0.5 active:scale-95",
                      {},
                      /* solid: brand-coloured tiles stand out on the lime panel */
                      <BrandTile platform={link.platform} size={tile.px} radius={tile.r} solid />,
                    ),
                  })),
                ],
                (t) => t.key,
                data.tileOrder,
              ).map((t) => t.node)}
            </div>
          )}

          {footer}
        </div>
      </div>
    );
  }

  /* --- SPOTLIGHT ------------------------------------------------------- */
  if (template === "spotlight") {
    return (
      <div className={wrapperCls} style={wrapperStyle}>
        <div className="relative shrink-0" style={{ height: 340 }}>
          {data.avatarUrl ? (
            coverImg(data.avatarUrl, data.name)
          ) : (
            <div
              className="absolute inset-0 grid place-items-center text-white/90 font-display font-bold text-6xl"
              style={{ background: headerBg }}
            >
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
          <div className="absolute bottom-0 left-0 right-0 p-5 pb-6 text-white">
            <h1 className="font-display text-[28px] font-bold leading-tight tracking-tight drop-shadow">
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
          {/* Signature accent strip along the cover's bottom edge. */}
          <div className="absolute inset-x-0 bottom-0 h-1.5" style={{ background: accent }} aria-hidden />
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
          {contactRows}
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
          {data.headerUrl ? (
            coverImg(data.headerUrl, "")
          ) : (
            <div className="absolute inset-0" style={{ background: headerBg }} />
          )}
          <div className="absolute inset-x-0 bottom-0 h-1.5" style={{ background: accent }} aria-hidden />
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
            style={{ background: accent }}
          >
            <Icon name="person_add" className="text-[20px]" />
            Save Contact
          </button>
        </div>

        <div className="px-5 mt-6 flex flex-col gap-3 flex-1">
          {contactRows}
          {linkGrid}
        </div>

        {footer}
      </div>
    );
  }

  /* --- MINIMAL --------------------------------------------------------- */
  if (template === "minimal") {
    return (
      <div className={wrapperCls} style={wrapperStyle}>
        <div className="h-1.5 w-full shrink-0" style={{ background: accent }} aria-hidden />
        <div className="pt-10 px-5 flex flex-col items-center text-center gap-1.5">
          {avatarNode(96)}
          <h1 className="font-display text-2xl font-bold leading-tight mt-3">
            {data.name || "Your Name"}
          </h1>
          {(data.jobTitle || data.company) && (
            <span
              className="inline-block text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full"
              style={{ background: `${accent}1a`, color: accent }}
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
          {contactRows}
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
        {data.headerUrl ? (
          coverImg(data.headerUrl, "")
        ) : (
          <div className="absolute inset-0" style={{ background: headerBg }} />
        )}
        {/* Signature accent strip — echoes the printed card's edge. */}
        <div className="absolute inset-x-0 bottom-0 h-1.5" style={{ background: accent }} aria-hidden />
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
          {avatarNode(96)}
        </div>
      </div>

      <div className="mt-14 px-5 text-center flex flex-col items-center gap-1.5">
        <h1 className="font-display text-[26px] font-bold leading-tight tracking-tight">
          {data.name || "Your Name"}
        </h1>
        {(data.jobTitle || data.company) && (
          <span
            className="inline-block text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full"
            style={{ background: `${accent}1a`, color: accent }}
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
        {contactRows}
        {sectionLabel}
        {linkRows}
      </div>

      {footer}
    </div>
  );
}
