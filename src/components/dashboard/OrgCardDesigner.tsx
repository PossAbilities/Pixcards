"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Rnd } from "react-rnd";
import QRCode from "qrcode";
import { Icon } from "@/components/Icon";
import { Card, SectionHeading, buttonClass, inputClass, Label } from "@/components/ui";
import { cn } from "@/lib/utils";
import { nfcMarkDataUrl } from "@/lib/nfc-logo";
import {
  applyMerge,
  parseTemplate,
  CARD_RATIO,
  MERGE_FIELDS,
  SAMPLE_MERGE,
  type CardTemplateSpec,
  type SideSpec,
  type TemplateElement,
} from "@/lib/card-template";
import { updateOrgCardTemplate } from "@/lib/actions/org";
import type { OrgData } from "./OrgManager";

const ED_W = 506;
const ED_H = Math.round(ED_W / CARD_RATIO); // ~319
const REF_H = 638; // font sizes are stored at this height
const SCALE = ED_H / REF_H;

let _id = 0;
const uid = () => `e${Date.now().toString(36)}${_id++}`;

const BG_PRESETS = [
  { label: "White", value: "#ffffff" },
  { label: "Black", value: "#111827" },
  { label: "Indigo", value: "#4f46e5" },
  { label: "Indigo gradient", value: "linear-gradient(135deg,#6366f1,#4338ca)" },
  { label: "Midnight", value: "linear-gradient(135deg,#1e293b,#0f172a)" },
];

function defaultTemplate(data: NonNullable<OrgData>): CardTemplateSpec {
  const frontBg = data.cardUseBrand && data.brandHeader ? data.brandHeader : data.accentColor;
  const front: SideSpec = {
    bg: frontBg,
    elements: [
      { id: uid(), kind: "text", x: 0.06, y: 0.6, w: 0.6, h: 0.13, text: "{{name}}", color: "#ffffff", fontSize: 62, fontWeight: 700, align: "left" },
      { id: uid(), kind: "text", x: 0.06, y: 0.75, w: 0.6, h: 0.08, text: "{{title}}", color: "#ffffff", fontSize: 33, fontWeight: 500, align: "left" },
      { id: uid(), kind: "text", x: 0.06, y: 0.84, w: 0.6, h: 0.08, text: "{{company}}", color: "#ffffff", fontSize: 33, fontWeight: 500, align: "left" },
      { id: uid(), kind: "qr", x: 0.72, y: 0.08, w: 0.22, h: 0.35 },
      ...(data.cardNfcLogo
        ? [{ id: uid(), kind: "nfc" as const, x: 0.8, y: 0.6, w: 0.12, h: 0.26, nfcColor: "#ffffff" }]
        : []),
    ],
  };
  const back: SideSpec = {
    bg: data.accentColor,
    elements: [
      { id: uid(), kind: "text", x: 0.1, y: 0.38, w: 0.8, h: 0.12, text: "{{company}}", color: "#ffffff", fontSize: 56, fontWeight: 800, align: "center" },
      { id: uid(), kind: "text", x: 0.1, y: 0.52, w: 0.8, h: 0.08, text: "Tap to connect", color: "#ffffff", fontSize: 28, fontWeight: 500, align: "center" },
      ...(data.cardNfcLogo
        ? [{ id: uid(), kind: "nfc" as const, x: 0.44, y: 0.68, w: 0.12, h: 0.24, nfcColor: "#ffffff" }]
        : []),
    ],
  };
  return { front, back };
}

