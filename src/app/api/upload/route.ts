import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

const MAX_BYTES = 2 * 1024 * 1024; // 2MB (stored inline as a data URI)
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Accepts an image and returns it as a data URI. Storing images inline keeps
 * the app free of a separate object-storage dependency, so uploads work the
 * same in local dev and on serverless hosts (Netlify) with a read-only
 * filesystem. For high-volume production, swap this for S3/R2/Netlify Blobs.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Use JPG, PNG, WEBP or GIF." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large (max 2MB)." },
      { status: 400 },
    );
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const url = `data:${file.type};base64,${base64}`;
  return NextResponse.json({ url });
}
