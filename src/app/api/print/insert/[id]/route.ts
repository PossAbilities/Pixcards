import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { cardTapUrl } from "@/lib/cards";
import { appUrl } from "@/lib/constants";
import { renderInsertPdf, INSERT_THEMES } from "@/lib/card-insert";

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

  // Theme by the user's brand preset first, then the order design, else default.
  let preset = "default";
  const cp = order.user.profile?.cardPreset;
  if (cp && INSERT_THEMES[cp]) preset = cp;
  else {
    try {
      const d = JSON.parse(order.design) as { spec?: { preset?: string } };
      if (d?.spec?.preset && INSERT_THEMES[d.spec.preset]) preset = d.spec.preset;
    } catch {
      /* default */
    }
  }
  const theme = INSERT_THEMES[preset];

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

  const pdf = await renderInsertPdf({ firstName, theme, cards });
  const shortId = order.id.slice(-8).toUpperCase();
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="pixcards-insert-${shortId}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
