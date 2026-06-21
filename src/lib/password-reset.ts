import "server-only";
import crypto from "crypto";
import { prisma } from "@/lib/db";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 60 minutes

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Issue a single-use reset token for a user. Returns the *raw* token (only ever
 * known here + in the emailed link); the DB stores only its hash.
 */
export async function createResetToken(userId: string): Promise<string> {
  const raw = crypto.randomBytes(32).toString("base64url");
  // Invalidate any outstanding tokens for this user first.
  await prisma.passwordResetToken.deleteMany({ where: { userId, usedAt: null } });
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });
  return raw;
}

/** Return the userId for a valid (unexpired, unused) token, else null. */
export async function verifyResetToken(raw: string): Promise<string | null> {
  if (!raw) return null;
  const token = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(raw) },
  });
  if (!token || token.usedAt || token.expiresAt.getTime() < Date.now()) {
    return null;
  }
  return token.userId;
}

/** Atomically consume a token: returns userId if it was valid, else null. */
export async function consumeResetToken(raw: string): Promise<string | null> {
  if (!raw) return null;
  const token = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(raw) },
  });
  if (!token || token.usedAt || token.expiresAt.getTime() < Date.now()) {
    return null;
  }
  await prisma.passwordResetToken.update({
    where: { id: token.id },
    data: { usedAt: new Date() },
  });
  return token.userId;
}
