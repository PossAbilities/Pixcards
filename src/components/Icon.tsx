import { cn } from "@/lib/utils";

export function Icon({
  name,
  className,
  fill,
  style,
}: {
  name: string;
  className?: string;
  fill?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={cn("material-symbols-outlined", fill && "fill", className)}
      style={style}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
