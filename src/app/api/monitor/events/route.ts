import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApiKey } from "@/lib/api-keys";
import type { Prisma, SystemEventType } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TYPES = [
  "ORDER_PLACED",
  "ORDER_PAID",
  "ORDER_STATUS",
  "USER_REGISTERED",
  "PRO_UPGRADE",
  "CARD_ACTIVATED",
  "SECURITY",
  "ERROR",
];

/**
 * GET /api/monitor/events?since=<ISO>&type=<TYPE>&severity=<info|warning|critical>&limit=<n>
 * Auth: Authorization: Bearer <key>  (or  x-api-key: <key>)
 * Returns events newest-first. Poll with ?since=<last seen createdAt> to get
 * only what's new.
 */
export async function GET(req: NextRequest) {
  if (!(await authenticateApiKey(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit")) || 50));
  const since = searchParams.get("since");
  const type = searchParams.get("type");
  const severity = searchParams.get("severity");

  const where: Prisma.SystemEventWhereInput = {};
  if (since) {
    const d = new Date(since);
    if (!Number.isNaN(d.getTime())) where.createdAt = { gt: d };
  }
  if (type && VALID_TYPES.includes(type)) where.type = type as SystemEventType;
  if (severity) where.severity = severity;

  const rows = await prisma.systemEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const events = rows.map((e) => ({
    id: e.id,
    type: e.type,
    severity: e.severity,
    title: e.title,
    message: e.message,
    meta: safeParse(e.meta),
    createdAt: e.createdAt.toISOString(),
  }));

  return NextResponse.json({
    count: events.length,
    // Pass this back as ?since= on the next poll.
    latest: events[0]?.createdAt ?? since ?? null,
    events,
  });
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
