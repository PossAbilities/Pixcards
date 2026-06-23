import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Serve a profile's saved avatar/header as a normal cacheable image instead of
 * inlining a (potentially multi-MB) data-URI into the page HTML + hydration
 * payload — which otherwise crashes mobile Safari on image-heavy cards.
 *
 * GET /api/img/avatar/<profileId>   GET /api/img/header/<profileId>
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ kind: string; id: string }> },
) {
  const { kind, id } = await params;
  if (kind !== "avatar" && kind !== "header") {
    return NextResponse.json({ error: "Bad kind" }, { status: 400 });
  }

  const profile = await prisma.profile.findUnique({
    where: { id },
    select: { avatarUrl: true, headerUrl: true },
  });
  const value = kind === "avatar" ? profile?.avatarUrl : profile?.headerUrl;
  if (!value) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Already a real URL → just redirect to it.
  if (!value.startsWith("data:")) {
    return NextResponse.redirect(value);
  }

  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(value);
  if (!match) {
    return NextResponse.json({ error: "Unsupported" }, { status: 415 });
  }
  const [, contentType, b64] = match;
  const bytes = Buffer.from(b64, "base64");
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
    },
  });
}
