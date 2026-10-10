"use client";

import type { CardData, CardLink } from "@/components/DigitalCard";
import { initials as initialsOf } from "@/lib/utils";

/* PossAbilities digital profile — pixel-faithful ports of the three brand
 * landing-page designs (A Colour Bar, B Purple Wave, C Big Pink). Rendered on
 * the public /u/[username] page when the profile's template is one of the
 * pa-* ids. Uses the brand palette + Nunito Sans; contact rows are driven by
 * the person's real data (email, phone, links). */

const PURPLE = "#48065a";
const PINK = "#ec008c";
const TEAL = "#66cccc";
const TINT = "#f4eef6";
// Avenir is the brand face; Avenir Next ships on Apple devices so they render
// it natively. Nunito Sans is the bundled free fallback everywhere else (and
// the licensed Avenir webfont slots in ahead of it once supplied).
const FONT =
  "'Avenir Next','Avenir','Nunito Sans',ui-sans-serif,system-ui,sans-serif";

/** Stroke-icon paths matching the brand mockups. */
const ICON: Record<string, string> = {
  save: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M19 8v6 M22 11h-6',
  mail: "M3 5h18v14H3z M3 7l9 6 9-6",
  phone:
    "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z",
  globe: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20 M2 12h20 M12 2a15 15 0 0 1 0 20 M12 2a15 15 0 0 0 0 20",
  linkedin: "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6 M2 9h4v12H2z M4 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4",
  tap: "M6 8.5a6.5 6.5 0 0 1 0 7 M10 6a10 10 0 0 1 0 12 M14 3.5a13.5 13.5 0 0 1 0 17",
};

function Glyph({ name, size = 22, stroke }: { name: string; size?: number; stroke?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={stroke ?? "currentColor"}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: "none" }}
      aria-hidden="true"
    >
      {ICON[name].split(" M").map((seg, i) => (
        <path key={i} d={(i ? "M" : "") + seg} />
      ))}
    </svg>
  );
}

type Item = {
  key: string;
  kind: "email" | "phone" | "link";
  icon: string;
  label: string;
  href: string;
  external?: boolean;
};

/** Icon name for a link by its platform. */
function linkIcon(link: CardLink): string {
  const p = (link.platform || "").toLowerCase();
  if (p.includes("linkedin")) return "linkedin";
  if (p.includes("mail") || p.includes("email")) return "mail";
  if (p.includes("phone") || p.includes("tel")) return "phone";
  return "globe";
}

