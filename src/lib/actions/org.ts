"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSessionUser, hashPassword } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { appUrl, material, platform } from "@/lib/constants";
import { generateCardCode } from "@/lib/cards";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { validateDiscount, recordRedemption } from "@/lib/discounts";
import { sendOrgInvite } from "@/lib/email/dispatch";
import { recordEvent } from "@/lib/events";
import { analyzeBrand, brandAnalysisEnabled, type BrandSuggestion } from "@/lib/brand-analyze";
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
          brandHeader: org.brandHeader,
          ...(org.company ? { company: org.company } : {}),
        },
      }),
    ),
  );
}

type SharedLink = { platform: string; label: string; url: string };

function parseSharedLinks(json: string): SharedLink[] {
  try {
    const v = JSON.parse(json) as SharedLink[];
    if (Array.isArray(v)) {
      return v
        .filter((l) => l && typeof l.url === "string" && l.url.trim())
        .slice(0, 12)
        .map((l) => ({
          platform: String(l.platform || "custom"),
          label: String(l.label || "").slice(0, 60),
          url: String(l.url).slice(0, 400),
        }));
    }
  } catch {
    /* ignore */
  }
  return [];
}

/** Replace a member's org-locked links with the given set. */
async function applyLinksToMember(userId: string, links: SharedLink[]) {
  const profile = await prisma.profile.findUnique({ where: { userId }, select: { id: true } });
  if (!profile) return;
  await prisma.link.deleteMany({ where: { profileId: profile.id, orgLocked: true } });
  if (links.length === 0) return;
  await prisma.link.createMany({
    data: links.map((l, i) => ({
      profileId: profile.id,
      platform: l.platform,
      label: l.label || platform(l.platform).label,
      url: l.url,
      icon: platform(l.platform).icon,
      position: i,
      orgLocked: true,
    })),
  });
}

/** A member's effective shared links: their department's, else the org's. */
async function resyncMemberLinks(userId: string) {
  const m = await prisma.orgMember.findUnique({
    where: { userId },
    include: {
      org: { select: { sharedLinks: true } },
      department: { select: { sharedLinks: true } },
    },
  });
  if (!m) return;
  const src = m.department?.sharedLinks ?? m.org.sharedLinks;
  await applyLinksToMember(userId, parseSharedLinks(src));
}

/** Re-sync every member in the org, honouring each member's department. */
async function resyncOrgLinks(orgId: string) {
  const org = await prisma.organisation.findUnique({
    where: { id: orgId },
    select: { sharedLinks: true },
  });
  if (!org) return;
  const members = await prisma.orgMember.findMany({
    where: { orgId },
    include: { department: { select: { sharedLinks: true } } },
  });
  await Promise.all(
    members.map((m) =>
      applyLinksToMember(m.userId, parseSharedLinks(m.department?.sharedLinks ?? org.sharedLinks)),
    ),
  );
}

/** Re-sync only the members of one department. */
async function resyncDepartmentLinks(departmentId: string) {
  const dept = await prisma.department.findUnique({
    where: { id: departmentId },
    include: { members: { select: { userId: true } } },
  });
  if (!dept) return;
  const links = parseSharedLinks(dept.sharedLinks);
  await Promise.all(dept.members.map((m) => applyLinksToMember(m.userId, links)));
}

/** Admin sets the shared (locked) links and the member-addable link types. */
export async function updateOrgLinks(input: {
  sharedLinks: SharedLink[];
  allowedLinkTypes: string[];
}): Promise<OrgResult> {
  const { org } = await requireOrg(true);
  const shared = parseSharedLinks(JSON.stringify(input.sharedLinks ?? []));
  const allowed = Array.isArray(input.allowedLinkTypes)
    ? input.allowedLinkTypes.map(String).slice(0, 30)
    : [];
  await prisma.organisation.update({
    where: { id: org.id },
    data: {
      sharedLinks: JSON.stringify(shared),
      allowedLinkTypes: JSON.stringify(allowed),
    },
  });
  await resyncOrgLinks(org.id);
  revalidatePath("/dashboard/org");
  revalidatePath("/dashboard");
  return { ok: true };
}

/* ------------------------------ Departments ------------------------------ */

export type DepartmentData = {
  id: string;
  name: string;
  sharedLinks: string;
  allowedLinkTypes: string;
  memberCount: number;
};

