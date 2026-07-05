import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { renderTemplateSidePng } from "@/lib/card-artwork";
import { hasTemplate, type CardTemplateSpec, type MergeData } from "@/lib/card-template";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/print/<orderId>/<front|back>?scale=3   (admin only)
 *
 * Print-grade artwork download. When the order stores its editable design
 * (templateSpec + merge), the side is re-rendered fresh at the requested
 * scale (1–4 × 300dpi, default 3 = 900dpi) with DPI metadata; older orders
 * fall back to the baked image saved at order time.
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

  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, design: true },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let design: {
    frontImage?: string;
    backImage?: string;
    templateSpec?: CardTemplateSpec;
    merge?: MergeData;
  } = {};
  try {
    design = JSON.parse(order.design);
  } catch {
    /* fall through to 404 below */
  }

  const shortId = order.id.slice(-8).toUpperCase();
  const filename = `pixcards-${shortId}-${side}-${scale * 300}dpi.png`;
  const headers = (extra: Record<string, string> = {}) => ({
    "Content-Type": "image/png",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "private, no-store",
    ...extra,
  });

  // Best path: re-render from the stored design at the requested scale.
  if (design.templateSpec && design.merge && hasTemplate(design.templateSpec)) {
    try {
      const png = await renderTemplateSidePng(
        design.templateSpec[side],
        design.merge,
        scale,
      );
      return new NextResponse(new Uint8Array(png), { headers: headers() });
    } catch {
      /* fall back to the baked image */
    }
  }

  // Fallback: the artwork baked at order time.
  const value = side === "front" ? design.frontImage : design.backImage;
  if (!value) return NextResponse.json({ error: "No artwork" }, { status: 404 });
  if (!value.startsWith("data:")) return NextResponse.redirect(value);
  const m = /^data:[^;]+;base64,([\s\S]+)$/.exec(value);
  if (!m) return NextResponse.json({ error: "Unsupported" }, { status: 415 });
  return new NextResponse(new Uint8Array(Buffer.from(m[1], "base64")), {
    headers: headers(),
  });
}
