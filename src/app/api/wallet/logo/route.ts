import { NextResponse } from "next/server";
import { LOGO_PNG_BASE64 } from "@/lib/wallet/assets";

export const runtime = "nodejs";

/** Public PNG logo for Google Wallet passes (needs a fetchable image URL). */
export async function GET() {
  const buf = Buffer.from(LOGO_PNG_BASE64, "base64");
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
