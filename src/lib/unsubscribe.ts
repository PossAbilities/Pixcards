import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { appUrl } from "@/lib/constants";

// Signed, non-expiring token so the link in any marketing email keeps working.
// Uses a key derived separately from the session key, so an unsubscribe link
// can never be replayed as a login cookie.
const secret = new TextEncoder().encode(
  `${process.env.AUTH_SECRET || "dev-secret-change-me"}:unsubscribe-v1`,
);
const PURPOSE = "unsubscribe";

export async function unsubscribeUrl(userId: string): Promise<string> {
  const token = await new SignJWT({ uid: userId, p: PURPOSE })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .sign(secret);
  return `${appUrl()}/unsubscribe?token=${encodeURIComponent(token)}`;
}

export async function verifyUnsubscribeToken(token: string): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.p !== PURPOSE || typeof payload.uid !== "string") return null;
    return payload.uid;
  } catch {
    return null;
  }
}