export function PossabilitiesProfile({
  variant,
  data,
  interactive,
  onSaveContact,
  onLinkClick,
}: {
  variant: string;
  data: CardData;
  interactive: boolean;
  onSaveContact: () => void;
  onLinkClick: (linkId?: string) => void;
}) {
  const name = data.name;
  const firstName = name.split(" ")[0] || name;
  const role = data.jobTitle;
  const locLine = ["PossAbilities", data.location].filter(Boolean).join(" · ");

  const items: Item[] = [
    ...(data.email
      ? [{ key: "email", kind: "email", icon: "mail", label: data.email, href: `mailto:${data.email}` } as Item]
      : []),
    ...(data.phone
      ? [{ key: "phone", kind: "phone", icon: "phone", label: data.phone, href: `tel:${data.phone}` } as Item]
      : []),
    ...data.links.map(
      (l): Item => ({
        key: l.id,
        kind: "link",
        icon: linkIcon(l),
        label: l.label,
        href: l.url,
        external: true,
      }),
    ),
  ];

  // One anchor/div wrapper that records a click when interactive.
  function Row({
    item,
    className,
    style,
    children,
  }: {
    item?: Item;
    className?: string;
    style?: React.CSSProperties;
    children: React.ReactNode;
  }) {
    if (!interactive) return <div className={className} style={style}>{children}</div>;
    return (
      <a
        href={item?.href}
        target={item?.external ? "_blank" : undefined}
        rel={item?.external ? "noopener noreferrer" : undefined}
        onClick={() => item && onLinkClick(item.kind === "link" ? item.key : undefined)}
        className={className}
        style={style}
      >
        {children}
      </a>
    );
  }

  function SaveButton({ className, style, iconStroke }: { className?: string; style?: React.CSSProperties; iconStroke?: string }) {
    const inner = (
      <>
        <Glyph name="save" size={22} stroke={iconStroke} />
        Save to contacts
      </>
    );
    if (!interactive) return <div className={className} style={style}>{inner}</div>;
    return (
      <button type="button" onClick={onSaveContact} className={className} style={{ ...style, cursor: "pointer", border: 0 }}>
        {inner}
      </button>
    );
  }

  function Avatar({ size, bg, ink, ring }: { size: number; bg: string; ink: string; ring?: string }) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: bg,
          color: ink,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.37,
          fontWeight: 900,
          border: "5px solid #fff",
          boxShadow: ring ? `0 0 0 4px ${ring}` : undefined,
          overflow: "hidden",
          flex: "none",
        }}
      >
        {data.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.avatarUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          initialsOf(name || "P")
        )}
      </div>
    );
  }

  const bars = (
    <div aria-hidden style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ height: 12, background: TEAL }} />
      <div style={{ height: 12, background: PURPLE }} />
      <div style={{ height: 12, background: PINK }} />
    </div>
  );

  const fontLink = (
    // eslint-disable-next-line @next/next/no-page-custom-font
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;700;900&display=swap"
    />
  );

  /* ------------------------------- A · Colour Bar ----------------------- */
  if (variant === "pa-colourbar") {
    const borders = [TEAL, PURPLE, PINK];
    return (
      <div style={{ fontFamily: FONT, background: "#fff", color: PURPLE }}>
        {fontLink}
        {bars}
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "26px 22px 28px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.4px" }}>
            <span style={{ color: PINK }}>Poss</span>
            <span style={{ color: PURPLE }}>Abilities</span>
          </div>
          <div style={{ marginTop: 20 }}>
            <Avatar size={108} bg={TEAL} ink={PURPLE} ring={PURPLE} />
          </div>
          <h1 style={{ fontSize: 29, fontWeight: 900, margin: "16px 0 0", lineHeight: 1.1, textAlign: "center" }}>{name}</h1>
          {role && <p style={{ fontSize: 16, fontWeight: 700, margin: "6px 0 0", color: PINK }}>{role}</p>}
          <p style={{ fontSize: 14, margin: "4px 0 0", color: PURPLE, opacity: 0.8 }}>{locLine}</p>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12, marginTop: 22 }}>
            <SaveButton
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 54, borderRadius: 14, background: PURPLE, color: "#fff", fontSize: 18, fontWeight: 900, textDecoration: "none", width: "100%" }}
              iconStroke="#fff"
            />
            {items.map((it, i) => (
              <Row
                key={it.key}
                item={it}
                style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 54, borderRadius: 14, background: TINT, color: PURPLE, fontSize: 16, fontWeight: 700, textDecoration: "none", padding: "8px 16px", borderLeft: `8px solid ${borders[i % borders.length]}`, overflowWrap: "anywhere" }}
              >
                <Glyph name={it.icon} /> {it.label}
              </Row>
            ))}
          </div>
        </div>
        <footer style={{ textAlign: "center", fontWeight: 900, fontSize: 15, padding: "6px 0 16px", color: PURPLE }}>
          Live The Life You Choose
        </footer>
        {bars}
      </div>
    );
  }

  /* ------------------------------- B · Purple Wave ---------------------- */
  if (variant === "pa-wave") {
    return (
      <div style={{ fontFamily: FONT, background: "#fff", color: PURPLE }}>
        {fontLink}
        <div style={{ background: PURPLE, textAlign: "center", padding: "36px 24px 28px" }}>
          <div style={{ fontSize: 27, fontWeight: 900, letterSpacing: "-0.4px" }}>
            <span style={{ color: TEAL }}>Poss</span>
            <span style={{ color: "#fff" }}>Abilities</span>
          </div>
          <p style={{ color: "#fff", fontSize: 14, fontWeight: 700, margin: "8px 0 0" }}>Live The Life You Choose</p>
        </div>
        <svg viewBox="0 0 390 84" preserveAspectRatio="none" aria-hidden style={{ display: "block", width: "100%", height: "auto", background: PURPLE }}>
          <path d="M0 34 C100 4 200 74 390 24 L390 84 L0 84 Z" fill={PINK} />
          <path d="M0 50 C100 20 200 90 390 40 L390 84 L0 84 Z" fill={TEAL} />
          <path d="M0 64 C100 34 200 104 390 54 L390 84 L0 84 Z" fill="#ffffff" />
        </svg>
        <div style={{ maxWidth: 480, margin: "-38px auto 0", padding: "0 24px 32px", display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
          <Avatar size={100} bg={PINK} ink="#fff" />
          <h1 style={{ fontSize: 29, fontWeight: 900, margin: "12px 0 0", lineHeight: 1.1, textAlign: "center" }}>{name}</h1>
          {role && <p style={{ fontSize: 16, fontWeight: 700, margin: "6px 0 0", color: PINK }}>{role}</p>}
          <p style={{ fontSize: 14, margin: "4px 0 0", opacity: 0.8 }}>{locLine}</p>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12, marginTop: 22 }}>
            <SaveButton
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 54, borderRadius: 28, background: PINK, color: "#fff", fontSize: 18, fontWeight: 900, textDecoration: "none", width: "100%" }}
              iconStroke="#fff"
            />
            {items.map((it) => (
              <Row
                key={it.key}
                item={it}
                style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 54, borderRadius: 28, background: TINT, color: PURPLE, fontSize: 16, fontWeight: 700, textDecoration: "none", padding: "8px 14px 8px 10px", overflowWrap: "anywhere" }}
              >
                <span style={{ width: 38, height: 38, borderRadius: "50%", background: PURPLE, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                  <Glyph name={it.icon} size={20} stroke={TEAL} />
                </span>
                {it.label}
              </Row>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------- C · Big Pink ------------------------- */
  const tiles = items.map((it, i) => {
    const styles = [
      { background: TINT, color: PURPLE, iconStroke: PURPLE },
      { background: PINK, color: "#fff", iconStroke: "#fff" },
      { background: PURPLE, color: "#fff", iconStroke: TEAL },
      { background: TEAL, color: PURPLE, iconStroke: PURPLE },
    ];
    const s = i === 0 ? styles[0] : i === 1 ? styles[1] : styles[2 + ((i - 2) % 2)];
    const label = it.kind === "email" ? "Email" : it.kind === "phone" ? "Call" : it.label;
    return { it, s, label };
  });
  return (
    <div style={{ fontFamily: FONT, background: TEAL, color: PURPLE }}>
      {fontLink}
      <header style={{ maxWidth: 480, width: "100%", margin: "0 auto", padding: "36px 26px 36px", position: "relative", overflow: "hidden", boxSizing: "border-box" }}>
        <svg viewBox="0 0 24 24" aria-hidden style={{ position: "absolute", right: -80, top: -16, width: 300, height: 300, fill: "none", stroke: "#fff", strokeOpacity: 0.5, strokeWidth: 1.2, strokeLinecap: "round" }}>
          {ICON.tap.split(" M").map((seg, i) => <path key={i} d={(i ? "M" : "") + seg} />)}
        </svg>
        <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.4px", position: "relative", color: PURPLE }}>
          <span>Poss</span><span>Abilities</span>
        </div>
        <p style={{ fontSize: 20, fontWeight: 900, margin: "48px 0 0", position: "relative" }}>Hi, I&apos;m</p>
        <h1 style={{ fontSize: "clamp(56px,22vw,92px)", fontWeight: 900, lineHeight: 0.95, letterSpacing: "-3px", margin: 0, position: "relative", overflowWrap: "anywhere" }}>{firstName}</h1>
        <p style={{ fontSize: 17, fontWeight: 700, margin: "10px 0 0", position: "relative" }}>{[name, role].filter(Boolean).join(" · ")}</p>
      </header>
      <main style={{ maxWidth: 480, width: "100%", margin: "0 auto", background: "#fff", borderRadius: "32px 32px 0 0", padding: "26px 22px 24px", display: "flex", flexDirection: "column", gap: 12, boxSizing: "border-box" }}>
        <SaveButton
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 54, borderRadius: 16, background: PURPLE, color: "#fff", fontSize: 18, fontWeight: 900, textDecoration: "none" }}
          iconStroke={TEAL}
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>
          {tiles.map(({ it, s, label }) => (
            <Row
              key={it.key}
              item={it}
              style={{ minHeight: 118, borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", justifyContent: "space-between", textDecoration: "none", fontSize: 19, fontWeight: 900, background: s.background, color: s.color }}
            >
              <Glyph name={it.icon} size={30} stroke={s.iconStroke} />
              {label}
            </Row>
          ))}
        </div>
        <p style={{ textAlign: "center", fontWeight: 900, fontSize: 15, marginTop: "auto", paddingTop: 12 }}>
          Live The Life You Choose
        </p>
      </main>
    </div>
  );
}
