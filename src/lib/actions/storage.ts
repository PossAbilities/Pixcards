"use server";

import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { storageProvider, storeImage } from "@/lib/storage";

async function requireAdminUser() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") throw new Error("Forbidden");
  return user;
}

export type MigrateResult = {
  ok: boolean;
  error?: string;
  profiles?: number;
  orders?: number;
};

/** Decode a data: URI and push it to storage; returns the new public URL. */
async function moveDataUri(
  value: string | null | undefined,
  ownerId: string,
): Promise<string | null> {
  if (!value || !value.startsWith("data:")) return null;
  const match = /^data:([^;]+);base64,([\s\S]*)$/.exec(value);
  if (!match) return null;
  const [, contentType, b64] = match;
  try {
    const bytes = Buffer.from(b64, "base64");
    const url = await storeImage(bytes, contentType, ownerId);
    return url.startsWith("data:") ? null : url; // null if still inline
  } catch {
    return null;
  }
}

type OrderDesign = {
  frontImage?: string;
  backImage?: string;
  [k: string]: unknown;
};

/**
 * Move any inline data-URI images already in the database (profile avatars +
 * headers, and card order artwork) into Supabase Storage, replacing them with
 * lightweight CDN URLs. Idempotent — safe to run repeatedly.
 */
export async function migrateImagesToStorage(): Promise<MigrateResult> {
  await requireAdminUser();
  if (storageProvider !== "supabase") {
    return {
      ok: false,
      error:
        "Storage isn't configured yet. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.",
    };
  }

  // --- Profiles (avatar + header) ---
  let profileCount = 0;
  const profiles = await prisma.profile.findMany({
    where: {
      OR: [
        { avatarUrl: { startsWith: "data:" } },
        { headerUrl: { startsWith: "data:" } },
      ],
    },
    select: { id: true, userId: true, avatarUrl: true, headerUrl: true },
  });
  for (const p of profiles) {
    const data: { avatarUrl?: string; headerUrl?: string } = {};
    const newAvatar = await moveDataUri(p.avatarUrl, p.userId);
    if (newAvatar) data.avatarUrl = newAvatar;
    const newHeader = await moveDataUri(p.headerUrl, p.userId);
    if (newHeader) data.headerUrl = newHeader;
    if (Object.keys(data).length) {
      await prisma.profile.update({ where: { id: p.id }, data });
      profileCount++;
    }
  }

  // --- Orders (card artwork inside the design JSON) ---
  let orderCount = 0;
  const orders = await prisma.order.findMany({
    where: { design: { contains: "data:" } },
    select: { id: true, userId: true, design: true },
  });
  for (const o of orders) {
    let design: OrderDesign;
    try {
      design = JSON.parse(o.design) as OrderDesign;
    } catch {
      continue;
    }
    let changed = false;
    const front = await moveDataUri(design.frontImage, o.userId);
    if (front) {
      design.frontImage = front;
      changed = true;
    }
    const back = await moveDataUri(design.backImage, o.userId);
    if (back) {
      design.backImage = back;
      changed = true;
    }
    if (changed) {
      await prisma.order.update({
        where: { id: o.id },
        data: { design: JSON.stringify(design) },
      });
      orderCount++;
    }
  }

  return { ok: true, profiles: profileCount, orders: orderCount };
}
