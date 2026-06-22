import "server-only";
import crypto from "crypto";
import { prisma } from "@/lib/db";

const PREFIX = "pix_live_";

export function hashApiKey(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/** Generate a new API key. Returns the raw key (shown once) + storable fields. */
export function generateApiKey(): {
  raw: string;
  keyHash: string;
  prefix: string;
} {
  const secret = crypto.randomBytes(24).toString("base64url");
  const raw = `${PREFIX}${secret}`;
  return { raw, keyHash: hashApiKey(raw), prefix: raw.slice(0, PREFIX.length + 4) };
}

/** Pull the bearer/x-api-key value from a request. */
function extractKey(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim();
  const x = req.headers.get("x-api-key");
  return x ? x.trim() : null;
}

/**
 * Authenticate a monitoring request. Returns true when a valid, non-revoked key
 * is presented; also stamps lastUsedAt.
 */
export async function authenticateApiKey(req: Request): Promise<boolean> {
  const raw = extractKey(req);
  if (!raw) return false;
  const key = await prisma.apiKey.findUnique({
    where: { keyHash: hashApiKey(raw) },
  });
  if (!key || key.revokedAt) return false;
  // Best-effort usage stamp.
  prisma.apiKey
    .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});
  return true;
}
