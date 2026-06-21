"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import type {
  CSSProperties,
  ChangeEvent,
  MouseEvent as ReactMouseEvent,
  RefObject,
} from "react";
import { Rnd } from "react-rnd";
import type { RndDragCallback, RndResizeCallback } from "react-rnd";
import { toPng } from "html-to-image";
import QRCode from "qrcode";
import { Icon } from "@/components/Icon";
import {
  buttonClass,
  inputClass,
  Label,
  Badge,
  Card,
  SectionHeading,
  ProBadge,
} from "@/components/ui";
import { CARD_MATERIALS, material, money } from "@/lib/constants";
import { createCardOrder } from "@/lib/actions/checkout";
import { previewDiscount } from "@/lib/actions/discounts";
import { ImageCropperModal } from "./ImageCropperModal";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

type Props = {
  plan: "FREE" | "PRO";
  defaultName: string;
  defaultTitle: string;
  shareUrl: string;
  avatarUrl?: string | null;
};

type ElementType = "text" | "image" | "qr";

type CardElement = {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
  color?: string;
  fontSize?: number;
  fontWeight?: number;
  fontFamily?: string;
  align?: "left" | "center" | "right";
  src?: string;
};

type SideState = {
  bg: string;
  elements: CardElement[];
};

type SideKey = "front" | "back";

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const CARD_W = 460;
const CARD_H = 290;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(typeof r.result === "string" ? r.result : "");
    r.readAsDataURL(blob);
  });
}

const BG_PRESETS: { id: string; label: string; value: string }[] = [
  { id: "white", label: "White", value: "#ffffff" },
  { id: "black", label: "Black", value: "#111827" },
  { id: "indigo", label: "Indigo", value: "#4f46e5" },
  {
    id: "grad-indigo",
    label: "Indigo gradient",
    value: "linear-gradient(135deg,#6366f1,#3525cd)",
  },
  {
    id: "grad-slate",
    label: "Midnight gradient",
    value: "linear-gradient(135deg,#0f172a,#1e293b)",
  },
];

let __uid = 0;
function uid(): string {
  __uid += 1;
  return `el_${Date.now().toString(36)}_${__uid}`;
}

/* -------------------------------------------------------------------------- */
/*  Element rendering helper (shared by interactive + static renderers)       */
/* -------------------------------------------------------------------------- */

function renderElementContent(el: CardElement) {
  if (el.type === "text") {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent:
            el.align === "left"
              ? "flex-start"
              : el.align === "right"
                ? "flex-end"
                : "center",
          textAlign: el.align ?? "center",
          color: el.color ?? "#111111",
          fontSize: el.fontSize ?? 22,
          fontWeight: el.fontWeight ?? 600,
          fontFamily:
            el.fontFamily ??
            "var(--font-display, 'Montserrat'), system-ui, sans-serif",
          lineHeight: 1.15,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          overflow: "hidden",
          padding: "2px 4px",
        }}
      >
        {el.text ?? ""}
      </div>
    );
  }
  if (el.type === "image" || el.type === "qr") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={el.src ?? ""}
        alt=""
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: el.type === "qr" ? "contain" : "cover",
          display: "block",
          borderRadius: el.type === "qr" ? 6 : 8,
          userSelect: "none",
          pointerEvents: "none",
        }}
      />
    );
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/*  Static (off-screen) card renderer — used for PNG export                   */
/* -------------------------------------------------------------------------- */

