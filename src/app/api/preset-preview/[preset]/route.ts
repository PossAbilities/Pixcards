import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { presetSpec, CARD_PRESETS } from "@/lib/preset-cards";
import { renderTemplateSidePng } from "@/lib/card-artwork";

export const runtime = "nodejs";

/**
 * GET /api/preset-preview/<preset>?side=front|back
 * A small, cacheable PNG thumbnail of a built-in card design, used by the
 * registration design picker. Presets are code-defined, so the output is the
 * same for everyone and can be cached hard.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ preset: string }> },
) {
  const { preset } = await params;
  if (!(CARD_PRESETS as readonly string[]).includes(preset)) {
    return NextResponse.json({ error: "Unknown design" }, { status: 404 });
  }
  const side = req.nextUrl.searchParams.get("side") === "back" ? "back" : "front";
  const spec = await presetSpec(preset);
  const merge = {
    name: "Alex Taylor",
    jobTitle: "Team Leader",
    company: "",
    url: "https://possabilities.org.uk",
    email: "alex.taylor@possabilities.org.uk",
    phone: "01234 567 890",
    location: "Greater Manchester",
  };
  const full = await renderTemplateSidePng(side === "front" ? spec.front : spec.back, merge, 1);
  const thumb = await sharp(full).resize(560).png().toBuffer();
  return new NextResponse(new Uint8Array(thumb), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
