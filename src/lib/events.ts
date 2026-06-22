import "server-only";
import { prisma } from "@/lib/db";
import type { SystemEventType } from "@prisma/client";

/**
 * Append a system event to the monitoring feed. Fault-tolerant — a logging
 * failure must never break the action that triggered it.
 */
export async function recordEvent(input: {
  type: SystemEventType;
  title: string;
  message?: string;
  severity?: "info" | "warning" | "critical";
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.systemEvent.create({
      data: {
        type: input.type,
        title: input.title,
        message: input.message ?? "",
        severity: input.severity ?? "info",
        meta: input.meta ? JSON.stringify(input.meta) : "{}",
      },
    });
  } catch (e) {
    console.error("recordEvent failed", e);
  }
}
