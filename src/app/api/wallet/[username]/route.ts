import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { appUrl } from "@/lib/constants";
import { isWalletConfigured, buildWalletPass, type WalletStrip } from "@/lib/wallet/pass";
import {
  renderTemplateSidePng,
  renderWalletStripSet,
  firstHex,
  dominantHex,
  hexDistance,
} from "@/lib/card-artwork";
import { hasTemplate, parseTemplate, type MergeData } from "@/lib/card-template";
import { presetSpec, CARD_PRESETS } from "@/lib/preset-cards";

export const runtime = "nodejs";

/** Fetch an avatar (data URI or remote URL) into a Buffer for the pass thumbnail. */
async function loadThumbnail(avatarUrl: string | null): Promise<Buffer | null> {
  if (!avatarUrl) return null;
  try {
    if (avatarUrl.startsWith("data:")) {
      const base64 = avatarUrl.split(",")[1] ?? "";
      return Buffer.from(base64, "base64");
    }
    const res = await fetch(avatarUrl);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  if (!isWalletConfigured()) {
    return NextResponse.json(
      { error: "Apple Wallet passes are not configured yet." },
      { status: 503 },
    );
  }

  const { username } = await params;
  const profile = await prisma.profile.findUnique({
    where: { username },
    include: { user: { select: { id: true, name: true, email: true } } },
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

  const profileUrl = `${appUrl()}/u/${profile.username}`;

  // When the user has a designed/branded card, render its front as the pass
  // strip so the Wallet card mirrors the printed one. Resolve the spec the
  // same way the rest of the app does: a saved design if present, else the
  // seeded default for anyone who has the preset attached. Plain accounts
  // (no preset, no saved design) keep the simple themed pass. Never fatal —
  // fall back to the plain pass if rendering fails.
  let strip: WalletStrip | null = null;
  let backgroundHex: string | null = null;
  const onPreset =
    profile.cardPreset != null &&
    (CARD_PRESETS as readonly string[]).includes(profile.cardPreset);
  const saved = parseTemplate(profile.cardDesign);
  const spec = onPreset
    ? await presetSpec(profile.cardPreset)
    : hasTemplate(saved)
      ? saved
      : profile.cardPreset
        ? await presetSpec(profile.cardPreset)
        : null;
  if (spec) {
    try {
      const merge: MergeData = {
        name: profile.user.name || "Your Name",
        jobTitle: profile.jobTitle || "",
        company: profile.company || "",
        url: profileUrl,
        email: profile.email || profile.user.email,
        phone: profile.phone || "",
        location: profile.location || "",
      };
      // Use whichever card side's colour best matches the brand background,
      // so the banner blends into the pass (navy front for Perspective, the
      // purple wordmark back for PossAbilities) rather than sitting in
      // clashing letterbox bars.
      const [front, back] = await Promise.all([
        renderTemplateSidePng(spec.front, merge, 2),
        renderTemplateSidePng(spec.back, merge, 2),
      ]);
      const target = firstHex(profile.brandHeader) || profile.accentColor || "#12142f";
      const [frontHex, backHex] = await Promise.all([
        dominantHex(front),
        dominantHex(back),
      ]);
      const useFront = hexDistance(frontHex, target) <= hexDistance(backHex, target);
      const chosen = useFront ? front : back;
      backgroundHex = useFront ? frontHex : backHex;
      strip = await renderWalletStripSet(chosen, backgroundHex);
    } catch (e) {
      console.error("wallet strip render failed", e);
    }
  }

  try {
    const buffer = await buildWalletPass({
      serial: profile.id,
      name: profile.user.name,
      jobTitle: profile.jobTitle || undefined,
      company: profile.company || undefined,
      themeId: profile.theme,
      profileUrl,
      email: profile.email || undefined,
      phone: profile.phone || undefined,
      thumbnail: await loadThumbnail(profile.avatarUrl),
      strip,
      backgroundHex,
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": `attachment; filename="${profile.username}.pkpass"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("wallet pass error", err);
    return NextResponse.json(
      { error: "Could not generate the wallet pass." },
      { status: 500 },
    );
  }
}
