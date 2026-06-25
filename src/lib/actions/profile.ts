"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import {
  platform,
  theme as getTheme,
  THEMES,
  CARD_TEMPLATES,
} from "@/lib/constants";
import { slugify } from "@/lib/utils";

async function myProfile() {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
  });
  if (!profile) throw new Error("Profile not found");
  return { user, profile };
}

const profileSchema = z.object({
  name: z.string().min(1).max(60),
  jobTitle: z.string().max(80).optional().default(""),
  company: z.string().max(80).optional().default(""),
  bio: z.string().max(300).optional().default(""),
  location: z.string().max(80).optional().default(""),
  phone: z.string().max(40).optional().default(""),
  email: z.string().max(120).optional().default(""),
  username: z.string().min(3).max(32),
});

export type ActionResult = { ok: boolean; error?: string };

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const { user, profile } = await myProfile();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const username = slugify(d.username);
  if (username.length < 3) {
    return { ok: false, error: "Username must be at least 3 characters." };
  }

  // ensure username unique (allow own)
  const clash = await prisma.profile.findFirst({
    where: { username, NOT: { id: profile.id } },
  });
  if (clash) {
    return { ok: false, error: "That username is already taken." };
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { name: d.name } }),
    prisma.profile.update({
      where: { id: profile.id },
      data: {
        username,
        jobTitle: d.jobTitle,
        company: d.company,
        bio: d.bio,
        location: d.location,
        phone: d.phone,
        email: d.email,
      },
    }),
  ]);

  revalidatePath(`/u/${username}`);
  return { ok: true };
}

export async function updateImages(input: {
  avatarUrl?: string;
  headerUrl?: string;
}): Promise<ActionResult> {
  const { profile } = await myProfile();
  await prisma.profile.update({
    where: { id: profile.id },
    data: {
      ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
      ...(input.headerUrl !== undefined ? { headerUrl: input.headerUrl } : {}),
    },
  });
  revalidatePath(`/u/${profile.username}`);
  return { ok: true };
}

export async function setTheme(themeId: string): Promise<ActionResult> {
  const { user, profile } = await myProfile();
  if (await prisma.orgMember.findUnique({ where: { userId: user.id } })) {
    return { ok: false, error: "Your organisation manages card branding." };
  }
  const t = getTheme(themeId);
  if (!THEMES.find((x) => x.id === themeId)) {
    return { ok: false, error: "Unknown theme." };
  }
  if (t.pro && user.plan !== "PRO") {
    return { ok: false, error: "This theme is a Pro feature. Upgrade to unlock." };
  }
  await prisma.profile.update({
    where: { id: profile.id },
    data: { theme: themeId, accentColor: t.accent },
  });
  revalidatePath(`/u/${profile.username}`);
  return { ok: true };
}

export async function setTemplate(templateId: string): Promise<ActionResult> {
  const { user, profile } = await myProfile();
  if (await prisma.orgMember.findUnique({ where: { userId: user.id } })) {
    return { ok: false, error: "Your organisation manages card branding." };
  }
  const tpl = CARD_TEMPLATES.find((x) => x.id === templateId);
  if (!tpl) {
    return { ok: false, error: "Unknown template." };
  }
  if (tpl.pro && user.plan !== "PRO") {
    return {
      ok: false,
      error: "This template is a Pro feature. Upgrade to unlock.",
    };
  }
  await prisma.profile.update({
    where: { id: profile.id },
    data: { template: templateId },
  });
  revalidatePath(`/u/${profile.username}`);
  return { ok: true };
}

const FREE_LINK_LIMIT = 5;

const linkSchema = z.object({
  platform: z.string().min(1),
  label: z.string().min(1).max(60),
  url: z.string().min(1).max(300),
});

function normalizeUrl(platformId: string, raw: string): string {
  const p = platform(platformId);
  const value = raw.trim();
  if (p.prefix && !value.startsWith(p.prefix)) {
    return `${p.prefix}${value}`;
  }
  if (!p.prefix && !/^https?:\/\//i.test(value) && !value.startsWith("mailto:") && !value.startsWith("tel:")) {
    return `https://${value}`;
  }
  return value;
}

export async function addLink(formData: FormData): Promise<ActionResult> {
  const { user, profile } = await myProfile();
  const parsed = linkSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid link" };
  }

  const count = await prisma.link.count({ where: { profileId: profile.id } });
  if (user.plan !== "PRO" && count >= FREE_LINK_LIMIT) {
    return {
      ok: false,
      error: `Free plan is limited to ${FREE_LINK_LIMIT} links. Upgrade to Pro for unlimited links.`,
    };
  }

  const p = platform(parsed.data.platform);
  await prisma.link.create({
    data: {
      profileId: profile.id,
      platform: parsed.data.platform,
      label: parsed.data.label,
      url: normalizeUrl(parsed.data.platform, parsed.data.url),
      icon: p.icon,
      position: count,
    },
  });
  revalidatePath(`/u/${profile.username}`);
  return { ok: true };
}

export async function updateLink(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const { profile } = await myProfile();
  const link = await prisma.link.findFirst({
    where: { id, profileId: profile.id },
  });
  if (!link) return { ok: false, error: "Link not found." };
  const parsed = linkSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid link" };
  }
  const p = platform(parsed.data.platform);
  await prisma.link.update({
    where: { id },
    data: {
      platform: parsed.data.platform,
      label: parsed.data.label,
      url: normalizeUrl(parsed.data.platform, parsed.data.url),
      icon: p.icon,
    },
  });
  revalidatePath(`/u/${profile.username}`);
  return { ok: true };
}

export async function deleteLink(id: string): Promise<ActionResult> {
  const { profile } = await myProfile();
  await prisma.link.deleteMany({ where: { id, profileId: profile.id } });
  revalidatePath(`/u/${profile.username}`);
  return { ok: true };
}

export async function reorderLinks(orderedIds: string[]): Promise<ActionResult> {
  const { profile } = await myProfile();
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.link.updateMany({
        where: { id, profileId: profile.id },
        data: { position: index },
      }),
    ),
  );
  revalidatePath(`/u/${profile.username}`);
  return { ok: true };
}

export async function togglePublished(published: boolean): Promise<ActionResult> {
  const { profile } = await myProfile();
  await prisma.profile.update({
    where: { id: profile.id },
    data: { published },
  });
  revalidatePath(`/u/${profile.username}`);
  return { ok: true };
}
