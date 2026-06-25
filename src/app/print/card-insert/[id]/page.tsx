import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { cardTapUrl } from "@/lib/cards";
import { appUrl, APP_NAME } from "@/lib/constants";
import { PrintToolbar } from "@/components/print/PrintToolbar";

export const metadata: Metadata = {
  title: `Card insert | ${APP_NAME}`,
  robots: { index: false },
};

const BRAND = "linear-gradient(135deg,#6366f1 0%,#4f46e5 55%,#3525cd 100%)";
const INK = "#191c1e";
const MUTED = "#5b6166";
const FAINT = "#9aa0a6";
const LINE = "#e6e8ea";

// Quirky inside greetings — one is picked per card so a batch feels playful.
const GREETINGS: { kicker: string; title: string; body: string }[] = [
  {
    kicker: "PSST… IT'S HERE",
    title: "Well, hello there 👋",
    body: "Your brand-new card has landed. The era of “hang on, I think I’ve got one somewhere…” is officially over.",
  },
  {
    kicker: "DRUMROLL PLEASE",
    title: "Ta-da! 🎉",
    body: "Meet the only business card you’ll never have to reprint. Tap it, flaunt it, watch people go “ooh”.",
  },
  {
    kicker: "SPECIAL DELIVERY",
    title: "It’s heeere! ✨",
    body: "One tap and your details fly straight to their phone. No app, no fuss, no fumbling for a pen.",
  },
  {
    kicker: "ABRACADABRA",
    title: "Surprise! 🪄",
    body: "You just got 100% more memorable. Give it a tap and let the little bit of magic do the talking.",
  },
];

/** Stable per-card pick so each greeting is consistent across reprints. */
function pickGreeting(seed: string) {
  let sum = 0;
  for (let i = 0; i < seed.length; i++) sum += seed.charCodeAt(i);
  return GREETINGS[sum % GREETINGS.length];
}

const printCss = `
  @page { size: A5 portrait; margin: 0; }
  /* Force background colours/gradients to print (browsers drop them otherwise). */
  .pc-sheet, .pc-sheet * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  @media print {
    html, body {
      margin: 0 !important;
      background: #fff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .pc-toolbar { display: none !important; }
    .pc-stage { background: #fff !important; padding: 0 !important; }
    .pc-sheet { box-shadow: none !important; margin: 0 !important; page-break-after: always; }
    .pc-sheet:last-child { page-break-after: auto; }
  }
`;

