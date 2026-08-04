/**
 * Next.js instrumentation hook — runs once on server startup.
 * Starts the Ryan's Cloud Hub agent (health/security telemetry) on the Node
 * server only. Guarded so it never touches the Edge runtime, and the agent
 * itself no-ops unless HUB_URL / RC_INGEST_KEY / HUB_SITE_ID are set.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startHubAgent } = await import("@/lib/hub-agent");
    startHubAgent();
  }
}
