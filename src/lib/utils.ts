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
/** Fold a long vCard line to 75 octets per RFC 2426 (continuations start with a space). */
function foldVCardLine(line: string): string {
  if (line.length <= 75) return line;
  const out = [line.slice(0, 75)];
  let i = 75;
  while (i < line.length) {
    out.push(" " + line.slice(i, i + 74));
    i += 74;
  }
  return out.join("\r\n");
}

export function buildVCard(opts: {
  name: string;
  jobTitle?: string;
  company?: string;
  phone?: string;
  email?: string;
  url?: string;
  /** Raw base64 (no data: prefix) of the contact photo. */
  photoBase64?: string;
  photoType?: "JPEG" | "PNG";
}): string {
  // Escape vCard special characters.
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1");
  // Split the display name into given / family for the structured N field —
  // iOS Contacts needs N to render the name, not just FN.
  const parts = opts.name.trim().split(/\s+/);
  const first = parts.shift() ?? "";
  const last = parts.join(" ");

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${esc(last)};${esc(first)};;;`,
    `FN:${esc(opts.name)}`,
    opts.company ? `ORG:${esc(opts.company)}` : "",
    opts.jobTitle ? `TITLE:${esc(opts.jobTitle)}` : "",
    opts.phone ? `TEL;TYPE=CELL:${opts.phone}` : "",
    opts.email ? `EMAIL;TYPE=WORK:${opts.email}` : "",
    opts.url ? `URL:${opts.url}` : "",
    opts.photoBase64
      ? foldVCardLine(
          `PHOTO;ENCODING=b;TYPE=${opts.photoType ?? "JPEG"}:${opts.photoBase64}`,
        )
      : "",
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
