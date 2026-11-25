import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { renderTemplateSidePng } from "@/lib/card-artwork";
import type { SideSpec, MergeData } from "@/lib/card-template";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/card-render  (any signed-in user)
 * Body: { side: SideSpec, merge: MergeData, scale?: 1|2 }
 * Returns a PNG of that card side rendered by the SAME engine that produces
 * the print artwork — so the live designer preview matches the print output
 * exactly (browser text rendering can't match the server's font engine).
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  let body: { side?: SideSpec; merge?: MergeData; scale?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }
  const side = body.side;
  if (!side || !Array.isArray(side.elements)) {
    return NextResponse.json({ error: "Missing side" }, { status: 400 });
  }
  const scale = Math.min(2, Math.max(1, Number(body.scale) || 1));
  try {
    const png = await renderTemplateSidePng(side, body.merge ?? ({} as MergeData), scale);
    return new NextResponse(new Uint8Array(png), {
      headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Render failed" }, { status: 500 });
  }
}