export async function createDepartment(name: string): Promise<OrgResult> {
  const { org } = await requireOrg(true);
  const clean = name.trim().slice(0, 60);
  if (!clean) return { ok: false, error: "Enter a department name." };
  await prisma.department.create({ data: { orgId: org.id, name: clean } });
  revalidatePath("/dashboard/org");
  return { ok: true };
}

export async function updateDepartment(input: {
  id: string;
  name: string;
  sharedLinks: SharedLink[];
  allowedLinkTypes: string[];
}): Promise<OrgResult> {
  const { org } = await requireOrg(true);
  const dept = await prisma.department.findUnique({ where: { id: input.id } });
  if (!dept || dept.orgId !== org.id) return { ok: false, error: "Department not found." };
  const shared = parseSharedLinks(JSON.stringify(input.sharedLinks ?? []));
  const allowed = Array.isArray(input.allowedLinkTypes)
    ? input.allowedLinkTypes.map(String).slice(0, 30)
    : [];
  await prisma.department.update({
    where: { id: input.id },
    data: {
      name: input.name.trim().slice(0, 60) || dept.name,
      sharedLinks: JSON.stringify(shared),
      allowedLinkTypes: JSON.stringify(allowed),
    },
  });
  await resyncDepartmentLinks(input.id);
  revalidatePath("/dashboard/org");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteDepartment(id: string): Promise<OrgResult> {
  const { org } = await requireOrg(true);
  const dept = await prisma.department.findUnique({
    where: { id },
    include: { members: { select: { userId: true } } },
  });
  if (!dept || dept.orgId !== org.id) return { ok: false, error: "Department not found." };
  const affected = dept.members.map((m) => m.userId);
  await prisma.department.delete({ where: { id } }); // members' departmentId → null
  // Re-sync freed members back to the org default links.
  await Promise.all(affected.map((userId) => resyncMemberLinks(userId)));
  revalidatePath("/dashboard/org");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Assign a member to a department (or null to clear) and re-sync their links. */
export async function assignMemberDepartment(
  memberId: string,
  departmentId: string | null,
): Promise<OrgResult> {
  const { org } = await requireOrg(true);
  const member = await prisma.orgMember.findUnique({ where: { id: memberId } });
  if (!member || member.orgId !== org.id) return { ok: false, error: "Member not found." };
  if (departmentId) {
    const dept = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!dept || dept.orgId !== org.id) return { ok: false, error: "Department not found." };
  }
  await prisma.orgMember.update({
    where: { id: memberId },
    data: { departmentId: departmentId || null },
  });
  await resyncMemberLinks(member.userId);
  revalidatePath("/dashboard/org");
  revalidatePath("/dashboard");
  return { ok: true };
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
  brandHeader?: string | null;
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
      // Empty string clears the custom gradient (revert to the preset theme).
      ...(input.brandHeader !== undefined
        ? { brandHeader: input.brandHeader?.trim() ? input.brandHeader.trim() : null }
        : {}),
      ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
    },
  });
  await applyBranding(org.id);
  revalidatePath("/dashboard/org");
  return { ok: true };
}

/** Toggle whether printed team cards use the brand colours / show the NFC logo. */
export async function updateOrgCardOptions(input: {
  cardUseBrand: boolean;
  cardNfcLogo: boolean;
}): Promise<OrgResult> {
  const { org } = await requireOrg(true);
  await prisma.organisation.update({
    where: { id: org.id },
    data: {
      cardUseBrand: Boolean(input.cardUseBrand),
      cardNfcLogo: Boolean(input.cardNfcLogo),
    },
  });
  revalidatePath("/dashboard/org");
  return { ok: true };
}

/** Save the org's front+back card template (JSON design spec). */
export async function updateOrgCardTemplate(specJson: string): Promise<OrgResult> {
  const { org } = await requireOrg(true);
  if (typeof specJson !== "string" || specJson.length > 3_000_000) {
    return { ok: false, error: "That design is too large — try smaller images." };
  }
  try {
    const v = JSON.parse(specJson);
    if (!v || (!v.front && !v.back)) {
      return { ok: false, error: "Invalid card design." };
    }
  } catch {
    return { ok: false, error: "Invalid card design." };
  }
  await prisma.organisation.update({
    where: { id: org.id },
    data: { cardDesign: specJson },
  });
  revalidatePath("/dashboard/org");
  return { ok: true };
}

/* -------------------------- AI brand analysis ---------------------------- */

export type BrandAnalysisResult = {
  ok: boolean;
  suggestion?: BrandSuggestion;
  error?: string;
};

/**
 * Admin uploads brand guidelines (image / PDF / HTML) as a data URL; Claude
 * studies them and returns a palette + closest theme/layout to pre-fill the
 * brand template. The admin still confirms with "Save brand".
 */
