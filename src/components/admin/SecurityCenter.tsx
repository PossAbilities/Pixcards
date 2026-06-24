"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { Icon } from "@/components/Icon";
import { Badge, Card, SectionHeading, buttonClass } from "@/components/ui";
import {
  runSecurityAudit,
  applyRepair,
  type RepairResult,
} from "@/lib/actions/security";
import type { Finding, Severity } from "@/lib/security/audit";

const SEV_META: Record<
  Severity,
  { color: "danger" | "warning" | "info" | "success"; icon: string; label: string }
> = {
  critical: { color: "danger", icon: "gpp_bad", label: "Critical" },
  warning: { color: "warning", icon: "warning", label: "Warning" },
  info: { color: "info", icon: "info", label: "Notice" },
  ok: { color: "success", icon: "check_circle", label: "OK" },
};

export function SecurityCenter() {
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [scanning, startScan] = useTransition();
  const [repairingId, setRepairingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(() => {
    setError(null);
    setNotice(null);
    startScan(async () => {
      try {
        setFindings(await runSecurityAudit());
      } catch {
        setError("Couldn't run the scan.");
      }
    });
  }, []);

  useEffect(() => {
    scan();
  }, [scan]);

  function repair(fixId: string) {
    setRepairingId(fixId);
    setNotice(null);
    setError(null);
    startScan(async () => {
      const res: RepairResult = await applyRepair(fixId);
      setRepairingId(null);
      if (res.ok) {
        setNotice(res.message ?? "Repaired.");
        try {
          setFindings(await runSecurityAudit());
        } catch {
          /* keep prior */
        }
      } else {
        setError(res.error ?? "Repair failed.");
      }
    });
  }

  const issues = (findings ?? []).filter((f) => f.severity !== "ok");
  const passed = (findings ?? []).filter((f) => f.severity === "ok");
  const criticals = issues.filter((f) => f.severity === "critical").length;
  const warnings = issues.filter((f) => f.severity === "warning").length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`grid h-12 w-12 place-items-center rounded-2xl ${
                criticals
                  ? "bg-red-100 text-red-600"
                  : warnings
                    ? "bg-amber-100 text-amber-600"
                    : "bg-emerald-100 text-emerald-600"
              }`}
            >
              <Icon
                name={criticals ? "gpp_bad" : warnings ? "gpp_maybe" : "gpp_good"}
                fill
                className="text-[26px]"
              />
            </span>
            <div>
              <p className="font-display text-lg font-bold text-ink">
                {findings === null
                  ? "Scanning…"
                  : criticals
                    ? `${criticals} critical issue${criticals === 1 ? "" : "s"}`
                    : warnings
                      ? `${warnings} thing${warnings === 1 ? "" : "s"} to review`
                      : "All clear"}
              </p>
              <p className="text-sm text-muted">
                {findings === null
                  ? "Checking database and configuration."
                  : `${passed.length} checks passed · last run just now`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={scan}
            disabled={scanning}
            className={buttonClass("outline", "md")}
          >
            <Icon
              name="refresh"
              className={`text-[18px] ${scanning ? "animate-spin" : ""}`}
            />
            Re-scan
          </button>
        </div>
        {notice && (
          <p className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
            <Icon name="check_circle" className="text-[16px]" />
            {notice}
          </p>
        )}
        {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
      </Card>

      {/* Issues */}
      {issues.length > 0 && (
        <div className="space-y-3">
          {issues.map((f) => {
            const m = SEV_META[f.severity];
            return (
              <Card key={f.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Icon
                      name={m.icon}
                      fill
                      className={`mt-0.5 text-[22px] ${
                        f.severity === "critical"
                          ? "text-red-500"
                          : f.severity === "warning"
                            ? "text-amber-500"
                            : "text-blue-500"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                        {f.title}
                        <Badge color={m.color}>{m.label}</Badge>
                        <Badge color="neutral">{f.area}</Badge>
                        {typeof f.count === "number" && (
                          <span className="text-xs text-muted">×{f.count}</span>
                        )}
                      </p>
                      <p className="mt-1 text-sm text-muted">{f.detail}</p>
                    </div>
                  </div>
                  {f.fixId && (
                    <button
                      type="button"
                      onClick={() => repair(f.fixId!)}
                      disabled={scanning}
                      className={buttonClass("primary", "sm")}
                    >
                      {repairingId === f.fixId ? (
                        <>
                          <Icon
                            name="progress_activity"
                            className="text-[16px] animate-spin"
                          />
                          Repairing…
                        </>
                      ) : (
                        <>
                          <Icon name="build" className="text-[16px]" />
                          {f.fixLabel ?? "Repair"}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Passed checks */}
      {passed.length > 0 && (
        <Card className="p-6">
          <SectionHeading icon="checklist" title="Passing checks" />
          <ul className="space-y-2">
            {passed.map((f) => (
              <li key={f.id} className="flex items-center gap-2 text-sm">
                <Icon name="check_circle" fill className="text-[16px] text-emerald-500" />
                <span className="text-ink">{f.title}</span>
                <Badge color="neutral">{f.area}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
