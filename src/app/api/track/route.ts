import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const VALID = ["VIEW", "TAP", "LINK_CLICK", "SAVE_CONTACT"] as const;
type EventType = (typeof VALID)[number];

export async function POST(req: NextRequest) {
  let body: { profileId?: string; type?: string; linkId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { profileId, type, linkId } = body;
  if (!profileId || !type || !VALID.includes(type as EventType)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    await prisma.analyticsEvent.create({
      data: {
        profileId,
        type: type as EventType,
        linkId: linkId || null,
        referrer: req.headers.get("referer") || null,
      },
    });
  } catch {
    // swallow — analytics should never break the page
  }

  return NextResponse.json({ ok: true });
}
