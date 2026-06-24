"use server";

import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { runAudit, type Finding } from "@/lib/security/audit";
import { recordEvent } from "@/lib/events";
import { migrateImagesToStorage } from "@/lib/actions/storage";

async function requireAdminUser() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") throw new Error("Forbidden");
  return user;
}

const DEMO_EMAILS = [
  "admin@pixcards.app",
  "alex@pixcards.app",
  "eleanor@company.com",
  "derek@agency.io",
  "catherine@financials.com",
  "marcus@thorne.co",
  "sarah@sands.design",
];

export async function runSecurityAudit(): Promise<Finding[]> {
  await requireAdminUser();
  return runAudit();
}

export type RepairResult = { ok: boolean; message?: string; error?: string };

/** Safe, idempotent repairs keyed by the finding's fixId. */
export async function applyRepair(fixId: string): Promise<RepairResult> {
  const admin = await requireAdminUser();

  try {
    switch (fixId) {
      case "purge-demo-accounts": {
        const removable = DEMO_EMAILS.filter(
          (e) => e.toLowerCase() !== admin.email.toLowerCase(),
        );
        const res = await prisma.user.deleteMany({
          where: { email: { in: removable } },
        });
        await audit("Demo accounts removed", { count: res.count });
        return { ok: true, message: `Removed ${res.count} demo account(s).` };
      }

      case "downgrade-expired-pro": {
        const res = await prisma.user.updateMany({
          where: { plan: "PRO", proUntil: { lt: new Date() } },
          data: { plan: "FREE", proUntil: null, proComplimentary: false },
        });
        await audit("Expired Pro users downgraded", { count: res.count });
        return { ok: true, message: `Downgraded ${res.count} user(s).` };
      }

      case "deactivate-expired-discounts": {
        const res = await prisma.discountCode.updateMany({
          where: { active: true, expiresAt: { lt: new Date() } },
          data: { active: false },
        });
        await audit("Expired discount codes deactivated", { count: res.count });
        return { ok: true, message: `Deactivated ${res.count} code(s).` };
      }

      case "purge-reset-tokens": {
        const res = await prisma.passwordResetToken.deleteMany({
          where: {
            OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }],
          },
        });
        return { ok: true, message: `Cleared ${res.count} token(s).` };
      }

      case "migrate-images": {
        const res = await migrateImagesToStorage();
        if (!res.ok) return { ok: false, error: res.error };
        return {
          ok: true,
          message: `Migrated ${res.profiles ?? 0} profile(s) and ${res.orders ?? 0} order(s).`,
        };
      }

      default:
        return { ok: false, error: "That issue has no automatic repair." };
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Repair failed.",
    };
  }
}

async function audit(title: string, meta: Record<string, unknown>) {
  await recordEvent({ type: "SECURITY", severity: "info", title, meta });
}