function StaticCard({
  side,
  cardRef,
}: {
  side: SideState;
  cardRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={cardRef}
      style={{
        position: "relative",
        width: CARD_W,
        height: CARD_H,
        background: side.bg,
        backgroundSize: "cover",
        backgroundPosition: "center",
        overflow: "hidden",
      }}
    >
      {side.elements.map((el) => (
        <div
          key={el.id}
          style={{
            position: "absolute",
            left: el.x,
            top: el.y,
            width: el.w,
            height: el.h,
          }}
        >
          {renderElementContent(el)}
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main component                                                            */
/* -------------------------------------------------------------------------- */

export function CardStudio({
  plan,
  defaultName,
  defaultTitle,
  shareUrl,
  avatarUrl,
}: Props) {
  /* ----- order state ----- */
  const [materialId, setMaterialId] = useState<string>("matte-black");
  const [cardName, setCardName] = useState<string>(defaultName);
  const [quantity, setQuantity] = useState<number>(1);
  const [shipName, setShipName] = useState<string>(defaultName);
  const [shipAddress, setShipAddress] = useState<string>("");
  const [shipCity, setShipCity] = useState<string>("");
  const [shipPostal, setShipPostal] = useState<string>("");
  const [shipCountry, setShipCountry] = useState<string>("United Kingdom");
  const [discountCode, setDiscountCode] = useState<string>("");
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    amountOffCents: number;
  } | null>(null);
  const [discountMsg, setDiscountMsg] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [checkingDiscount, startDiscountCheck] = useTransition();

  /* ----- designer state ----- */
  const [front, setFront] = useState<SideState>(() => ({
    bg: "linear-gradient(135deg,#6366f1,#3525cd)",
    elements: [
      {
        id: uid(),
        type: "text",
        x: 40,
        y: 96,
        w: 280,
        h: 44,
        text: defaultName,
        color: "#ffffff",
        fontSize: 28,
        fontWeight: 700,
        align: "left",
      },
      {
        id: uid(),
        type: "text",
        x: 40,
        y: 142,
        w: 280,
        h: 28,
        text: defaultTitle,
        color: "#e0e7ff",
        fontSize: 16,
        fontWeight: 500,
        align: "left",
      },
    ],
  }));
  const [back, setBack] = useState<SideState>(() => ({
    bg: "#111827",
    elements: [
      {
        id: uid(),
        type: "text",
        x: 130,
        y: 123,
        w: 200,
        h: 44,
        text: "Pixcards",
        color: "#ffffff",
        fontSize: 30,
        fontWeight: 700,
        align: "center",
      },
    ],
  }));

  const [activeSide, setActiveSide] = useState<SideKey>("front");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showBgPanel, setShowBgPanel] = useState(false);
  const [studioCrop, setStudioCrop] = useState<{
    src: string;
    kind: "image" | "bg";
  } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "export" | "order">("idle");
  const [isPending, startTransition] = useTransition();

  /* ----- hidden file inputs ----- */
  const imageInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  /* ----- off-screen export refs ----- */
  const frontExportRef = useRef<HTMLDivElement>(null);
  const backExportRef = useRef<HTMLDivElement>(null);

  /* ----- derived ----- */
  const selectedMaterial = material(materialId);
  const baseCents = selectedMaterial.priceCents * quantity;
  const discountOff = appliedDiscount
    ? Math.min(appliedDiscount.amountOffCents, baseCents)
    : 0;
  const totalCents = Math.max(0, baseCents - discountOff);
  const total = money(totalCents);

  // Re-applying needed if the order amount changes — clear a stale discount.
  useEffect(() => {
    setAppliedDiscount(null);
    setDiscountMsg(null);
  }, [materialId, quantity]);

  function applyDiscount() {
    const code = discountCode.trim();
    if (!code) {
      setDiscountMsg({ ok: false, text: "Enter a code first." });
      return;
    }
    startDiscountCheck(async () => {
      const res = await previewDiscount(code, "CARD", baseCents);
      if (res.ok && res.amountOffCents !== undefined) {
        setAppliedDiscount({ code, amountOffCents: res.amountOffCents });
        setDiscountMsg({ ok: true, text: `Code applied — you save ${money(res.amountOffCents)}.` });
      } else {
        setAppliedDiscount(null);
        setDiscountMsg({ ok: false, text: res.reason ?? "That code isn't valid." });
      }
    });
  }

  const sideState = activeSide === "front" ? front : back;
  const setSideState = activeSide === "front" ? setFront : setBack;

  const selectedEl = useMemo(
    () => sideState.elements.find((e) => e.id === selectedId) ?? null,
    [sideState.elements, selectedId],
  );

  /* ----- element mutation helpers ----- */
  const updateSide = useCallback(
    (mutate: (s: SideState) => SideState) => {
      setSideState((prev) => mutate(prev));
    },
    [setSideState],
  );

  const updateElement = useCallback(
    (id: string, patch: Partial<CardElement>) => {
      updateSide((s) => ({
        ...s,
        elements: s.elements.map((e) =>
          e.id === id ? { ...e, ...patch } : e,
        ),
      }));
    },
    [updateSide],
  );

  const addElement = useCallback(
    (el: CardElement) => {
      updateSide((s) => ({ ...s, elements: [...s.elements, el] }));
      setSelectedId(el.id);
    },
    [updateSide],
  );

  const deleteElement = useCallback(
    (id: string) => {
      updateSide((s) => ({
        ...s,
        elements: s.elements.filter((e) => e.id !== id),
      }));
      setSelectedId((cur) => (cur === id ? null : cur));
    },
    [updateSide],
  );

  const reorderElement = useCallback(
    (id: string, dir: "forward" | "back") => {
      updateSide((s) => {
        const idx = s.elements.findIndex((e) => e.id === id);
        if (idx < 0) return s;
        const target = dir === "forward" ? idx + 1 : idx - 1;
        if (target < 0 || target >= s.elements.length) return s;
        const next = [...s.elements];
        const [moved] = next.splice(idx, 1);
        next.splice(target, 0, moved);
        return { ...s, elements: next };
      });
    },
    [updateSide],
  );

  /* ----- toolbar actions ----- */
  const handleAddText = useCallback(() => {
    addElement({
      id: uid(),
      type: "text",
      x: CARD_W / 2 - 90,
      y: CARD_H / 2 - 18,
      w: 180,
      h: 36,
      text: "Your text",
      color: "#111111",
      fontSize: 22,
      fontWeight: 600,
      align: "center",
    });
  }, [addElement]);

  const handleAddImageClick = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const handleImageFile = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = typeof reader.result === "string" ? reader.result : "";
      if (src) setStudioCrop({ src, kind: "image" });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleBgImageClick = useCallback(() => {
    bgInputRef.current?.click();
  }, []);

  const handleBgFile = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = typeof reader.result === "string" ? reader.result : "";
      if (src) setStudioCrop({ src, kind: "bg" });
    };
    reader.readAsDataURL(file);
  }, []);

  async function onStudioCropSave(blob: Blob) {
    if (!studioCrop) return;
    const src = await blobToDataUrl(blob);
    if (studioCrop.kind === "image") {
      addElement({
        id: uid(),
        type: "image",
        x: CARD_W / 2 - 70,
        y: CARD_H / 2 - 70,
        w: 140,
        h: 140,
        src,
      });
    } else {
      updateSide((s) => ({ ...s, bg: `url("${src}")` }));
      setShowBgPanel(false);
    }
    setStudioCrop(null);
  }

  const handleSetBg = useCallback(
    (value: string) => {
      updateSide((s) => ({ ...s, bg: value }));
    },
    [updateSide],
  );

  const handleAddQr = useCallback(async () => {
    try {
      const dataUrl = await QRCode.toDataURL(shareUrl, {
        margin: 1,
        width: 512,
      });
      addElement({
        id: uid(),
        type: "qr",
        x: CARD_W - 96 - 18,
        y: CARD_H - 96 - 18,
        w: 96,
        h: 96,
        src: dataUrl,
      });
    } catch {
      setError("Couldn't generate the QR code — please try again.");
    }
  }, [shareUrl, addElement]);

  /* ----- rnd callbacks (curried per element so the id is captured) ----- */
  const makeDragStop = useCallback(
    (id: string): RndDragCallback =>
      (_e, d) => {
        updateElement(id, { x: d.x, y: d.y });
      },
    [updateElement],
  );

  const makeResizeStop = useCallback(
    (id: string): RndResizeCallback =>
      (_e, _dir, ref, _delta, position) => {
        updateElement(id, {
          w: ref.offsetWidth,
          h: ref.offsetHeight,
          x: position.x,
          y: position.y,
        });
      },
    [updateElement],
  );

  const deselect = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        setSelectedId(null);
        setShowBgPanel(false);
      }
    },
    [],
  );

  /* ----- validation ----- */
  function validate(): string | null {
    if (!cardName.trim()) return "Enter the name for the card.";
    if (!shipName.trim()) return "Enter a delivery name.";
    if (!shipAddress.trim()) return "Enter a delivery address.";
    if (!shipCity.trim()) return "Enter a city.";
    if (!shipPostal.trim()) return "Enter a postcode.";
    if (!shipCountry.trim()) return "Enter a country.";
    if (materialId === "metal-indigo" && plan === "FREE") {
      return "The Metal Indigo card is a Pro material. Upgrade to order it.";
    }
    return null;
  }

  async function exportSide(
    node: HTMLDivElement,
    fileName: string,
  ): Promise<string> {
    const dataUrl = await toPng(node, { pixelRatio: 4, cacheBust: true });
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], fileName, { type: "image/png" });
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const json: { url?: string; error?: string } = await res.json();
    if (!res.ok || !json.url) {
      throw new Error(json.error ?? "Upload failed");
    }
    return json.url;
  }

  /* ----- submit ----- */
  const handleSubmit = useCallback(() => {
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    startTransition(async () => {
      let frontImage: string;
      let backImage: string;

      // 1) Export + upload artwork (failures handled here).
      try {
        setPhase("export");
        const frontNode = frontExportRef.current;
        const backNode = backExportRef.current;
        if (!frontNode || !backNode) {
          throw new Error("Artwork not ready");
        }
        frontImage = await exportSide(frontNode, "card-front.png");
        backImage = await exportSide(backNode, "card-back.png");
      } catch {
        setPhase("idle");
        setError("We couldn't prepare your artwork — please try again.");
        return;
      }

      // 2) Place the order. NOT in the try/catch above — success throws a
      //    Next.js redirect that must propagate.
      setPhase("order");
      const fd = new FormData();
      fd.append("material", materialId);
      fd.append("cardName", cardName);
      fd.append("quantity", String(quantity));
      fd.append("shipName", shipName);
      fd.append("shipAddress", shipAddress);
      fd.append("shipCity", shipCity);
      fd.append("shipPostal", shipPostal);
      fd.append("shipCountry", shipCountry);
      fd.append("discountCode", discountCode);
      fd.append(
        "design",
        JSON.stringify({
          frontImage,
          backImage,
          spec: { front, back, material: materialId, cardName },
        }),
      );
      const res = await createCardOrder(fd);
      if (res?.error) {
        setPhase("idle");
        setError(res.error);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    materialId,
    cardName,
    quantity,
    shipName,
    shipAddress,
    shipCity,
    shipPostal,
    shipCountry,
    discountCode,
    front,
    back,
    plan,
  ]);

  /* ------------------------------------------------------------------ */
  /*  Render                                                            */
  /* ------------------------------------------------------------------ */

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(320px,420px)] gap-8 items-start">
      {/* LEFT — designer + options */}
      <div className="space-y-6">
        {/* ---------------- Designer ---------------- */}
        <Card className="p-6">
          <SectionHeading
            icon="palette"
            title="Design your card"
            action={
              <Badge color="primary">
                <Icon name="auto_awesome" className="text-[13px]" />
                Studio
              </Badge>
            }
          />

          <div className="flex flex-col sm:flex-row gap-5">
            {/* Side tabs */}
            <div className="flex sm:flex-col gap-2 shrink-0">
              {(["front", "back"] as SideKey[]).map((s) => {
                const isActive = activeSide === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setActiveSide(s);
                      setSelectedId(null);
                      setShowBgPanel(false);
                    }}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-semibold transition-all",
                      isActive
                        ? "border-primary bg-primary-soft/40 text-primary-deep"
                        : "border-outline text-muted hover:border-primary/40 hover:bg-surface-low",
                    )}
                  >
                    <Icon
                      name={s === "front" ? "badge" : "flip_to_back"}
                      className="text-[18px]"
                    />
                    {s === "front" ? "Front Side" : "Back Side"}
                  </button>
                );
              })}
            </div>

            {/* Canvas + toolbar */}
            <div className="min-w-0 flex-1">
              <div className="flex justify-center">
                <div className="relative" style={{ width: CARD_W }}>
                  {/* Interactive card */}
                  <div
                    onMouseDown={deselect}
                    className="relative overflow-hidden rounded-2xl shadow-xl"
                    style={{
                      width: CARD_W,
                      height: CARD_H,
                      background: sideState.bg,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    {/* bleed hint */}
                    <div
                      className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-black/10"
                      aria-hidden
                    />
                    {/* safe-area dashed inset */}
                    <div
                      className="pointer-events-none absolute rounded-lg border border-dashed border-white/40 mix-blend-overlay"
                      style={{ inset: 16 }}
                      aria-hidden
                    />

                    {sideState.elements.map((el) => {
                      const isSel = el.id === selectedId;
                      return (
                        <Rnd
                          key={el.id}
                          bounds="parent"
                          size={{ width: el.w, height: el.h }}
                          position={{ x: el.x, y: el.y }}
                          onDragStop={makeDragStop(el.id)}
                          onResizeStop={makeResizeStop(el.id)}
                          onMouseDown={(ev) => {
                            ev.stopPropagation();
                            setSelectedId(el.id);
                            setShowBgPanel(false);
                          }}
                          enableResizing={{
                            top: true,
                            right: true,
                            bottom: true,
                            left: true,
                            topRight: true,
                            bottomRight: true,
                            bottomLeft: true,
                            topLeft: true,
                          }}
                          lockAspectRatio={el.type === "qr"}
                          resizeHandleStyles={
                            isSel
                              ? {
                                  bottomRight: handleStyle,
                                  bottomLeft: handleStyle,
                                  topRight: handleStyle,
                                  topLeft: handleStyle,
                                }
                              : undefined
                          }
                          className={cn(
                            "group",
                            isSel
                              ? "outline outline-2 outline-primary"
                              : "hover:outline hover:outline-1 hover:outline-primary/40",
                          )}
                          style={{ zIndex: isSel ? 50 : 1 }}
                          resizeGrid={[1, 1]}
                        >
                          <div style={{ width: "100%", height: "100%" }}>
                            {renderElementContent(el)}
                          </div>
                        </Rnd>
                      );
                    })}
                  </div>

                  {/* Safe-area / bleed caption */}
                  <p className="mt-2 text-center text-[11px] text-faint">
                    CR80 standard · dashed line = safe print area
                  </p>

                  {/* Floating selected-element controls */}
                  {selectedEl && (
                    <SelectedToolbar
                      el={selectedEl}
                      onDelete={() => deleteElement(selectedEl.id)}
                      onForward={() =>
                        reorderElement(selectedEl.id, "forward")
                      }
                      onBack={() => reorderElement(selectedEl.id, "back")}
                      onPatch={(patch) =>
                        updateElement(selectedEl.id, patch)
                      }
                    />
                  )}
                </div>
              </div>

              {/* Bottom toolbar */}
              <div className="relative mt-5 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={handleAddImageClick}
                  className={buttonClass("outline", "sm")}
                >
                  <Icon name="image" className="text-[18px]" />
                  Add Image
                </button>
                <button
                  type="button"
                  onClick={handleAddText}
                  className={buttonClass("outline", "sm")}
                >
                  <Icon name="text_fields" className="text-[18px]" />
                  Add Text
                </button>
                <button
                  type="button"
                  onClick={() => setShowBgPanel((v) => !v)}
                  className={buttonClass(
                    showBgPanel ? "secondary" : "outline",
                    "sm",
                  )}
                >
                  <Icon name="format_color_fill" className="text-[18px]" />
                  Background
                </button>
                <button
                  type="button"
                  onClick={() => void handleAddQr()}
                  className={buttonClass("outline", "sm")}
                >
                  <Icon name="qr_code_2" className="text-[18px]" />
                  QR Code
                </button>

                {/* Background popover */}
                {showBgPanel && (
                  <div className="absolute top-full z-30 mt-2 w-72 rounded-xl border border-outline bg-surface p-4 shadow-xl">
                    <p className="mb-2 text-xs font-semibold text-muted">
                      Background — {activeSide === "front" ? "Front" : "Back"}
                    </p>
                    <div className="mb-3 grid grid-cols-5 gap-2">
                      {BG_PRESETS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          title={p.label}
                          onClick={() => handleSetBg(p.value)}
                          className={cn(
                            "h-9 w-full rounded-md border-2",
                            sideState.bg === p.value
                              ? "border-primary"
                              : "border-black/10",
                          )}
                          style={{ background: p.value }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex flex-1 items-center gap-2 text-xs text-muted">
                        <input
                          type="color"
                          onChange={(e) => handleSetBg(e.target.value)}
                          className="h-8 w-8 cursor-pointer rounded border border-outline bg-transparent p-0"
                        />
                        Custom colour
                      </label>
                      <button
                        type="button"
                        onClick={handleBgImageClick}
                        className={buttonClass("outline", "sm")}
                      >
                        <Icon name="wallpaper" className="text-[16px]" />
                        Image
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* hidden file inputs */}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleImageFile}
              />
              <input
                ref={bgInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleBgFile}
              />

              {avatarUrl && (
                <p className="mt-3 text-center text-[11px] text-faint">
                  Tip: use “Add Image” to drop in your profile photo.
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* ---------------- Material picker ---------------- */}
        <Card className="p-6">
          <SectionHeading icon="style" title="Choose your material" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CARD_MATERIALS.map((mat) => {
              const isSelected = mat.id === materialId;
              const locked = mat.pro && plan === "FREE";
              return (
                <button
                  key={mat.id}
                  type="button"
                  disabled={locked}
                  onClick={() => !locked && setMaterialId(mat.id)}
                  className={cn(
                    "group relative text-left rounded-xl border-2 p-4 transition-all",
                    isSelected
                      ? "border-primary bg-primary-soft/40 shadow-sm"
                      : "border-outline hover:border-primary/40 hover:bg-surface-low",
                    locked && "opacity-70 cursor-not-allowed",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-0.5 h-10 w-14 shrink-0 rounded-md border border-black/10 shadow-inner"
                      style={{ background: mat.swatch }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-semibold text-sm text-ink">
                          {mat.name}
                        </span>
                        {mat.pro && <ProBadge />}
                      </div>
                      <p className="text-xs text-muted mt-0.5 leading-snug">
                        {mat.description}
                      </p>
                      <p className="text-sm font-semibold text-primary-deep mt-1.5">
                        {money(mat.priceCents)}
                        <span className="text-faint font-normal"> / card</span>
                      </p>
                    </div>
                    {isSelected && (
                      <Icon
                        name="check_circle"
                        fill
                        className="text-primary text-[20px] shrink-0"
                      />
                    )}
                  </div>
                  {locked && (
                    <p className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-tertiary">
                      <Icon name="lock" className="text-[14px]" />
                      Upgrade to Pro to order metal cards
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* ---------------- Card name ---------------- */}
        <Card className="p-6">
          <SectionHeading icon="badge" title="Card name" />
          <div>
            <Label htmlFor="cardName">Name for the order</Label>
            <input
              id="cardName"
              type="text"
              value={cardName}
              maxLength={60}
              onChange={(e) => setCardName(e.target.value)}
              className={inputClass}
              placeholder="Your name"
            />
            <p className="mt-1.5 text-xs text-faint">
              This labels your order. Use the designer above for the printed
              artwork.
            </p>
          </div>
        </Card>

        {/* ---------------- Quantity ---------------- */}
        <Card className="p-6">
          <SectionHeading icon="tag" title="Quantity" />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className={buttonClass("outline", "md", "!px-3")}
              aria-label="Decrease quantity"
            >
              <Icon name="remove" className="text-[18px]" />
            </button>
            <input
              type="number"
              min={1}
              max={50}
              value={quantity}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isNaN(n)) return;
                setQuantity(Math.min(50, Math.max(1, Math.floor(n))));
              }}
              className={cn(inputClass, "w-24 text-center")}
            />
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(50, q + 1))}
              className={buttonClass("outline", "md", "!px-3")}
              aria-label="Increase quantity"
            >
              <Icon name="add" className="text-[18px]" />
            </button>
            <span className="text-sm text-muted">cards (1–50)</span>
          </div>
        </Card>

        {/* ---------------- Shipping ---------------- */}
        <Card className="p-6">
          <SectionHeading icon="local_shipping" title="Shipping details" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label htmlFor="shipName">Recipient name</Label>
              <input
                id="shipName"
                type="text"
                value={shipName}
                onChange={(e) => setShipName(e.target.value)}
                className={inputClass}
                placeholder="Full name"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="shipAddress">Address</Label>
              <input
                id="shipAddress"
                type="text"
                value={shipAddress}
                onChange={(e) => setShipAddress(e.target.value)}
                className={inputClass}
                placeholder="Street address"
              />
            </div>
            <div>
              <Label htmlFor="shipCity">City</Label>
              <input
                id="shipCity"
                type="text"
                value={shipCity}
                onChange={(e) => setShipCity(e.target.value)}
                className={inputClass}
                placeholder="City"
              />
            </div>
            <div>
              <Label htmlFor="shipPostal">Postcode</Label>
              <input
                id="shipPostal"
                type="text"
                value={shipPostal}
                onChange={(e) => setShipPostal(e.target.value)}
                className={inputClass}
                placeholder="Postcode"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="shipCountry">Country</Label>
              <input
                id="shipCountry"
                type="text"
                value={shipCountry}
                onChange={(e) => setShipCountry(e.target.value)}
                className={inputClass}
                placeholder="Country"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* RIGHT — sticky summary + submit */}
      <div className="lg:sticky lg:top-6 space-y-6">
        <Card className="p-6">
          <div className="space-y-5">
            <div>
              <h3 className="font-display text-lg font-semibold mb-4">
                Order summary
              </h3>
              <dl className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Material</dt>
                  <dd className="font-medium text-ink flex items-center gap-2">
                    <span
                      className="h-4 w-6 rounded border border-black/10"
                      style={{ background: selectedMaterial.swatch }}
                    />
                    {selectedMaterial.name}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Unit price</dt>
                  <dd className="font-medium text-ink">
                    {money(selectedMaterial.priceCents)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Quantity</dt>
                  <dd className="font-medium text-ink">× {quantity}</dd>
                </div>
                {appliedDiscount && discountOff > 0 && (
                  <div className="flex items-center justify-between text-emerald-600">
                    <dt>Discount ({appliedDiscount.code})</dt>
                    <dd className="font-semibold">− {money(discountOff)}</dd>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-outline pt-3 mt-1">
                  <dt className="font-semibold text-ink">Total</dt>
                  <dd className="font-display text-lg font-bold text-primary-deep">
                    {total}
                  </dd>
                </div>
              </dl>
            </div>

            <div>
              <label
                htmlFor="cardDiscount"
                className="mb-1 block text-xs font-semibold text-muted"
              >
                Discount code (optional)
              </label>
              <div className="flex gap-2">
                <input
                  id="cardDiscount"
                  value={discountCode}
                  onChange={(e) => {
                    setDiscountCode(e.target.value.toUpperCase());
                    setDiscountMsg(null);
                    setAppliedDiscount(null);
                  }}
                  className={`${inputClass} uppercase tracking-wide`}
                  placeholder="e.g. SAVE20"
                />
                <button
                  type="button"
                  onClick={applyDiscount}
                  disabled={checkingDiscount || !discountCode.trim()}
                  className={buttonClass("outline", "md", "shrink-0")}
                >
                  {checkingDiscount ? "…" : "Apply"}
                </button>
              </div>
              {discountMsg && (
                <p
                  className={cn(
                    "mt-1.5 flex items-center gap-1 text-xs font-medium",
                    discountMsg.ok ? "text-emerald-600" : "text-red-600",
                  )}
                >
                  <Icon
                    name={discountMsg.ok ? "check_circle" : "error"}
                    className="text-[14px]"
                  />
                  {discountMsg.text}
                </p>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
                <Icon name="error" className="text-[18px] mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className={buttonClass("primary", "lg", "w-full")}
            >
              {isPending ? (
                <>
                  <Icon
                    name="progress_activity"
                    className="animate-spin text-[20px]"
                  />
                  {phase === "order"
                    ? "Placing order…"
                    : "Preparing artwork…"}
                </>
              ) : (
                <>
                  <Icon name="lock" className="text-[18px]" />
                  Pay &amp; Place Order — {total}
                </>
              )}
            </button>

            <div className="space-y-2.5">
              <p className="flex items-center justify-center gap-1.5 text-xs text-muted">
                <Icon name="shield_lock" className="text-[15px]" />
                Secure checkout. Your NFC card will be pre-linked to your
                account.
              </p>
              <div className="flex justify-center">
                <Badge color="info">Demo mode — no real charge</Badge>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ---------- Off-screen static renderers for PNG export ---------- */}
      <div
        aria-hidden
        style={{ position: "fixed", left: -99999, top: 0 }}
      >
        <StaticCard side={front} cardRef={frontExportRef} />
        <StaticCard side={back} cardRef={backExportRef} />
      </div>

      {studioCrop && (
        <ImageCropperModal
          src={studioCrop.src}
          title={
            studioCrop.kind === "bg" ? "Crop background image" : "Crop image"
          }
          aspect={studioCrop.kind === "bg" ? CARD_W / CARD_H : 1}
          onCancel={() => setStudioCrop(null)}
          onSave={onStudioCropSave}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Resize handle style                                                       */
/* -------------------------------------------------------------------------- */

const handleStyle: CSSProperties = {
  width: 12,
  height: 12,
  borderRadius: 9999,
  background: "#ffffff",
  border: "2px solid #4f46e5",
  boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
};

/* -------------------------------------------------------------------------- */
/*  Selected-element floating toolbar                                         */
/* -------------------------------------------------------------------------- */

function SelectedToolbar({
  el,
  onDelete,
  onForward,
  onBack,
  onPatch,
}: {
  el: CardElement;
  onDelete: () => void;
  onForward: () => void;
  onBack: () => void;
  onPatch: (patch: Partial<CardElement>) => void;
}) {
  return (
    <div className="absolute left-1/2 top-full z-40 mt-3 w-[min(100%,360px)] -translate-x-1/2 rounded-xl border border-outline bg-surface p-3 shadow-xl">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted capitalize">
          {el.type} element
        </span>
        <div className="flex items-center gap-1">
          <IconBtn icon="flip_to_front" title="Bring forward" onClick={onForward} />
          <IconBtn icon="flip_to_back" title="Send back" onClick={onBack} />
          <IconBtn icon="delete" title="Delete" onClick={onDelete} danger />
        </div>
      </div>

      {el.type === "text" && (
        <div className="space-y-3">
          <textarea
            value={el.text ?? ""}
            onChange={(e) => onPatch({ text: e.target.value })}
            rows={2}
            className={cn(inputClass, "resize-none text-sm")}
            placeholder="Text content"
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-muted">
              Colour
              <input
                type="color"
                value={el.color ?? "#111111"}
                onChange={(e) => onPatch({ color: e.target.value })}
                className="h-7 w-7 cursor-pointer rounded border border-outline bg-transparent p-0"
              />
            </label>

            <label className="flex flex-1 items-center gap-2 text-xs text-muted">
              Size
              <input
                type="range"
                min={10}
                max={60}
                value={el.fontSize ?? 22}
                onChange={(e) =>
                  onPatch({ fontSize: Number(e.target.value) })
                }
                className="flex-1 accent-primary"
              />
              <span className="w-7 text-right tabular-nums text-ink">
                {el.fontSize ?? 22}
              </span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                onPatch({
                  fontWeight: (el.fontWeight ?? 600) >= 700 ? 500 : 800,
                })
              }
              className={cn(
                "rounded-md border-2 px-2.5 py-1 text-sm font-bold transition-colors",
                (el.fontWeight ?? 600) >= 700
                  ? "border-primary bg-primary-soft/40 text-primary-deep"
                  : "border-outline text-muted hover:border-primary/40",
              )}
              title="Bold"
            >
              B
            </button>
            <div className="flex items-center gap-1">
              {(["left", "center", "right"] as const).map((a) => (
                <IconBtn
                  key={a}
                  icon={`format_align_${a}`}
                  title={`Align ${a}`}
                  active={(el.align ?? "center") === a}
                  onClick={() => onPatch({ align: a })}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IconBtn({
  icon,
  title,
  onClick,
  active,
  danger,
}: {
  icon: string;
  title: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md border-2 transition-colors",
        danger
          ? "border-outline text-muted hover:border-red-300 hover:bg-red-50 hover:text-red-600"
          : active
            ? "border-primary bg-primary-soft/40 text-primary-deep"
            : "border-outline text-muted hover:border-primary/40 hover:text-ink",
      )}
    >
      <Icon name={icon} className="text-[18px]" />
    </button>
  );
}
