import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

/** GET /api/qr?data=<url>&color=<hex>  -> SVG QR code */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const data = searchParams.get("data");
  const color = searchParams.get("color") || "#191c1e";
  if (!data) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  const svg = await QRCode.toString(data, {
    type: "svg",
    margin: 1,
    width: 320,
    color: { dark: color, light: "#00000000" },
    errorCorrectionLevel: "M",
  });

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
