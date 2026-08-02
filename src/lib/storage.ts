import "server-only";
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

/**
 * Image storage abstraction.
 *
 * Providers (chosen from env at load):
 *   - "s3":       MinIO / any S3 (Ryan Cloud). Set S3_ENDPOINT + S3_ACCESS_KEY + S3_SECRET_KEY.
 *   - "supabase": Supabase Storage. Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 *   - "inline":   data-URI fallback (no external dependency).
 * Precedence: STORAGE_PROVIDER override > s3 > supabase > inline.
 */

// ---- Supabase ----
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "pixcards-media";

// ---- MinIO / S3 ----
const S3_ENDPOINT = process.env.S3_ENDPOINT || "";
const S3_BUCKET = process.env.S3_BUCKET || "pixcards-prod";
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || "";
const S3_SECRET_KEY = process.env.S3_SECRET_KEY || "";
// Public read base, INCLUDING the bucket, e.g. https://cdn.example.com/pixcards-prod
const S3_PUBLIC_BASE =
  process.env.S3_PUBLIC_BASE ||
  (S3_ENDPOINT ? `${S3_ENDPOINT.replace(/\/$/, "")}/${S3_BUCKET}` : "");

const s3Configured = Boolean(S3_ENDPOINT && S3_ACCESS_KEY && S3_SECRET_KEY);
const supabaseConfigured = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

export const storageProvider: "s3" | "supabase" | "inline" =
  (process.env.STORAGE_PROVIDER as "s3" | "supabase" | "inline" | undefined) ||
  (s3Configured ? "s3" : supabaseConfigured ? "supabase" : "inline");

function supabaseAdmin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function s3() {
  return new S3Client({
    endpoint: S3_ENDPOINT,
    region: process.env.S3_REGION || "us-east-1",
    forcePathStyle: true, // required for MinIO
    credentials: { accessKeyId: S3_ACCESS_KEY, secretAccessKey: S3_SECRET_KEY },
  });
}

function extFor(contentType: string): string {
  return contentType.split("/")[1]?.replace("jpeg", "jpg") || "bin";
}

/** Ensure the Supabase media bucket exists (no-op for s3/inline — bucket pre-created). */
export async function ensureBucket(): Promise<void> {
  if (storageProvider !== "supabase") return;
  const supabase = supabaseAdmin();
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
  const path = `${ownerId}/${randomUUID()}.${extFor(contentType)}`;

  if (storageProvider === "s3") {
    await s3().send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: path,
        Body: bytes,
        ContentType: contentType,
      }),
    );
    return `${S3_PUBLIC_BASE}/${path}`;
  }

  if (storageProvider === "supabase") {
    const supabase = supabaseAdmin();
    await ensureBucket();
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
