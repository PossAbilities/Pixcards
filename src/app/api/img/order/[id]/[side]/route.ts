import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * Serve a card order's front/back artwork as a normal image instead of inlining
 * a multi-MB data-URI into the admin order page (which crashes the tab on
 * re-render). Restricted to the order's owner or an admin.
 *
 * GET /api/img/order/<orderId>/front   GET /api/img/order/<orderId>/back
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; side: string }> },
) {
  const { id, side } = await params;
  if (side !== "front" && side !== "back") {
    return NextResponse.json({ error: "Bad side" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    select: { userId: true, design: true },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const viewer = await getSessionUser();
  if (!viewer || (viewer.role !== "ADMIN" && viewer.id !== order.userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let design: { frontImage?: string; backImage?: string };
  try {
    design = JSON.parse(order.design);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const value = side === "front" ? design.frontImage : design.backImage;
  if (!value) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!value.startsWith("data:")) return NextResponse.redirect(value);

  const m = /^data:([^;]+);base64,([\s\S]+)$/.exec(value);
  if (!m) return NextResponse.json({ error: "Unsupported" }, { status: 415 });
  const [, contentType, b64] = m;
  const bytes = Buffer.from(b64, "base64");
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=300",
    },
  });
}
