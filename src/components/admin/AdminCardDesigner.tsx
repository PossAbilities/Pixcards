"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { Card, Label, buttonClass, inputClass } from "@/components/ui";
import { PersonalCardDesigner } from "@/components/dashboard/PersonalCardDesigner";
import { adminApplyCardTemplate } from "@/lib/actions/admin-cards";
import type { CardTemplateSpec, MergeData } from "@/lib/card-template";

export function AdminCardDesigner({
  userId,
  currentPreset,
  presets,
  spec,
  merge,
  saveAction,
  resetAction,
}: {
  userId: string;
  currentPreset: string | null;
  presets: { id: string; label: string }[];
  spec: CardTemplateSpec;
  merge: MergeData;
  saveAction: (specJson: string) => Promise<{ ok: boolean; error?: string }>;
  resetAction: () => Promise<{ ok: boolean; error?: string; spec?: string }>;
}) {
  const router = useRouter();
  const [qr, setQr] = useState("");
  const [preset, setPreset] = useState(
    currentPreset && currentPreset !== "custom" ? currentPreset : "",
  );
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // Remount the designer when the server sends a different spec (e.g. after a
  // template switch), so it starts from the new design.
  const designerKey = useMemo(() => {
    const str = JSON.stringify(spec);
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return `${str.length}-${h}`;
  }, [spec]);

  useEffect(() => {
    QRCode.toDataURL(merge.url, { margin: 1, width: 256 }).then(setQr).catch(() => {});
  }, [merge.url]);

  function applyTemplate() {
    if (!preset) return;
    if (!confirm("Switch to this template? It replaces the current card design on both sides.")) return;
    setMsg(null);
    setErr(null);
    startTransition(async () => {
      const res = await adminApplyCardTemplate(userId, preset);
      if (res.ok) {
        setMsg("Template applied.");
        router.refresh();
      } else setErr(res.error ?? "Could not apply the template.");
    });
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <Label htmlFor="acd-preset">Start from a template</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            id="acd-preset"
            value={preset}
            onChange={(e) => setPreset(e.target.value)}
            className={`${inputClass} sm:max-w-sm`}
          >
            <option value="">
              {currentPreset === "custom" ? "Custom design (edited)" : "Choose a template…"}
            </option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={applyTemplate}
            disabled={isPending || !preset || preset === currentPreset}
            className={buttonClass("outline", "md")}
          >
            {isPending ? "Applying…" : "Use this template"}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-muted">
          Also sets their digital profile colours to match. Their name, job title, phone and
          email fill in automatically from their profile.
        </p>
        {msg && <p role="status" className="mt-2 text-sm text-green-700">{msg}</p>}
        {err && <p role="alert" className="mt-2 text-sm text-red-600">{err}</p>}
      </Card>

      <PersonalCardDesigner
        key={designerKey}
        initialSpec={spec}
        previewMerge={merge}
        qrPreview={qr}
        saveAction={saveAction}
        resetAction={resetAction}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
