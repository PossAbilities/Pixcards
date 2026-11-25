import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { cardTapUrl } from "@/lib/cards";
import { appUrl } from "@/lib/constants";
import { PrintToolbar } from "@/components/print/PrintToolbar";
import {
  INSERT_THEMES,
  insertThemeKeyFor,
  renderInsertPanels,
} from "@/lib/card-insert";
import { loadMyCard } from "@/lib/mycard";
import { renderTemplateSidePng } from "@/lib/card-artwork";
import { hasTemplate } from "@/lib/card-template";

export const metadata: Metadata = {
  title: "Card insert",
  robots: { index: false },
};

const dataUrl = (buf: Buffer) => `data:image/png;base64,${buf.toString("base64")}`;

/** A single A6 panel preview (148 × 105 mm aspect). */
function Panel({ src, label }: { src: string; label: string }) {
  return (
    <figure style={{ margin: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={label}
        style={{
          display: "block",
          width: "100%",
          aspectRatio: "148 / 105",
          objectFit: "cover",
          borderRadius: 10,
          border: "1px solid #e6e8ea",
          boxShadow: "0 6px 20px rgba(0,0,0,0.10)",
        }}
      />
      <figcaption
        style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: "#5b6166" }}
      >
        {label}
      </figcaption>
    </figure>
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
  const theme =
    INSERT_THEMES[insertThemeKeyFor(order.user.profile?.cardPreset, order.user.email)];

  const username = order.user.profile?.username;
  const first =
    order.cards.length > 0
      ? { code: order.cards[0].code, tapUrl: cardTapUrl(order.cards[0].code) }
      : username
        ? { code: "—", tapUrl: `${appUrl()}/u/${username}` }
        : null;

  if (!first) {
    return (
      <div style={{ fontFamily: "var(--font-inter)" }}>
        <PrintToolbar backHref={`/admin/orders/${order.id}`} />
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
      </div>
    );
  }

  // Outside cover mirrors the owner's own card front (live render).
  let cardCoverPng: Buffer | undefined;
  try {
    const my = await loadMyCard(order.userId);
    if (my && hasTemplate(my.spec)) {
      cardCoverPng = await renderTemplateSidePng(my.spec.front, my.merge, 1);
    }
  } catch {
    /* fall back to the brand back-cover */
  }

  const panels = await renderInsertPanels({
    firstName,
    theme,
    code: first.code,
    tapUrl: first.tapUrl,
    cardCoverPng,
  });

  const frontCover = dataUrl(panels.frontCover);
  const backCover = dataUrl(panels.backCover);
  const insideText = dataUrl(panels.insideText);
  const cardHolder = dataUrl(panels.cardHolder);

  return (
    <div style={{ fontFamily: "var(--font-inter)", color: "#191c1e" }}>
      <PrintToolbar
        backHref={`/admin/orders/${order.id}`}
        pdfHref={`/api/print/insert/${order.id}`}
      />

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "24px 16px 64px" }}>
        <div
          style={{
            background: "#eef2ff",
            border: "1px solid #c7d2fe",
            borderRadius: 12,
            padding: "14px 16px",
            fontSize: 14,
            color: "#3730a3",
            marginBottom: 28,
          }}
        >
          <strong>How to print:</strong> use <em>Download A5 PDF</em>, print it{" "}
          <strong>double-sided (flip on the short edge)</strong> on A5, then fold
          in half. The card design is on the outside; open it for the welcome
          note and the slot to hold the card.
        </div>

        <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>
          Outside — what you see when it&apos;s folded shut
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 20,
            marginBottom: 40,
          }}
        >
          <Panel src={frontCover} label="Front cover (their card)" />
          <Panel src={backCover} label="Back cover" />
        </div>

        <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>
          Inside — when you open the fold
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 20,
          }}
        >
          <Panel src={insideText} label="Welcome &amp; how to use it" />
          <Panel src={cardHolder} label="Card holder (snip &amp; tuck the corners)" />
        </div>
      </div>
    </div>
  );
}
