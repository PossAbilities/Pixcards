import "server-only";
import { prisma } from "@/lib/db";
import { storageProvider } from "@/lib/storage";

export type Severity = "critical" | "warning" | "info" | "ok";
export type Area = "Security" | "Data" | "Configuration";

export type Finding = {
  id: string;
  area: Area;
  severity: Severity;
  title: string;
  detail: string;
  count?: number;
  /** Present when the issue can be auto-repaired from the dashboard. */
  fixId?: string;
  fixLabel?: string;
};

const DEMO_EMAILS = [
  "admin@pixcards.app",
  "alex@pixcards.app",
  "eleanor@company.com",
  "derek@agency.io",
  "catherine@financials.com",
  "marcus@thorne.co",
  "sarah@sands.design",
];

const has = (k: string) => Boolean(process.env[k]?.trim());
const DAY = 24 * 60 * 60 * 1000;

/** Run every health/security check against the live database + configuration. */
export async function runAudit(): Promise<Finding[]> {
  const out: Finding[] = [];

  /* ---------------------------- Security ----------------------------- */

  // Session signing secret must be set + non-default.
  const secret = process.env.AUTH_SECRET ?? "";
  out.push(
    !secret || secret === "dev-secret-change-me"
      ? {
          id: "auth-secret",
          area: "Security",
          severity: "critical",
          title: "Session secret is missing or default",
          detail:
            "AUTH_SECRET is unset or the dev placeholder — sessions could be forged. Set a strong AUTH_SECRET (openssl rand -base64 32) in Netlify and redeploy.",
        }
      : okFinding("auth-secret", "Security", "Session secret is set"),
  );

  // Demo/seed accounts (public passwords).
  const demoCount = await prisma.user.count({
    where: { email: { in: DEMO_EMAILS } },
  });
  out.push(
    demoCount > 0
      ? {
          id: "demo-accounts",
          area: "Security",
          severity: "critical",
          title: "Demo accounts present",
          detail:
            "Seeded demo accounts ship with a public password. Remove them from the live site.",
          count: demoCount,
          fixId: "purge-demo-accounts",
          fixLabel: "Delete demo accounts",
        }
      : okFinding("demo-accounts", "Security", "No demo accounts"),
  );

  // At least one admin must exist.
  const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
  out.push(
    adminCount === 0
      ? {
          id: "no-admin",
          area: "Security",
          severity: "critical",
          title: "No admin account",
          detail: "There is no ADMIN user — admin tools are inaccessible.",
        }
      : okFinding(
          "admins",
          "Security",
          `${adminCount} admin account${adminCount === 1 ? "" : "s"}`,
        ),
  );

  // Stripe webhook secret when Stripe is live.
  if (has("STRIPE_SECRET_KEY") && !has("STRIPE_WEBHOOK_SECRET")) {
    out.push({
      id: "stripe-webhook",
      area: "Security",
      severity: "warning",
      title: "Stripe webhook secret missing",
      detail:
        "STRIPE_SECRET_KEY is set but STRIPE_WEBHOOK_SECRET is not — payment confirmations can't be verified by signature.",
    });
  }

  /* -------------------------- Configuration -------------------------- */

  // Public URL.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  out.push(
    !appUrl || appUrl.includes("localhost") || appUrl.includes("netlify.app")
      ? {
          id: "app-url",
          area: "Configuration",
          severity: "warning",
          title: "Public URL not set to your domain",
          detail:
            "NEXT_PUBLIC_APP_URL should be https://pixcards.co.uk — it builds QR codes, share links, emails and wallet passes.",
        }
      : okFinding("app-url", "Configuration", "Public URL is set"),
  );

  // Image storage.
  out.push(
    storageProvider === "supabase"
      ? okFinding("storage", "Configuration", "Supabase Storage active")
      : {
          id: "storage",
          area: "Configuration",
          severity: "warning",
          title: "Images stored inline (no CDN)",
          detail:
            "Uploads are saved as data-URIs. Configure Supabase Storage for lighter, faster pages.",
        },
  );

  // Stripe test key on production.
  if (process.env.STRIPE_SECRET_KEY?.startsWith("sk_test")) {
    out.push({
      id: "stripe-test",
      area: "Configuration",
      severity: "warning",
      title: "Stripe is in TEST mode",
      detail: "STRIPE_SECRET_KEY is a test key — real payments won't be taken.",
    });
  }

  /* ------------------------------ Data ------------------------------- */

  // Expired Pro grants still marked PRO.
  const expiredPro = await prisma.user.count({
    where: { plan: "PRO", proUntil: { lt: new Date() } },
  });
  if (expiredPro > 0) {
    out.push({
      id: "expired-pro",
      area: "Data",
      severity: "warning",
      title: "Expired Pro users not downgraded",
      detail: "Some users have a past Pro expiry but are still on the Pro plan.",
      count: expiredPro,
      fixId: "downgrade-expired-pro",
      fixLabel: "Downgrade now",
    });
  } else {
    out.push(okFinding("expired-pro", "Data", "No stale Pro grants"));
  }

  // Inline images that could be migrated.
  const [inlineProfiles, inlineOrders] = await Promise.all([
    prisma.profile.count({
      where: {
        OR: [
          { avatarUrl: { startsWith: "data:" } },
          { headerUrl: { startsWith: "data:" } },
        ],
      },
    }),
    prisma.order.count({ where: { design: { contains: "data:" } } }),
  ]);
  const inlineTotal = inlineProfiles + inlineOrders;
  if (inlineTotal > 0 && storageProvider === "supabase") {
    out.push({
      id: "inline-images",
      area: "Data",
      severity: "warning",
      title: "Images not yet on storage",
      detail: "Records still hold inline data-URI images. Migrate them to the CDN.",
      count: inlineTotal,
      fixId: "migrate-images",
      fixLabel: "Migrate to storage",
    });
  }

  // Expired-but-active discount codes.
  const expiredDiscounts = await prisma.discountCode.count({
    where: { active: true, expiresAt: { lt: new Date() } },
  });
  if (expiredDiscounts > 0) {
    out.push({
      id: "expired-discounts",
      area: "Data",
      severity: "warning",
      title: "Expired discount codes still active",
      detail: "Discount codes past their expiry are still marked active.",
      count: expiredDiscounts,
      fixId: "deactivate-expired-discounts",
      fixLabel: "Deactivate them",
    });
  }

  // Stale password reset tokens.
  const staleTokens = await prisma.passwordResetToken.count({
    where: { OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }] },
  });
  if (staleTokens > 0) {
    out.push({
      id: "stale-tokens",
      area: "Data",
      severity: "info",
      title: "Spent password-reset tokens",
      detail: "Expired or used reset tokens can be cleared.",
      count: staleTokens,
      fixId: "purge-reset-tokens",
      fixLabel: "Clear tokens",
    });
  }

  // Orders stuck PENDING for over 7 days.
  const stalePending = await prisma.order.count({
    where: { status: "PENDING", createdAt: { lt: new Date(Date.now() - 7 * DAY) } },
  });
  if (stalePending > 0) {
    out.push({
      id: "stale-pending",
      area: "Data",
      severity: "warning",
      title: "Orders stuck as Pending",
      detail:
        "Orders older than 7 days are still Pending (likely abandoned checkouts). Review them in Orders.",
      count: stalePending,
    });
  }

  // Users with no profile (data integrity).
  const orphanUsers = await prisma.user.count({ where: { profile: { is: null } } });
  if (orphanUsers > 0) {
    out.push({
      id: "orphan-users",
      area: "Data",
      severity: "warning",
      title: "Users without a profile",
      detail: "Some accounts have no profile record. Review them.",
      count: orphanUsers,
    });
  }

  // Email bounces / complaints.
  const badEmails = await prisma.emailMessage.count({
    where: { status: { in: ["bounced", "complained"] } },
  });
  if (badEmails > 0) {
    out.push({
      id: "email-bounces",
      area: "Data",
      severity: "info",
      title: "Bounced or flagged emails",
      detail: "Some emails bounced or were marked spam — check those addresses.",
      count: badEmails,
    });
  }

  return out;
}

function okFinding(id: string, area: Area, title: string): Finding {
  return { id, area, severity: "ok", title, detail: "" };
}
