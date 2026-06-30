"use client";

import { useMemo, useState, useTransition } from "react";
import { Rnd } from "react-rnd";
import { Icon } from "@/components/Icon";
import { buttonClass, inputClass, Label } from "@/components/ui";
import { cn } from "@/lib/utils";
import { nfcMarkDataUrl } from "@/lib/nfc-logo";
import {
  applyMerge,
  CARD_RATIO,
  MERGE_FIELDS,
  type CardTemplateSpec,
  type MergeData,
  type SideSpec,
  type TemplateElement,
} from "@/lib/card-template";
import { updateMyCardDesign } from "@/lib/actions/mycard";

const ED_W = 506;
const ED_H = Math.round(ED_W / CARD_RATIO);
const REF_H = 638;
const SCALE = ED_H / REF_H;

let _id = 0;
const uid = () => `e${Date.now().toString(36)}${_id++}`;

const BG_PRESETS = [
  { label: "White", value: "#ffffff" },
  { label: "Black", value: "#111827" },
  { label: "Navy", value: "linear-gradient(135deg,#1a2046 0%,#0f1330 60%,#0a0d22 100%)" },
  { label: "Lime", value: "#c7ec4f" },
  { label: "Indigo", value: "linear-gradient(135deg,#6366f1,#4338ca)" },
  { label: "Midnight", value: "linear-gradient(135deg,#1e293b,#0f172a)" },
];

/**
 * Personal card designer — the same drag/resize/edit tools as the
 * organisation designer, applied to one user's own saved card. Elements can
 * use {{tokens}} that merge from the profile, or fixed text/logos/images.
 */
export function PersonalCardDesigner({
  initialSpec,
  previewMerge,
  qrPreview,
  onClose,
  onSaved,
}: {
  initialSpec: CardTemplateSpec;
  previewMerge: MergeData;
  qrPreview: string;
  onClose?: () => void;
  onSaved?: () => void;
}) {
  const [spec, setSpec] = useState<CardTemplateSpec>(initialSpec);
  const [activeSide, setActiveSide] = useState<"front" | "back">("front");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
  /** Copy the selected element's position/size/style onto the other side
   *  (adds it if missing there, or moves the existing one to match). */
  function copyToOtherSide(el: TemplateElement) {
    const other = activeSide === "front" ? "back" : "front";
    setSpec((prev) => ({
      ...prev,
      [other]: { ...prev[other], elements: [...prev[other].elements, { ...el, id: uid() }] },
    }));
    setSaved(false);
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
      const res = await updateMyCardDesign(JSON.stringify(spec));
      if (res.ok) {
        setSaved(true);
        onSaved?.();
      } else {
        setError(res.error ?? "Could not save.");
      }
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
          {applyMerge(el.text ?? "", previewMerge)}
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
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={el.src} alt="" className="h-full w-full object-contain" />;
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="inline-flex rounded-lg border border-outline p-0.5">
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
        {onClose && (
          <button type="button" onClick={onClose} className="text-xs font-semibold text-muted hover:text-primary">
            Close editor
          </button>
        )}
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
            Drag and resize elements. Preview shows your real details.
          </p>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => addText()} className={buttonClass("outline", "sm")}>
              <Icon name="text_fields" className="text-[18px]" /> Text
            </button>
            <label className={buttonClass("outline", "sm")}>
              <Icon name="image" className="text-[18px]" /> Logo / Image
              <input type="file" accept="image/*" onChange={addImage} className="hidden" />
            </label>
            <button type="button" onClick={addQr} className={buttonClass("outline", "sm")}>
              <Icon name="qr_code_2" className="text-[18px]" /> QR
            </button>
            <button type="button" onClick={addNfc} className={buttonClass("outline", "sm")}>
              <Icon name="contactless" className="text-[18px]" /> NFC
            </button>
          </div>

          <div>
            <Label>Insert your details</Label>
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
            <p className="mt-1 text-[11px] text-faint">
              These fields stay in sync with your Profile automatically.
            </p>
          </div>

          <div>
            <Label>Background ({activeSide})</Label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
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

          {selected ? (
            <div className="rounded-xl border border-outline p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-faint">
                  {selected.kind} element
                </span>
                <div className="flex gap-1">
                  <button type="button" onClick={() => copyToOtherSide(selected)} title={`Copy to ${activeSide === "front" ? "back" : "front"}, same position`} className="rounded p-1 hover:bg-surface-2">
                    <Icon name="content_copy" className="text-[16px]" />
                  </button>
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

              {/* Precise position — for exact alignment (e.g. matching the
                  logo's spot on both sides) rather than eyeballing a drag. */}
              <div className="mb-3 grid grid-cols-2 gap-2">
                <label className="text-xs text-muted">
                  X %
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={Math.round(selected.x * 1000) / 10}
                    onChange={(e) => updateEl(selected.id, { x: Number(e.target.value) / 100 })}
                    className={cn(inputClass, "mt-0.5")}
                  />
                </label>
                <label className="text-xs text-muted">
                  Y %
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={Math.round(selected.y * 1000) / 10}
                    onChange={(e) => updateEl(selected.id, { y: Number(e.target.value) / 100 })}
                    className={cn(inputClass, "mt-0.5")}
                  />
                </label>
              </div>

              {selected.kind === "text" && (
                <div className="space-y-2">
                  <input value={selected.text ?? ""} onChange={(e) => updateEl(selected.id, { text: e.target.value })}
                    className={inputClass} placeholder="Text (use {{name}}, {{title}}, {{email}}…)" />
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
              Select an element on the card to edit it — or click your logo
              text and delete it, then use &ldquo;Logo / Image&rdquo; to drop
              your own artwork in.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button type="button" onClick={save} disabled={isPending} className={buttonClass("primary", "md")}>
              <Icon name="save" className="text-[18px]" /> Save card design
            </button>
            {saved && !isPending && (
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
                <Icon name="check_circle" className="text-[16px]" /> Saved
              </span>
            )}
            {error && <span className="text-sm font-medium text-red-600">{error}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
