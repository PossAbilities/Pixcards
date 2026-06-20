"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";

export function SharePanel({
  shareUrl,
  accentColor,
  name,
}: {
  shareUrl: string;
  accentColor: string;
  name: string;
}) {
  const [qrOpen, setQrOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const qrSrc = `/api/qr?data=${encodeURIComponent(shareUrl)}&color=${encodeURIComponent(
    accentColor,
  )}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  // Close the modal on Escape and lock body scroll while open.
  useEffect(() => {
    if (!qrOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setQrOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [qrOpen]);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setQrOpen(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-surface px-4 py-3 text-sm font-semibold text-ink shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md active:scale-95"
        >
          <Icon name="qr_code_2" className="text-[20px]" />
          Show QR Code
        </button>
        <button
          type="button"
          onClick={copyLink}
          className="flex items-center justify-center gap-2 rounded-xl bg-surface px-4 py-3 text-sm font-semibold text-ink shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md active:scale-95"
        >
          <Icon name={copied ? "check" : "content_copy"} className="text-[20px]" />
          {copied ? "Copied!" : "Copy Link"}
        </button>
      </div>
      <p className="text-center text-xs text-faint">
        Tip: add this card to your home screen for one-tap sharing.
      </p>

      {qrOpen && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`QR code for ${name}`}
          onClick={() => setQrOpen(false)}
        >
          <div
            className="relative w-full max-w-xs rounded-3xl bg-white p-7 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setQrOpen(false)}
              aria-label="Close"
              className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <Icon name="close" className="text-[22px]" />
            </button>

            <h2 className="font-display text-lg font-bold text-slate-900">
              {name}
            </h2>
            <p className="mt-1 text-xs text-slate-500">Scan to open this card</p>

            <div className="mx-auto mt-5 w-fit rounded-2xl bg-white p-3 ring-1 ring-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrSrc}
                alt={`QR code linking to ${name}'s card`}
                width={220}
                height={220}
                className="h-[220px] w-[220px]"
              />
            </div>

            <p className="mt-4 break-all text-xs font-medium text-slate-400">
              {shareUrl}
            </p>

            <button
              type="button"
              onClick={copyLink}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition active:scale-95"
              style={{ background: accentColor }}
            >
              <Icon name={copied ? "check" : "content_copy"} className="text-[18px]" />
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