export async function analyzeBrandGuidelines(input: {
  dataUrl: string;
}): Promise<BrandAnalysisResult> {
  await requireOrg(true);
  if (!brandAnalysisEnabled()) {
    return {
      ok: false,
      error: "AI brand analysis isn't configured yet (ANTHROPIC_API_KEY).",
    };
  }

  const m = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(input.dataUrl ?? "");
  if (!m) return { ok: false, error: "Could not read that file. Please try again." };
  const mediaType = (m[1] || "").toLowerCase();
  const isBase64 = Boolean(m[2]);
  const payload = m[3] ?? "";

  // Guard against oversized uploads (data URL grows ~33% over the raw bytes).
  if (payload.length > 9_000_000) {
    return { ok: false, error: "That file is too large — keep it under ~6 MB." };
  }

  try {
    let suggestion: BrandSuggestion;
    if (mediaType === "application/pdf") {
      suggestion = await analyzeBrand({ kind: "pdf", base64: payload });
    } else if (mediaType.startsWith("image/")) {
      suggestion = await analyzeBrand({
        kind: "image",
        mediaType,
        base64: payload,
      });
    } else if (mediaType.startsWith("text/") || mediaType.includes("html")) {
      const text = isBase64
        ? Buffer.from(payload, "base64").toString("utf8")
        : decodeURIComponent(payload);
      suggestion = await analyzeBrand({ kind: "html", text });
    } else {
      return {
        ok: false,
        error: "Unsupported file type. Upload a PNG, JPEG, PDF or HTML file.",
      };
    }
    return { ok: true, suggestion };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Brand analysis failed.",
    };
  }
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

  const created = await prisma.user.create({
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
          brandHeader: org.brandHeader,
        },
      },
      orgMembership: { create: { orgId: org.id, role: "MEMBER" } },
    },
  });
  await applyLinksToMember(created.id, parseSharedLinks(org.sharedLinks));
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
    // Already in this org (e.g. added directly) — accept idempotently.
    if (existing.orgId === invite.orgId) {
      await prisma.orgInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });
      revalidatePath("/dashboard/org");
      return { ok: true };
    }
    return {
      ok: false,
      error: "You're already part of another organisation. Leave it first to join this team.",
    };
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
        brandHeader: invite.org.brandHeader,
        ...(invite.org.company ? { company: invite.org.company } : {}),
      },
    }),
  ]);
  await applyLinksToMember(user.id, parseSharedLinks(invite.org.sharedLinks));
  revalidatePath("/dashboard/org");
  return { ok: true };
}

/* ------------------------------- Billing --------------------------------- */

export type BillingResult = { ok: boolean; url?: string; error?: string };

/** Start a per-seat subscription (Stripe Checkout), or activate in demo mode. */
export async function startOrgSubscription(): Promise<BillingResult> {
  const { user, org } = await requireOrg(true);
  const seats = Math.max(1, await prisma.orgMember.count({ where: { orgId: org.id } }));
  const priceId = process.env.STRIPE_ORG_SEAT_PRICE_ID;

  if (stripeEnabled && stripe && priceId) {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: seats }],
      metadata: { kind: "org", orgId: org.id },
      subscription_data: { metadata: { orgId: org.id } },
      success_url: `${appUrl()}/dashboard/org?subscribed=1`,
      cancel_url: `${appUrl()}/dashboard/org?cancelled=1`,
    });
    return { ok: true, url: session.url ?? undefined };
  }

  // Demo mode — no Stripe price configured; activate so the flow is testable.
  await prisma.organisation.update({
    where: { id: org.id },
    data: { planStatus: "active" },
  });
  revalidatePath("/dashboard/org");
  return { ok: true };
}

