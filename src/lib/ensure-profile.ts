import "server-only";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";

/**
 * Every account should have a profile, but if one is ever missing (an
 * interrupted sign-up, a manual DB edit) create it rather than bouncing the
 * user between /dashboard and /login.
 */
export async function ensureProfile(userId: string, name: string): Promise<void> {
  const exists = await prisma.profile.findUnique({ where: { userId }, select: { id: true } });
  if (exists) return;
  const root = slugify(name) || "user";
  let username = root;
  for (let n = 1; await prisma.profile.findUnique({ where: { username }, select: { id: true } }); n++) {
    username = `${root}${n}`;
  }
  await prisma.profile.create({ data: { userId, username } });
}
