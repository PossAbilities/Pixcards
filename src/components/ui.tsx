import { cn } from "@/lib/utils";
import { Icon } from "./Icon";

/* ----------------------------- Button styles ----------------------------- */

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "dark";
type Size = "sm" | "md" | "lg";

export function buttonClass(
  variant: Variant = "primary",
  size: Size = "md",
  extra?: string,
): string {
  const base =
    "inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all active:scale-[0.97] disabled:opacity-60 disabled:pointer-events-none whitespace-nowrap";
  const sizes: Record<Size, string> = {
    sm: "text-sm px-3 py-1.5",
    md: "text-sm px-5 py-2.5",
    lg: "text-base px-6 py-3",
  };
  const variants: Record<Variant, string> = {
    primary:
      "bg-primary text-white shadow-sm shadow-primary/30 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/40",
    secondary: "bg-primary-soft text-primary-deep hover:bg-primary-soft/70",
    outline:
      "border-2 border-outline text-ink hover:bg-surface-low hover:border-primary/40",
    ghost: "text-muted hover:bg-surface-high/60 hover:text-ink",
    danger: "bg-danger text-white hover:brightness-110",
    dark: "bg-ink text-white hover:opacity-90",
  };
  return cn(base, sizes[size], variants[variant], extra);
}

/* -------------------------------- Badge ----------------------------------- */

export function Badge({
  children,
  color = "neutral",
  className,
}: {
  children: React.ReactNode;
  color?: "neutral" | "primary" | "success" | "warning" | "danger" | "info";
  className?: string;
}) {
  const colors: Record<string, string> = {
    neutral: "bg-surface-high text-muted",
    primary: "bg-primary-soft text-primary-deep",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-red-100 text-red-700",
    info: "bg-blue-100 text-blue-700",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold",
        colors[color],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------- Card ------------------------------------ */

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-surface rounded-2xl border border-black/5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* -------------------------- Section heading (icon) ------------------------ */

export function SectionHeading({
  icon,
  title,
  action,
}: {
  icon: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2">
        <Icon name={icon} className="text-primary text-[22px]" />
        <h3 className="font-display text-lg font-semibold">{title}</h3>
      </div>
      {action}
    </div>
  );
}

/* ------------------------------ Pro badge --------------------------------- */

export function ProBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 bg-gradient-to-r from-tertiary-bright to-tertiary text-white px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide",
        className,
      )}
    >
      <Icon name="bolt" className="text-[12px] fill" />
      PRO
    </span>
  );
}

/* ------------------------------ Form fields ------------------------------- */

export function Label({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-xs font-semibold text-muted mb-1.5 block"
    >
      {children}
    </label>
  );
}

export const inputClass =
  "w-full px-4 py-2.5 rounded-lg border border-outline bg-surface text-ink placeholder:text-faint/70 focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition";
