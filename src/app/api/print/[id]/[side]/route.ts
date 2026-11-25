import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { renderTemplateSidePng } from "@/lib/card-artwork";
import { loadMyCard } from "@/lib/mycard";
import { hasTemplate, type CardTemplateSpec, type MergeData } from "@/lib/card-template";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/print/<orderId>/<front|back>?scale=3[&inline=1]   (admin only)
 *
 * Print-grade artwork. Rendered LIVE from the card owner's CURRENT design, so
 * it always reflects the latest brand font, colours and element positions —
 * not the snapshot baked when the order was placed. Falls back to the order's
 * stored design, then the baked artwork, for orders without a live design.
 * `inline=1` serves it for on-page preview instead of as a download.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; side: string }> },
) {
  const viewer = await getSessionUser();
  if (!viewer || viewer.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id, side } = await params;
  if (side !== "front" && side !== "back") {
    return NextResponse.json({ error: "Bad side" }, { status: 400 });
  }
  const scale = Math.min(4, Math.max(1, Number(req.nextUrl.searchParams.get("scale")) || 3));
  const inline = req.nextUrl.searchParams.get("inline") === "1";

  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, userId: true, design: true },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const shortId = order.id.slice(-8).toUpperCase();
  const filename = `pixcards-${shortId}-${side}-${scale * 300}dpi.png`;
  const pngHeaders = () => ({
    "Content-Type": "image/png",
    "Content-Disposition": inline ? "inline" : `attachment; filename="${filename}"`,
    "Cache-Control": "private, no-store",
  });

  // Best path: the card owner's CURRENT design (latest font, colours, layout).
  try {
    const my = await loadMyCard(order.userId);
    if (my && hasTemplate(my.spec)) {
      const png = await renderTemplateSidePng(my.spec[side], my.merge, scale);
      return new NextResponse(new Uint8Array(png), { headers: pngHeaders() });
    }
  } catch {
    /* fall through */
  }

  // Fallback: re-render from the design stored on the order.
  let design: {
    frontImage?: string;
    backImage?: string;
    templateSpec?: CardTemplateSpec;
    merge?: MergeData;
  } = {};
  try {
    design = JSON.parse(order.design);
  } catch {
    /* no design */
  }
  if (design.templateSpec && design.merge && hasTemplate(design.templateSpec)) {
    try {
      const png = await renderTemplateSidePng(design.templateSpec[side], design.merge, scale);
      return new NextResponse(new Uint8Array(png), { headers: pngHeaders() });
    } catch {
      /* fall back to the baked image */
    }
  }

  // Last resort: the artwork baked at order time.
  const value = side === "front" ? design.frontImage : design.backImage;
  if (!value) return NextResponse.json({ error: "No artwork" }, { status: 404 });
  if (!value.startsWith("data:")) return NextResponse.redirect(value);
  const m = /^data:[^;]+;base64,([\s\S]+)$/.exec(value);
  if (!m) return NextResponse.json({ error: "Unsupported" }, { status: 415 });
  return new NextResponse(new Uint8Array(Buffer.from(m[1], "base64")), {
    headers: pngHeaders(),
  });
}