/** Open the Stripe billing portal to manage/cancel the subscription. */
export async function openBillingPortal(): Promise<BillingResult> {
  const { org } = await requireOrg(true);
  if (!stripeEnabled || !stripe || !org.stripeCustomerId) {
    return { ok: false, error: "Billing management isn't available yet." };
  }
  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${appUrl()}/dashboard/org`,
  });
  return { ok: true, url: session.url };
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

/** Admin edits a member's core profile details (name lives on the user). */
export async function updateMemberProfile(
  memberId: string,
  fields: {
    name: string;
    jobTitle: string;
    phone: string;
    email: string;
    bio: string;
    location: string;
  },
): Promise<OrgResult> {
  const { org } = await requireOrg(true);
  const member = await prisma.orgMember.findUnique({ where: { id: memberId } });
  if (!member || member.orgId !== org.id) {
    return { ok: false, error: "Member not found." };
  }
  await prisma.user.update({
    where: { id: member.userId },
    data: { name: fields.name.trim().slice(0, 80) || "Member" },
  });
  await prisma.profile.updateMany({
    where: { userId: member.userId },
    data: {
      jobTitle: fields.jobTitle.trim(),
      phone: fields.phone.trim(),
      email: fields.email.trim(),
      bio: fields.bio.trim(),
      location: fields.location.trim(),
    },
  });
  revalidatePath("/dashboard/org");
  return { ok: true };
}

/** Provision pre-linked NFC cards for selected members under one team order. */
export async function orderTeamCards(input: {
  memberIds: string[];
  shipName: string;
  shipAddress: string;
  shipCity: string;
  shipPostal: string;
  shipCountry: string;
  discountCode?: string;
}): Promise<BillingResult> {
  const { org, user } = await requireOrg(true);
  const members = await prisma.orgMember.findMany({
    where: { id: { in: input.memberIds }, orgId: org.id },
    include: { user: { include: { profile: true } } },
  });
  if (members.length === 0) {
    return { ok: false, error: "Select at least one member." };
  }
  if (!input.shipName.trim() || !input.shipAddress.trim()) {
    return { ok: false, error: "Enter a delivery name and address." };
  }
  // Every card needs a role — block the order until each member has one.
  const noTitle = members
    .filter((m) => !m.user.profile?.jobTitle?.trim())
    .map((m) => m.user.name || m.user.email);
  if (noTitle.length > 0) {
    return {
      ok: false,
      error: `Add a job title for ${noTitle.join(", ")} before ordering.`,
    };
  }

  const mat = material(org.cardMaterial);
  let priceCents = mat.priceCents * members.length;

  // Optional discount code.
  let redemption: { codeId: string; amountOffCents: number } | null = null;
  if (input.discountCode?.trim()) {
    const res = await validateDiscount(input.discountCode, "CARD", priceCents, user.id);
    if (!res.valid) {
      return { ok: false, error: res.reason ?? "That code isn't valid." };
    }
    priceCents = res.finalCents;
    redemption = { codeId: res.codeId, amountOffCents: res.amountOffCents };
  }

  const order = await prisma.order.create({
    data: {
      userId: user.id,
      material: org.cardMaterial,
      cardName: org.company || org.name,
      quantity: members.length,
      priceCents,
      design: org.cardDesign,
      status: "PENDING",
      shipName: input.shipName.trim(),
      shipAddress: input.shipAddress.trim(),
      shipCity: input.shipCity.trim(),
      shipPostal: input.shipPostal.trim(),
      shipCountry: input.shipCountry.trim() || "United Kingdom",
    },
  });

  for (const m of members) {
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        await prisma.card.create({
          data: {
            code: generateCardCode(),
            userId: m.userId,
            orderId: order.id,
            material: org.cardMaterial,
            claimedAt: new Date(),
          },
        });
        break;
      } catch {
        // unique code collision — retry
      }
    }
  }

  await recordEvent({
    type: "ORDER_PLACED",
    title: `Team card order (${members.length}) — ${org.name}`,
    meta: { orderId: order.id, orgId: org.id, count: members.length },
  });

  // Take payment via Stripe Checkout (same flow as individual card orders).
  if (stripeEnabled && stripe && priceCents > 0) {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: priceCents,
            product_data: {
              name: `${org.name} — team NFC cards (x${members.length})`,
              description: `${members.length} ${mat.name} for your team`,
            },
          },
        },
      ],
      metadata: {
        kind: "order",
        orderId: order.id,
        ...(redemption
          ? {
              discountCodeId: redemption.codeId,
              discountAmount: String(redemption.amountOffCents),
            }
          : {}),
      },
      success_url: `${appUrl()}/dashboard/org?ordered=1`,
      cancel_url: `${appUrl()}/dashboard/org?cancelled=1`,
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id },
    });
    revalidatePath("/dashboard/org");
    return { ok: true, url: session.url ?? undefined };
  }

  // Demo mode (or fully discounted) — mark paid so the flow is testable.
  await prisma.order.update({ where: { id: order.id }, data: { status: "PAID" } });
  if (redemption) {
    await recordRedemption(redemption.codeId, user.id, "order", redemption.amountOffCents);
  }
  revalidatePath("/dashboard/org");
  return { ok: true };
}
