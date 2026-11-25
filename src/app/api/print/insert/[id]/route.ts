import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { cardTapUrl } from "@/lib/cards";
import { appUrl } from "@/lib/constants";
import { renderInsertPdf, INSERT_THEMES, insertThemeKeyFor } from "@/lib/card-insert";
import { loadMyCard } from "@/lib/mycard";
import { renderTemplateSidePng } from "@/lib/card-artwork";
import { hasTemplate } from "@/lib/card-template";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/print/insert/<orderId>  (admin only)
 * A print-ready A5 fold-card insert PDF, one page per card in the order.
 * Rendered server-side so it prints identically on any browser (the old CSS
 * print page blanked in Safari).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: { include: { profile: true } },
      cards: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const firstName = (order.user.name || "there").split(" ")[0];

  // Theme by the owner's brand (preset, or email domain for custom cards).
  const theme =
    INSERT_THEMES[
      insertThemeKeyFor(order.user.profile?.cardPreset, order.user.email)
    ];

  const username = order.user.profile?.username;
  const cards =
    order.cards.length > 0
      ? order.cards.map((c) => ({ code: c.code, tapUrl: cardTapUrl(c.code) }))
      : username
        ? [{ code: "—", tapUrl: `${appUrl()}/u/${username}` }]
        : [];
  if (cards.length === 0) {
    return NextResponse.json({ error: "No card generated for this order yet." }, { status: 400 });
  }

  // The outside cover mirrors the owner's own card front (live render).
  let cardCoverPng: Buffer | undefined;
  try {
    const my = await loadMyCard(order.userId);
    if (my && hasTemplate(my.spec)) {
      cardCoverPng = await renderTemplateSidePng(my.spec.front, my.merge, 1);
    }
  } catch {
    /* fall back to the brand back-cover */
  }

  const pdf = await renderInsertPdf({ firstName, theme, cards, cardCoverPng });
  const shortId = order.id.slice(-8).toUpperCase();
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="pixcards-insert-${shortId}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
