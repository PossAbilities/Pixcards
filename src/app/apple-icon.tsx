import { ImageResponse } from "next/og";
import { MARK_SRC } from "@/lib/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <img src={MARK_SRC} width={180} height={180} alt="" />
    ),
    size,
  );
}
