"use client";

import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Icon } from "@/components/Icon";
import { buttonClass } from "@/components/ui";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

/** Render the selected crop area to a JPEG blob (capped to ~1024px on the long edge). */
async function getCroppedBlob(src: string, area: Area): Promise<Blob> {
  const image = await loadImage(src);
  const maxEdge = 1024;
  const scale = Math.min(1, maxEdge / Math.max(area.width, area.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(area.width * scale));
  canvas.height = Math.max(1, Math.round(area.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Crop failed"))),
      "image/jpeg",
      0.9,
    ),
  );
}

export function ImageCropperModal({
  src,
  aspect,
  round = false,
  title,
  onCancel,
  onSave,
}: {
  src: string;
  aspect: number;
  round?: boolean;
  title: string;
  onCancel: () => void;
  onSave: (blob: Blob) => void | Promise<void>;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setAreaPixels(pixels);
  }, []);

  async function handleSave() {
    if (!areaPixels) return;
    setSaving(true);
    try {
      const blob = await getCroppedBlob(src, areaPixels);
      await onSave(blob);
    } catch {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
          <h3 className="font-display font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-high hover:text-ink"
          >
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>

        <div className="relative h-72 bg-black sm:h-80">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={round ? "round" : "rect"}
            showGrid={!round}
            restrictPosition
            zoomSpeed={0.2}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <Icon name="zoom_out" className="text-[20px] text-muted" />
            <input
              type="range"
              min={1}
              max={4}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              aria-label="Zoom"
              className="h-2 flex-1 cursor-pointer accent-primary"
            />
            <Icon name="zoom_in" className="text-[20px] text-muted" />
          </div>
          <p className="text-center text-xs text-faint">
            Drag the photo to reposition · use the slider (or pinch) to zoom
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className={buttonClass("ghost", "md")}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !areaPixels}
              className={buttonClass("primary", "md")}
            >
              {saving ? (
                <>
                  <Icon
                    name="progress_activity"
                    className="animate-spin text-[18px]"
                  />
                  Saving…
                </>
              ) : (
                <>
                  <Icon name="check" className="text-[18px]" />
                  Save photo
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
