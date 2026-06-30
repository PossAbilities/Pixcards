import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { appUrl } from "@/lib/constants";
import { renderPerspectiveSide, type PerspectiveDetails } from "@/lib/preset-cards";

export const runtime = "nodejs";

/** Strip the scheme from a URL for display. */
function bareUrl(u: string): string {
  return u.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/**
 * GET /api/card-art/preset/<front|back>
 * Renders the logged-in user's saved card preset, filled from their profile.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ side: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { side } = await params;
  const which = side === "back" ? "back" : "front";

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    include: { links: { where: { platform: "website" }, take: 1 } },
  });
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const profileUrl = profile.username ? `${appUrl()}/u/${profile.username}` : appUrl();
  const websiteLink = profile.links[0]?.url;
  const details: PerspectiveDetails = {
    name: user.name || "Your Name",
    role: profile.jobTitle || "",
    email: profile.email || user.email,
    phone: profile.phone || "",
    website: websiteLink ? bareUrl(websiteLink) : "perspectivestudio.co.uk",
    profileUrl,
    logoUrl: profile.cardLogo,
    logoDark: profile.cardLogoDark,
  };

  try {
    const png = await renderPerspectiveSide(which, details);
    return new NextResponse(new Uint8Array(png), {
      headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=30" },
    });
  } catch {
    return NextResponse.json({ error: "Render failed" }, { status: 500 });
  }
}
