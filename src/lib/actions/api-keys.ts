"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateApiKey } from "@/lib/api-keys";

async function requireAdminUser() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") throw new Error("Forbidden");
  return user;
}

export type CreateKeyResult =
  | { ok: true; rawKey: string }
  | { ok: false; error: string };

/** Create a key and return the raw value ONCE (never retrievable again). */
export async function createApiKey(name: string): Promise<CreateKeyResult> {
  await requireAdminUser();
  const { raw, keyHash, prefix } = generateApiKey();
  await prisma.apiKey.create({
    data: { name: name.trim().slice(0, 40) || "Monitoring", keyHash, prefix },
  });
  revalidatePath("/admin/api");
  return { ok: true, rawKey: raw };
}

export async function revokeApiKey(id: string): Promise<{ ok: boolean }> {
  await requireAdminUser();
  await prisma.apiKey.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
  revalidatePath("/admin/api");
  return { ok: true };
}

export async function deleteApiKey(id: string): Promise<{ ok: boolean }> {
  await requireAdminUser();
  await prisma.apiKey.delete({ where: { id } });
  revalidatePath("/admin/api");
  return { ok: true };
}
