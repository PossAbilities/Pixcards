import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { appUrl } from "@/lib/constants";
import { isGoogleWalletConfigured, buildGoogleSaveUrl } from "@/lib/wallet/google";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  if (!isGoogleWalletConfigured()) {
    return NextResponse.json(
      { error: "Google Wallet passes are not configured yet." },
      { status: 503 },
    );
  }

  const { username } = await params;
  const profile = await prisma.profile.findUnique({
    where: { username },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!profile.published) {
    const viewer = await getSessionUser();
    if (viewer?.id !== profile.userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  try {
    const base = appUrl();
    const saveUrl = await buildGoogleSaveUrl({
      serial: profile.id,
      name: profile.user.name,
      jobTitle: profile.jobTitle || undefined,
      company: profile.company || undefined,
      themeId: profile.theme,
      profileUrl: `${base}/u/${profile.username}`,
      logoUrl: `${base}/api/wallet/logo`,
      origin: base,
    });
    return NextResponse.redirect(saveUrl);
  } catch (err) {
    console.error("google wallet error", err);
    return NextResponse.json(
      { error: "Could not generate the Google Wallet pass." },
      { status: 500 },
    );
  }
}
