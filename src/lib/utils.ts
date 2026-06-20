// Framework-agnostic helpers (safe for client + server).

/** Tiny classnames combiner. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Make a URL-safe slug from a name. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

/** Initials for avatar fallback. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Deterministic pastel colour from a string (for avatar fallbacks). */
export function colorFromString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 55% 55%)`;
}

/** Build an RFC-6350 vCard string for "Save Contact". */
export function buildVCard(opts: {
  name: string;
  jobTitle?: string;
  company?: string;
  phone?: string;
  email?: string;
  url?: string;
}): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${opts.name}`,
    opts.company ? `ORG:${opts.company}` : "",
    opts.jobTitle ? `TITLE:${opts.jobTitle}` : "",
    opts.phone ? `TEL;TYPE=CELL:${opts.phone}` : "",
    opts.email ? `EMAIL;TYPE=WORK:${opts.email}` : "",
    opts.url ? `URL:${opts.url}` : "",
    "END:VCARD",
  ].filter(Boolean);
  return lines.join("\r\n");
}

export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  const units: [number, string][] = [
    [60, "s"],
    [60, "m"],
    [24, "h"],
    [7, "d"],
    [4.34, "w"],
    [12, "mo"],
    [Number.POSITIVE_INFINITY, "y"],
  ];
  let val = secs;
  let unit = "s";
  for (const [size, label] of units) {
    if (val < size) {
      unit = label;
      break;
    }
    val = Math.floor(val / size);
    unit = label;
  }
  return `${val}${unit} ago`;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
