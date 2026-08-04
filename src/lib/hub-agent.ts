/**
 * Ryan's Cloud Hub agent — pushes telemetry (health / security / notification)
 * to the central Hub.
 *
 * Purely additive and FAIL-SILENT: every network call is wrapped so a missing
 * config or an unreachable Hub can never break a request or a deploy. The whole
 * agent no-ops unless HUB_URL, RC_INGEST_KEY and HUB_SITE_ID are all set.
 *
 * Started once on server boot from src/instrumentation.ts.
 */
import { prisma } from "@/lib/db";

type Kind = "health" | "security" | "notification";

const HUB_URL = process.env.HUB_URL;
const KEY = process.env.RC_INGEST_KEY;
const SITE_ID = process.env.HUB_SITE_ID;

const configured = (): boolean => Boolean(HUB_URL && KEY && SITE_ID);

/** Debug-level logging only — never noisy, never throws. */
function debug(...args: unknown[]): void {
  try {
    console.debug("[hub-agent]", ...args);
  } catch {
    /* ignore */
  }
}

/** Abort a fetch after `ms` without relying on AbortSignal.timeout typings. */
function timeoutSignal(ms: number): AbortSignal {
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

/** POST one telemetry event to the Hub. Never throws. */
export async function send(
  kind: Kind,
  payload: Record<string, unknown>,
): Promise<void> {
  if (!configured()) return; // not configured → no-op
  try {
    const res = await fetch(`${HUB_URL}/api/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KEY}`,
      },
      body: JSON.stringify({ siteId: SITE_ID, kind, payload }),
      signal: timeoutSignal(5000),
    });
    if (!res.ok) debug(`${kind} -> HTTP ${res.status}`);
  } catch (e) {
    debug(`${kind} failed:`, (e as Error)?.message ?? e); // Hub down — ignore
  }
}

/**
 * Fire-and-forget notification helper — call from anywhere an event happens
 * (auth-failure spike, payment error, cron failure, …). Safe if unconfigured.
 */
export function notify(
  level: "critical" | "serious" | "warning" | "good",
  title: string,
  message: string,
  source = "App",
): void {
  void send("notification", { level, title, message, source });
}

/** kind:"health" — measured self-health, sent every ~5 min and on boot. */
async function reportHealth(): Promise<void> {
  const started = Date.now();
  let dbOk = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbOk = false;
  }
  const responseMs = Date.now() - started;
  await send("health", {
    up: true,
    responseMs,
    status: dbOk ? (responseMs < 1500 ? "operational" : "degraded") : "degraded",
  });
}

type Issue = {
  id: string;
  title: string;
  description: string;
  remediation: string;
  severity: "critical" | "serious" | "warning";
  category: "dependencies" | "tls" | "headers" | "auth" | "config" | "content";
  patchAvailable: boolean;
  detectedAt: string;
};

/**
 * kind:"security" — cheap, REAL checks (no faked score): public response
 * headers, HSTS/TLS, and a couple of config sanity checks. Sent on boot + daily.
 */
async function reportSecurity(): Promise<void> {
  const now = new Date().toISOString();
  const issues: Issue[] = [];

  // What do real clients actually receive? Self-check the public headers.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      const res = await fetch(appUrl, {
        method: "HEAD",
        signal: timeoutSignal(5000),
      });
      const h = res.headers;
      if (!h.get("strict-transport-security"))
        issues.push({
          id: "hdr-hsts",
          title: "HSTS header missing",
          description:
            "Strict-Transport-Security is not set, so browsers won't force HTTPS on future visits.",
          remediation: "Add a Strict-Transport-Security header (next.config headers).",
          severity: "warning",
          category: "tls",
          patchAvailable: false,
          detectedAt: now,
        });
      if (!h.get("x-content-type-options"))
        issues.push({
          id: "hdr-xcto",
          title: "X-Content-Type-Options missing",
          description: "MIME-sniffing protection header is absent.",
          remediation: "Set X-Content-Type-Options: nosniff.",
          severity: "warning",
          category: "headers",
          patchAvailable: false,
          detectedAt: now,
        });
      if (!h.get("x-frame-options") && !h.get("content-security-policy"))
        issues.push({
          id: "hdr-frame",
          title: "Clickjacking protection missing",
          description:
            "Neither X-Frame-Options nor a CSP frame-ancestors directive is set.",
          remediation: "Add X-Frame-Options: DENY or a Content-Security-Policy.",
          severity: "warning",
          category: "headers",
          patchAvailable: false,
          detectedAt: now,
        });
    } catch {
      /* self-fetch failed (tunnel/timeout) — skip header checks, don't penalise */
    }
  }

  // Cheap config sanity checks.
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret === "dev-secret-change-me")
    issues.push({
      id: "cfg-auth-secret",
      title: "Weak or missing AUTH_SECRET",
      description: "The session-signing secret is unset or the insecure default.",
      remediation: "Set a strong random AUTH_SECRET and redeploy.",
      severity: "critical",
      category: "auth",
      patchAvailable: false,
      detectedAt: now,
    });
  if (!process.env.STRIPE_SECRET_KEY)
    issues.push({
      id: "cfg-stripe",
      title: "Payments not configured",
      description:
        "STRIPE_SECRET_KEY is unset — checkout runs in demo mode (no real charges).",
      remediation: "Set live Stripe keys before taking payments.",
      severity: "warning",
      category: "config",
      patchAvailable: false,
      detectedAt: now,
    });

  const weight = { critical: 30, serious: 15, warning: 5 } as const;
  const score = Math.max(
    0,
    100 - issues.reduce((n, i) => n + weight[i.severity], 0),
  );
  await send("security", { score, issues });
}

let hasStarted = false;

/** Start the agent's schedules. Safe to call more than once (guards itself). */
export function startHubAgent(): void {
  if (!configured() || hasStarted) return;
  hasStarted = true;
  debug(`starting (site ${SITE_ID} -> ${HUB_URL})`);
  // Immediately on boot…
  void reportHealth();
  void reportSecurity();
  // …then on a schedule.
  setInterval(() => void reportHealth(), 5 * 60 * 1000);
  setInterval(() => void reportSecurity(), 24 * 60 * 60 * 1000);
}
