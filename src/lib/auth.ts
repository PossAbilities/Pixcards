import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import type { Role, Plan } from "@prisma/client";

const COOKIE_NAME = "pix_session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-secret-change-me",
);

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  plan: Plan;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** Returns the full session user (with role/plan), or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    const uid = payload.uid as string;
    if (!uid) return null;
    const user = await prisma.user.findUnique({
      where: { id: uid },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        plan: true,
        proUntil: true,
      },
    });
    if (!user) return null;

    // Lazily expire timed Pro grants (no cron needed on serverless).
    if (
      user.plan === "PRO" &&
      user.proUntil &&
      user.proUntil.getTime() < Date.now()
    ) {
      await prisma.user.update({
        where: { id: user.id },
        data: { plan: "FREE", proUntil: null, proComplimentary: false },
      });
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        plan: "FREE",
      };
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.plan,
    };
  } catch {
    return null;
  }
}

export function isPro(user: { plan: Plan } | null): boolean {
  return user?.plan === "PRO";
}
