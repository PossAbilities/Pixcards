import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { appUrl } from "@/lib/constants";
import { renderCardSide } from "@/lib/card-artwork";
import { parseTemplate } from "@/lib/card-template";

export const runtime = "nodejs";

/**
 * GET /api/card-art/<cardId>
 * Bakes (and returns) the print-ready PNG for a single card: the member's
 * details + QR on the org brand background, with the NFC logo if enabled.
 * Visible to an admin or the card's owner — used to preview/confirm the
 * design on the order page and in "My cards".
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getSessionUser();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const { id } = await params;
  const side = req.nextUrl.searchParams.get("side") === "back" ? "back" : "front";

  const card = await prisma.card.findUnique({
    where: { id },
    include: {
      user: {
        include: {
          profile: true,
          orgMembership: { include: { org: true } },
        },
      },
    },
  });
  if (!card || !card.user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (viewer.role !== "ADMIN" && viewer.id !== card.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const p = card.user.profile;
  const org = card.user.orgMembership?.org;
  const useBrand = org?.cardUseBrand ?? true;
  const nfcLogo = org?.cardNfcLogo ?? false;
  const template = parseTemplate(org?.cardDesign);
  const profileUrl = p?.username ? `${appUrl()}/u/${p.username}` : appUrl();

  try {
    const png = await renderCardSide({
      side,
      template,
      name: card.user.name ?? "Member",
      jobTitle: p?.jobTitle,
      company: p?.company,
      accentColor: p?.accentColor ?? "#4f46e5",
      brandHeader: useBrand ? p?.brandHeader : null,
      profileUrl,
      nfcLogo,
    });
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return NextResponse.json({ error: "Render failed" }, { status: 500 });
  }
}
