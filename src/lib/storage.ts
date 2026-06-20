import "server-only";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

/**
 * Image storage abstraction.
 *
 * If Supabase Storage is configured (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY),
 * uploads go to a public bucket and a public URL is returned. Otherwise we fall
 * back to an inline data URI so uploads keep working everywhere (local dev and
 * serverless hosts) with zero external dependencies.
 */

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "pixcards-media";

export const storageProvider: "supabase" | "inline" =
  SUPABASE_URL && SERVICE_ROLE_KEY ? "supabase" : "inline";

function admin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Ensure the public media bucket exists (no-op if it already does). */
export async function ensureBucket(): Promise<void> {
  if (storageProvider !== "supabase") return;
  const supabase = admin();
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (!data) {
    await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: "5MB",
    });
  }
}

/** Store an image and return a URL usable in <img src> / CSS url(). */
export async function storeImage(
  bytes: Buffer,
  contentType: string,
  ownerId: string,
): Promise<string> {
  if (storageProvider === "supabase") {
    const supabase = admin();
    await ensureBucket();
    const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") || "bin";
    const path = `${ownerId}/${randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType, upsert: false });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  // Inline fallback.
  return `data:${contentType};base64,${bytes.toString("base64")}`;
}
