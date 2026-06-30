import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { loadMyCard } from "@/lib/mycard";
import { renderTemplateSidePng } from "@/lib/card-artwork";

export const runtime = "nodejs";

/**
 * GET /api/card-art/my/<front|back>
 * Renders the logged-in user's own editable card design, merged with their
 * profile details. Self only (no admin override — matches "my card").
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ side: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { side } = await params;
  const which = side === "back" ? "back" : "front";

  const card = await loadMyCard(user.id);
  if (!card) return NextResponse.json({ error: "No profile" }, { status: 404 });

  try {
    const png = await renderTemplateSidePng(card.spec[which], card.merge);
    return new NextResponse(new Uint8Array(png), {
      headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=30" },
    });
  } catch {
    return NextResponse.json({ error: "Render failed" }, { status: 500 });
  }
}
