import { ImageResponse } from "next/og";
import { OG_SIZE, OgLogo, ogFonts } from "@/lib/og";

export const alt = "Pixcards — digital business cards with NFC and QR";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "linear-gradient(135deg, #4f46e5 0%, #3525cd 100%)",
          color: "#ffffff",
          fontFamily: "Body",
        }}
      >
        <OgLogo />
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontFamily: "Montserrat", fontSize: 76, lineHeight: 1.05, letterSpacing: -2, maxWidth: 900 }}>
            The last business card you&apos;ll ever need.
          </div>
          <div style={{ fontSize: 32, color: "#e2dfff", maxWidth: 860 }}>
            Share your details with a tap or a scan, and update them any time.
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: ogFonts() },
  );
}
