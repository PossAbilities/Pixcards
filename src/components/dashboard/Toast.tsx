"use client";

import { useEffect } from "react";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";

export type ToastState = {
  message: string;
  kind: "success" | "error";
} | null;

export function Toast({
  toast,
  onClose,
}: {
  toast: ToastState;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-24 md:bottom-6 right-4 z-50">
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg",
          toast.kind === "success" ? "bg-emerald-600" : "bg-red-600",
        )}
        role="status"
      >
        <Icon
          name={toast.kind === "success" ? "check_circle" : "error"}
          fill
          className="text-[20px]"
        />
        {toast.message}
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          className="ml-1 opacity-80 hover:opacity-100"
        >
          <Icon name="close" className="text-[18px]" />
        </button>
      </div>
    </div>
  );
}
