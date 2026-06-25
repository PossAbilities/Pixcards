"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSessionUser, hashPassword } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { appUrl } from "@/lib/constants";
import { sendOrgInvite } from "@/lib/email/dispatch";
import { recordEvent } from "@/lib/events";
import type { OrgRole } from "@prisma/client";

export type OrgResult = { ok: boolean; error?: string };

async function uniqueUsername(base: string): Promise<string> {
  const root = slugify(base) || "member";
  let candidate = root;
  let n = 0;
  for (;;) {
    const exists = await prisma.profile.findUnique({
      where: { username: candidate },
    });
    if (!exists) return candidate;
    n += 1;
    candidate = `${root}${n}`;
  }
}

/** The caller's org membership, or throws. Requires admin role when asked. */
async function requireOrg(adminOnly: boolean) {
  const user = await getSessionUser();
  if (!user) throw new Error("Not signed in.");
  const member = await prisma.orgMember.findUnique({
    where: { userId: user.id },
    include: { org: true },
  });
  if (!member) throw new Error("You're not part of an organisation.");
  if (adminOnly && member.role !== "OWNER" && member.role !== "ADMIN") {
    throw new Error("Only organisation admins can do that.");
  }
  return { user, member, org: member.org };
}

/** Push the org's brand to every member's profile (locked branding). */
async function applyBranding(orgId: string) {
  const org = await prisma.organisation.findUnique({ where: { id: orgId } });
  if (!org) return;
  const members = await prisma.orgMember.findMany({ where: { orgId } });
  await Promise.all(
    members.map((m) =>
      prisma.profile.updateMany({
        where: { userId: m.userId },
        data: {
          theme: org.theme,
          template: org.template,
          accentColor: org.accentColor,
          ...(org.company ? { company: org.company } : {}),
        },
      }),
    ),
  );
}

export async function createOrganisation(name: string): Promise<OrgResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const clean = name.trim().slice(0, 80);
  if (!clean) return { ok: false, error: "Enter an organisation name." };

  const existing = await prisma.orgMember.findUnique({
    where: { userId: user.id },
  });
  if (existing) {
    return { ok: false, error: "You're already part of an organisation." };
  }

  await prisma.organisation.create({
    data: {
      name: clean,
      company: clean,
      members: { create: { userId: user.id, role: "OWNER" } },
    },
  });
  await recordEvent({
    type: "SECURITY",
    title: `Organisation created: ${clean}`,
    meta: { userId: user.id },
  });
  revalidatePath("/dashboard/org");
  return { ok: true };
}

export async function updateOrgBranding(input: {
  name: string;
  company: string;
  theme: string;
  template: string;
  accentColor: string;
  logoUrl?: string | null;
}): Promise<OrgResult> {
  const { org } = await requireOrg(true);
  await prisma.organisation.update({
    where: { id: org.id },
    data: {
      name: input.name.trim().slice(0, 80) || org.name,
      company: input.company.trim().slice(0, 80),
      theme: input.theme,
      template: input.template,
      accentColor: input.accentColor,
      ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
    },
  });
  await applyBranding(org.id);
  revalidatePath("/dashboard/org");
  return { ok: true };
}

/** Create a member account + profile directly under the org branding. */
export async function addMemberDirect(input: {
  name: string;
  email: string;
  jobTitle?: string;
  phone?: string;
}): Promise<OrgResult> {
  const { org } = await requireOrg(true);
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!name || !email) return { ok: false, error: "Name and email required." };

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return {
      ok: false,
      error: "Someone with that email already has an account — invite them instead.",
    };
  }

  const username = await uniqueUsername(name);
  // Random password — the member can set their own via 'forgot password'.
  const passwordHash = await hashPassword(crypto.randomBytes(18).toString("base64url"));

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      profile: {
        create: {
          username,
          email,
          jobTitle: input.jobTitle?.trim() || "",
          phone: input.phone?.trim() || "",
          company: org.company,
          theme: org.theme,
          template: org.template,
          accentColor: org.accentColor,
        },
      },
      orgMembership: { create: { orgId: org.id, role: "MEMBER" } },
    },
  });
  revalidatePath("/dashboard/org");
  return { ok: true };
}

export async function inviteMember(
  email: string,
  role: OrgRole = "MEMBER",
): Promise<OrgResult> {
  const { org } = await requireOrg(true);
  const clean = email.trim().toLowerCase();
  if (!clean.includes("@")) return { ok: false, error: "Enter a valid email." };

  const rawToken = crypto.randomBytes(24).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  await prisma.orgInvite.create({
    data: {
      orgId: org.id,
      email: clean,
      role: role === "ADMIN" ? "ADMIN" : "MEMBER",
      tokenHash,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  const url = `${appUrl()}/org/join/${rawToken}`;
  await sendOrgInvite(clean, org.name, url);
  revalidatePath("/dashboard/org");
  return { ok: true };
}

export async function acceptOrgInvite(rawToken: string): Promise<OrgResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in to accept the invite." };

  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const invite = await prisma.orgInvite.findUnique({
    where: { tokenHash },
    include: { org: true },
  });
  if (!invite || invite.acceptedAt || invite.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "This invite is invalid or has expired." };
  }

  const existing = await prisma.orgMember.findUnique({
    where: { userId: user.id },
  });
  if (existing) {
    return { ok: false, error: "You're already part of an organisation." };
  }

  await prisma.$transaction([
    prisma.orgMember.create({
      data: { orgId: invite.orgId, userId: user.id, role: invite.role },
    }),
    prisma.orgInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    }),
    prisma.profile.updateMany({
      where: { userId: user.id },
      data: {
        theme: invite.org.theme,
        template: invite.org.template,
        accentColor: invite.org.accentColor,
        ...(invite.org.company ? { company: invite.org.company } : {}),
      },
    }),
  ]);
  revalidatePath("/dashboard/org");
  return { ok: true };
}

export async function removeMember(memberId: string): Promise<OrgResult> {
  const { org, user } = await requireOrg(true);
  const member = await prisma.orgMember.findUnique({ where: { id: memberId } });
  if (!member || member.orgId !== org.id) {
    return { ok: false, error: "Member not found." };
  }
  if (member.userId === user.id) {
    return { ok: false, error: "You can't remove yourself." };
  }
  if (member.role === "OWNER") {
    return { ok: false, error: "You can't remove the owner." };
  }
  await prisma.orgMember.delete({ where: { id: memberId } });
  revalidatePath("/dashboard/org");
  return { ok: true };
}

export async function revokeInvite(inviteId: string): Promise<OrgResult> {
  const { org } = await requireOrg(true);
  const invite = await prisma.orgInvite.findUnique({ where: { id: inviteId } });
  if (!invite || invite.orgId !== org.id) {
    return { ok: false, error: "Invite not found." };
  }
  await prisma.orgInvite.delete({ where: { id: inviteId } });
  revalidatePath("/dashboard/org");
  return { ok: true };
}