export function OrgCardDesigner({ data }: { data: NonNullable<OrgData> }) {
  const [spec, setSpec] = useState<CardTemplateSpec>(
    () => parseTemplate(data.cardDesign) ?? defaultTemplate(data),
  );
  const [activeSide, setActiveSide] = useState<"front" | "back">("front");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [qrPreview, setQrPreview] = useState<string>("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    QRCode.toDataURL(SAMPLE_MERGE.url, { margin: 1, width: 256 })
      .then(setQrPreview)
      .catch(() => {});
  }, []);

  const side = spec[activeSide];
  const selected = side.elements.find((e) => e.id === selectedId) ?? null;

  function mutateSide(fn: (s: SideSpec) => SideSpec) {
    setSpec((prev) => ({ ...prev, [activeSide]: fn(prev[activeSide]) }));
    setSaved(false);
  }
  function updateEl(id: string, patch: Partial<TemplateElement>) {
    mutateSide((s) => ({ ...s, elements: s.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  }
  function addEl(el: TemplateElement) {
    mutateSide((s) => ({ ...s, elements: [...s.elements, el] }));
    setSelectedId(el.id);
  }
  function deleteEl(id: string) {
    mutateSide((s) => ({ ...s, elements: s.elements.filter((e) => e.id !== id) }));
    setSelectedId(null);
  }
  function reorder(id: string, dir: "front" | "back") {
    mutateSide((s) => {
      const i = s.elements.findIndex((e) => e.id === id);
      if (i < 0) return s;
      const t = dir === "front" ? i + 1 : i - 1;
      if (t < 0 || t >= s.elements.length) return s;
      const next = [...s.elements];
      const [m] = next.splice(i, 1);
      next.splice(t, 0, m);
      return { ...s, elements: next };
    });
  }

  function addText(text = "Your text") {
    addEl({ id: uid(), kind: "text", x: 0.1, y: 0.1, w: 0.5, h: 0.1, text, color: "#ffffff", fontSize: 34, fontWeight: 600, align: "left" });
  }
  function addQr() {
    addEl({ id: uid(), kind: "qr", x: 0.7, y: 0.1, w: 0.22, h: 0.35 });
  }
  function addNfc() {
    addEl({ id: uid(), kind: "nfc", x: 0.78, y: 0.62, w: 0.12, h: 0.26, nfcColor: "#ffffff" });
  }
  function addImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Image too large — keep logos under 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result || "");
      if (src) addEl({ id: uid(), kind: "image", x: 0.06, y: 0.08, w: 0.3, h: 0.2, src });
    };
    reader.readAsDataURL(file);
  }
  function setBgImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setError("Background too large — keep it under 3 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result || "");
      if (src) mutateSide((s) => ({ ...s, bg: `url("${src}")` }));
    };
    reader.readAsDataURL(file);
  }

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateOrgCardTemplate(JSON.stringify(spec));
      if (res.ok) setSaved(true);
      else setError(res.error ?? "Could not save.");
    });
  }

  const bgStyle = useMemo<React.CSSProperties>(() => {
    const bg = side.bg;
    if (bg.startsWith("url(")) {
      return { backgroundImage: bg, backgroundSize: "cover", backgroundPosition: "center" };
    }
    return { background: bg };
  }, [side.bg]);

  function renderEl(el: TemplateElement) {
    if (el.kind === "text") {
      return (
        <div
          className="h-full w-full overflow-hidden leading-tight"
          style={{
            color: el.color,
            fontSize: (el.fontSize ?? 34) * SCALE,
            fontWeight: el.fontWeight ?? 600,
            textAlign: el.align ?? "left",
            fontFamily: "Helvetica, Arial, sans-serif",
            whiteSpace: "nowrap",
          }}
        >
          {applyMerge(el.text ?? "", SAMPLE_MERGE)}
        </div>
      );
    }
    if (el.kind === "qr") {
      // eslint-disable-next-line @next/next/no-img-element
      return qrPreview ? <img src={qrPreview} alt="QR" className="h-full w-full bg-white object-contain" /> : null;
    }
    if (el.kind === "nfc") {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={nfcMarkDataUrl({ color: el.nfcColor ?? "#ffffff", label: true })} alt="NFC" className="h-full w-full object-contain" />;
    }
    // image
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={el.src} alt="" className="h-full w-full object-contain" />;
  }

  return (
    <Card className="p-6">
      <SectionHeading icon="design_services" title="Design the team card" />
      <p className="-mt-1 mb-4 text-sm text-muted">
        Design the front and back once. Each member&apos;s card is printed from
        this with their own details merged into the{" "}
        <code className="rounded bg-surface-2 px-1 text-xs">{"{{name}}"}</code>{" "}
        fields.
      </p>

      {/* Side tabs */}
      <div className="mb-3 inline-flex rounded-lg border border-outline p-0.5">
        {(["front", "back"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => { setActiveSide(s); setSelectedId(null); }}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-semibold capitalize transition",
              activeSide === s ? "bg-primary text-white" : "text-muted hover:text-ink",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[auto,1fr]">
        {/* Canvas */}
        <div>
          <div
            className="relative overflow-hidden rounded-xl ring-1 ring-black/10"
            style={{ width: ED_W, height: ED_H, ...bgStyle }}
            onMouseDown={() => setSelectedId(null)}
          >
            {side.elements.map((el) => (
              <Rnd
                key={el.id}
                bounds="parent"
                size={{ width: el.w * ED_W, height: el.h * ED_H }}
                position={{ x: el.x * ED_W, y: el.y * ED_H }}
                onMouseDown={(e) => { e.stopPropagation(); setSelectedId(el.id); }}
                onDragStop={(_e, d) => updateEl(el.id, { x: d.x / ED_W, y: d.y / ED_H })}
                onResizeStop={(_e, _dir, ref, _delta, pos) =>
                  updateEl(el.id, {
                    w: ref.offsetWidth / ED_W,
                    h: ref.offsetHeight / ED_H,
                    x: pos.x / ED_W,
                    y: pos.y / ED_H,
                  })
                }
                className={cn(
                  "flex items-center",
                  selectedId === el.id ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-primary/40",
                )}
              >
                {renderEl(el)}
              </Rnd>
            ))}
          </div>
          <p className="mt-2 text-xs text-faint">
            Drag and resize elements. Preview shows sample details.
          </p>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Add toolbar */}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => addText()} className={buttonClass("outline", "sm")}>
              <Icon name="text_fields" className="text-[18px]" /> Text
            </button>
            <label className={buttonClass("outline", "sm")}>
              <Icon name="image" className="text-[18px]" /> Logo
              <input type="file" accept="image/*" onChange={addImage} className="hidden" />
            </label>
            <button type="button" onClick={addQr} className={buttonClass("outline", "sm")}>
              <Icon name="qr_code_2" className="text-[18px]" /> QR
            </button>
            <button type="button" onClick={addNfc} className={buttonClass("outline", "sm")}>
              <Icon name="contactless" className="text-[18px]" /> NFC
            </button>
          </div>

          {/* Merge fields */}
          <div>
            <Label>Insert a member field</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {MERGE_FIELDS.map((f) => (
                <button
                  key={f.token}
                  type="button"
                  onClick={() => addText(f.token)}
                  className="rounded-full border border-outline px-3 py-1 text-xs font-medium text-ink hover:border-primary"
                >
                  + {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Background */}
          <div>
            <Label>Background ({activeSide})</Label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {data.brandHeader && (
                <button type="button" onClick={() => mutateSide((s) => ({ ...s, bg: data.brandHeader! }))}
                  className="h-7 rounded border border-outline px-2 text-xs font-semibold" style={{ background: data.brandHeader, color: "#fff" }}>
                  Brand
                </button>
              )}
              {BG_PRESETS.map((b) => (
                <button key={b.label} type="button" title={b.label} onClick={() => mutateSide((s) => ({ ...s, bg: b.value }))}
                  className="h-7 w-7 rounded border border-outline" style={{ background: b.value }} />
              ))}
              <input type="color" onChange={(e) => mutateSide((s) => ({ ...s, bg: e.target.value }))}
                className="h-7 w-9 cursor-pointer rounded border border-outline bg-transparent p-0" title="Custom colour" />
              <label className={buttonClass("outline", "sm")}>
                <Icon name="wallpaper" className="text-[16px]" /> Image
                <input type="file" accept="image/*" onChange={setBgImage} className="hidden" />
              </label>
            </div>
          </div>

          {/* Selected element */}
          {selected ? (
            <div className="rounded-xl border border-outline p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-faint">
                  {selected.kind} element
                </span>
                <div className="flex gap-1">
                  <button type="button" onClick={() => reorder(selected.id, "back")} title="Send back" className="rounded p-1 hover:bg-surface-2">
                    <Icon name="flip_to_back" className="text-[16px]" />
                  </button>
                  <button type="button" onClick={() => reorder(selected.id, "front")} title="Bring forward" className="rounded p-1 hover:bg-surface-2">
                    <Icon name="flip_to_front" className="text-[16px]" />
                  </button>
                  <button type="button" onClick={() => deleteEl(selected.id)} title="Delete" className="rounded p-1 text-red-600 hover:bg-red-50">
                    <Icon name="delete" className="text-[16px]" />
                  </button>
                </div>
              </div>

              {selected.kind === "text" && (
                <div className="space-y-2">
                  <input value={selected.text ?? ""} onChange={(e) => updateEl(selected.id, { text: e.target.value })}
                    className={inputClass} placeholder="Text (use {{name}}, {{title}}, {{company}})" />
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-1 text-xs text-muted">
                      Size
                      <input type="range" min={14} max={120} value={selected.fontSize ?? 34}
                        onChange={(e) => updateEl(selected.id, { fontSize: Number(e.target.value) })} />
                    </label>
                    <label className="flex items-center gap-1 text-xs text-muted">
                      Colour
                      <input type="color" value={selected.color ?? "#ffffff"} onChange={(e) => updateEl(selected.id, { color: e.target.value })}
                        className="h-7 w-8 cursor-pointer rounded border border-outline bg-transparent p-0" />
                    </label>
                    <div className="flex gap-1">
                      {(["left", "center", "right"] as const).map((a) => (
                        <button key={a} type="button" onClick={() => updateEl(selected.id, { align: a })}
                          className={cn("rounded p-1", (selected.align ?? "left") === a ? "bg-primary text-white" : "hover:bg-surface-2")}>
                          <Icon name={`format_align_${a}`} className="text-[16px]" />
                        </button>
                      ))}
                    </div>
                    <button type="button" onClick={() => updateEl(selected.id, { fontWeight: (selected.fontWeight ?? 600) >= 700 ? 500 : 700 })}
                      className={cn("rounded p-1", (selected.fontWeight ?? 600) >= 700 ? "bg-primary text-white" : "hover:bg-surface-2")} title="Bold">
                      <Icon name="format_bold" className="text-[16px]" />
                    </button>
                  </div>
                </div>
              )}
              {selected.kind === "nfc" && (
                <label className="flex items-center gap-2 text-xs text-muted">
                  Logo colour
                  <input type="color" value={selected.nfcColor ?? "#ffffff"} onChange={(e) => updateEl(selected.id, { nfcColor: e.target.value })}
                    className="h-7 w-8 cursor-pointer rounded border border-outline bg-transparent p-0" />
                </label>
              )}
              {(selected.kind === "qr" || selected.kind === "image") && (
                <p className="text-xs text-muted">Drag the corners on the canvas to resize.</p>
              )}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-outline p-3 text-xs text-muted">
              Select an element on the card to edit it.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button type="button" onClick={save} disabled={isPending} className={buttonClass("primary", "md")}>
              <Icon name="save" className="text-[18px]" /> Save card design
            </button>
            {saved && !isPending && (
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
                <Icon name="check_circle" className="text-[16px]" /> Saved — used for all team cards
              </span>
            )}
            {error && <span className="text-sm font-medium text-red-600">{error}</span>}
          </div>
        </div>
      </div>
    </Card>
  );
}
