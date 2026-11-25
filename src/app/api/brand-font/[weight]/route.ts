import { NextRequest, NextResponse } from "next/server";
import {
  AVENIR_REGULAR_B64,
  AVENIR_MEDIUM_B64,
  AVENIR_HEAVY_B64,
} from "@/lib/fonts/avenir";

export const runtime = "nodejs";

/**
 * GET /api/brand-font/<regular|medium|heavy>
 * Serves the subset Avenir TTF for the public PossAbilities profiles'
 * @font-face. Font bytes are code-constant, so cache them hard.
 */
const FONTS: Record<string, string> = {
  regular: AVENIR_REGULAR_B64,
  medium: AVENIR_MEDIUM_B64,
  heavy: AVENIR_HEAVY_B64,
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ weight: string }> },
) {
  const { weight } = await params;
  const b64 = FONTS[weight];
  if (!b64) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(new Uint8Array(Buffer.from(b64, "base64")), {
    headers: {
      "Content-Type": "font/ttf",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