/** One A5 sheet: front cover (bottom) + activation panel (top, rotated). */
function InsertSheet({
  firstName,
  tapUrl,
  code,
}: {
  firstName: string;
  tapUrl: string;
  code: string;
}) {
  const qrSrc = `/api/qr?data=${encodeURIComponent(tapUrl)}&color=${encodeURIComponent(INK)}`;
  const prettyUrl = tapUrl.replace(/^https?:\/\//, "");
  const greeting = pickGreeting(code + firstName);

  return (
    <div
      className="pc-sheet"
      style={{
        width: "148mm",
        height: "210mm",
        background: "#fff",
        margin: "0 auto 8mm",
        boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
        position: "relative",
        overflow: "hidden",
        color: INK,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ===== TOP HALF — inside / activation (rotated so it reads upright once folded) ===== */}
      <div
        style={{
          height: "105mm",
          transform: "rotate(180deg)",
          padding: "12mm 12mm 10mm",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
        }}
      >
        {/* Quirky welcome — the first thing they see when the card opens */}
        <div>
          <span
            style={{
              fontSize: "7.5pt",
              fontWeight: 800,
              letterSpacing: "0.18em",
              color: "#4f46e5",
            }}
          >
            {greeting.kicker}
          </span>
          <h2
            style={{
              margin: "1.5mm 0 0",
              fontFamily: "var(--font-montserrat)",
              fontWeight: 800,
              fontSize: "22pt",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            {greeting.title}
          </h2>
          <p
            style={{
              margin: "2.5mm 0 0",
              fontSize: "10pt",
              lineHeight: 1.45,
              color: MUTED,
              maxWidth: "92mm",
            }}
          >
            {firstName !== "there" ? (
              <strong style={{ color: INK }}>Hey {firstName} — </strong>
            ) : null}
            {greeting.body}
          </p>
        </div>

        {/* Compact activation + QR */}
        <div
          style={{
            marginTop: "auto",
            paddingTop: "5mm",
            display: "flex",
            gap: "6mm",
            alignItems: "center",
          }}
        >
          <div style={{ flex: 1 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "1.5mm",
                fontFamily: "var(--font-montserrat)",
                fontWeight: 800,
                fontSize: "10.5pt",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "18px", color: "#4f46e5" }}
              >
                contactless
              </span>
              Up and running in seconds
            </span>
            <ol
              style={{
                margin: "3mm 0 0",
                padding: 0,
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: "2.5mm",
              }}
            >
              {[
                "Tap the card to the back of your phone — your profile opens. No app needed.",
                "No NFC? Point your camera at the QR code instead.",
                "Hit “Save contact”, then share your link anywhere.",
              ].map((d, i) => (
                <li
                  key={i}
                  style={{ display: "flex", gap: "2.5mm", alignItems: "flex-start" }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      width: "5.5mm",
                      height: "5.5mm",
                      borderRadius: "9999px",
                      background: BRAND,
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: "8pt",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ fontSize: "8.5pt", color: MUTED, lineHeight: 1.35 }}>
                    {d}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* QR */}
          <div style={{ width: "30mm", textAlign: "center", flexShrink: 0 }}>
            <div
              style={{
                border: `1px solid ${LINE}`,
                borderRadius: "10px",
                padding: "2.5mm",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrSrc}
                alt="Scan to open your card"
                style={{ width: "100%", display: "block" }}
              />
            </div>
            <p
              style={{
                margin: "1.5mm 0 0",
                fontSize: "6.5pt",
                color: FAINT,
                wordBreak: "break-all",
                lineHeight: 1.3,
              }}
            >
              {prettyUrl}
            </p>
          </div>
        </div>

        <div
          style={{
            borderTop: `1px solid ${LINE}`,
            marginTop: "5mm",
            paddingTop: "2.5mm",
            display: "flex",
            justifyContent: "space-between",
            fontSize: "7.5pt",
            color: FAINT,
          }}
        >
          <span>Card {code}</span>
          <span>Need help? hello@pixcards.co.uk</span>
        </div>
      </div>

      {/* ===== FOLD LINE ===== */}
      <div
        style={{
          position: "absolute",
          top: "105mm",
          left: 0,
          right: 0,
          borderTop: `1px dashed ${LINE}`,
        }}
        aria-hidden
      >
        <span
          style={{
            position: "absolute",
            right: "4mm",
            top: "-2.2mm",
            fontSize: "6pt",
            letterSpacing: "0.15em",
            color: FAINT,
            background: "#fff",
            padding: "0 2mm",
          }}
        >
          FOLD
        </span>
      </div>

      {/* ===== BOTTOM HALF — front cover ===== */}
      <div
        style={{
          height: "105mm",
          background: BRAND,
          color: "#fff",
          padding: "14mm 12mm",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxSizing: "border-box",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* soft decorative circles */}
        <span
          style={{
            position: "absolute",
            top: "-30mm",
            right: "-20mm",
            width: "70mm",
            height: "70mm",
            borderRadius: "9999px",
            background: "rgba(255,255,255,0.10)",
          }}
          aria-hidden
        />
        <span
          style={{
            position: "absolute",
            bottom: "-25mm",
            left: "-20mm",
            width: "60mm",
            height: "60mm",
            borderRadius: "9999px",
            background: "rgba(255,255,255,0.08)",
          }}
          aria-hidden
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "2.5mm",
            position: "relative",
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: "26px" }}
          >
            contactless
          </span>
          <span
            style={{
              fontFamily: "var(--font-montserrat)",
              fontWeight: 800,
              fontSize: "16pt",
              letterSpacing: "-0.01em",
            }}
          >
            Pixcards
          </span>
        </div>

        <div style={{ position: "relative" }}>
          <p
            style={{
              margin: 0,
              fontSize: "10pt",
              opacity: 0.85,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Welcome
          </p>
          <h1
            style={{
              margin: "1mm 0 0",
              fontFamily: "var(--font-montserrat)",
              fontWeight: 800,
              fontSize: "30pt",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            {firstName}
          </h1>
          <p style={{ margin: "3mm 0 0", fontSize: "12pt", opacity: 0.9 }}>
            Your smart business card has arrived. Tap it, share it, never run
            out again.
          </p>
        </div>

        <div
          style={{
            position: "relative",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "9pt",
            opacity: 0.9,
          }}
        >
          <span>The last business card you&apos;ll ever need.</span>
          <span style={{ fontWeight: 700 }}>pixcards.co.uk</span>
        </div>
      </div>
    </div>
  );
}

export default async function CardInsertPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: { include: { profile: true } },
      cards: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) notFound();

  const firstName = (order.user.name || "there").split(" ")[0];
  // Prefer real card codes; if none generated yet, fall back to the profile
  // URL so the insert is still printable.
  const username = order.user.profile?.username;
  const sheets =
    order.cards.length > 0
      ? order.cards.map((c) => ({ code: c.code, tapUrl: cardTapUrl(c.code) }))
      : username
        ? [{ code: "—", tapUrl: `${appUrl()}/u/${username}` }]
        : [];

  return (
    <div style={{ fontFamily: "var(--font-inter)" }}>
      <style dangerouslySetInnerHTML={{ __html: printCss }} />
      <PrintToolbar backHref={`/admin/orders/${order.id}`} />

      {sheets.length === 0 ? (
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <p className="font-semibold text-ink">No card to print yet</p>
          <p className="mt-1 text-sm text-muted">
            Generate the NFC card on the order page first, then come back to
            print the insert.
          </p>
          <Link
            href={`/admin/orders/${order.id}`}
            className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
          >
            Go to order
          </Link>
        </div>
      ) : (
        <div
          className="pc-stage"
          style={{ background: "#eef0f2", padding: "10mm 0" }}
        >
          {sheets.map((s, i) => (
            <InsertSheet
              key={i}
              firstName={firstName}
              tapUrl={s.tapUrl}
              code={s.code}
            />
          ))}
        </div>
      )}
    </div>
  );
}
