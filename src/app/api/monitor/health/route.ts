import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApiKey } from "@/lib/api-keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const has = (k: string) => Boolean(process.env[k]?.trim());

/**
 * GET /api/monitor/health
 * Auth: Authorization: Bearer <key>  (or  x-api-key: <key>)
 * Returns site status, integration config and headline counts.
 */
export async function GET(req: NextRequest) {
  if (!(await authenticateApiKey(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let db = true;
  let counts = { users: 0, orders: 0, pendingOrders: 0, proUsers: 0, openEvents: 0 };
  try {
    const [users, orders, pendingOrders, proUsers] = await Promise.all([
      prisma.user.count(),
      prisma.order.count(),
      prisma.order.count({ where: { status: { in: ["PENDING", "PAID", "PRINTING"] } } }),
      prisma.user.count({ where: { plan: "PRO" } }),
    ]);
    counts = { users, orders, pendingOrders, proUsers, openEvents: 0 };
  } catch {
    db = false;
  }

  return NextResponse.json({
    status: db ? "ok" : "degraded",
    service: "pixcards",
    time: new Date().toISOString(),
    version: process.env.COMMIT_REF ?? null,
    environment: process.env.NODE_ENV ?? "development",
    database: db ? "connected" : "unreachable",
    integrations: {
      stripe: has("STRIPE_SECRET_KEY"),
      email: has("RESEND_API_KEY"),
      emailTracking: has("RESEND_WEBHOOK_SECRET"),
      storage: has("SUPABASE_SERVICE_ROLE_KEY"),
      appleWallet:
        has("APPLE_PASS_TYPE_ID") &&
        has("APPLE_TEAM_ID") &&
        has("APPLE_PASS_CERT_BASE64") &&
        has("APPLE_WWDR_BASE64"),
      googleWallet:
        has("GOOGLE_WALLET_ISSUER_ID") &&
        has("GOOGLE_WALLET_SA_EMAIL") &&
        has("GOOGLE_WALLET_SA_KEY"),
    },
    counts,
  });
}
