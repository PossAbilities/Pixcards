import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";

const TONES = {
  success: { box: "border-emerald-200 bg-emerald-50 text-emerald-800", icon: "check_circle" },
  info: { box: "border-blue-200 bg-blue-50 text-blue-800", icon: "info" },
  warning: { box: "border-amber-200 bg-amber-50 text-amber-800", icon: "warning" },
} as const;

/** A one-line status banner, e.g. after a redirect ("Payment received"). */
export function Notice({
  tone = "success",
  children,
  className,
}: {
  tone?: keyof typeof TONES;
  children: React.ReactNode;
  className?: string;
}) {
  const t = TONES[tone];
  return (
    <div
      role="status"
      className={cn("flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium", t.box, className)}
    >
      <Icon name={t.icon} fill className="mt-0.5 shrink-0 text-[18px]" />
      <span>{children}</span>
    </div>
  );
}
