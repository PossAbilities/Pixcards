"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { buttonClass } from "@/components/ui";
import type { CardData } from "@/components/DigitalCard";
import { PhonePreview } from "./PhonePreview";

/**
 * Dashboard home: the live page shown properly (true-scale phone preview)
 * with share tools and a single path into editing.
 */
export function ProfileShowcase({
  data,
  shareUrl,
  accent,
}: {
  data: CardData;
  shareUrl: string;
  accent: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  async function downloadQr() {
    const url = `/api/qr?data=${encodeURIComponent(shareUrl)}&color=${encodeURIComponent(accent)}`;
    try {
      const res = await fetch(url);
      const svg = await res.text();
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = "pixcards-qr.svg";
      a.click();
      URL.revokeObjectURL(href);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-5">
      <PhonePreview data={data} />

      <div className="flex w-full flex-col gap-2">
        <Link href="/dashboard/edit" className={buttonClass("primary", "lg", "w-full")}>
          <Icon name="edit" className="text-[20px]" />
          Edit your profile
        </Link>
        <a
          href={shareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass("outline", "md", "w-full")}
        >
          <Icon name="open_in_new" className="text-[18px]" />
          View live page
        </a>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={downloadQr} className={buttonClass("dark", "md")}>
            <Icon name="qr_code_2" className="text-[18px]" />
            QR Code
          </button>
          <button type="button" onClick={copy} className={buttonClass("outline", "md")}>
            <Icon name={copied ? "check" : "content_copy"} className="text-[18px]" />
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>
      </div>
    </div>
  );
}
