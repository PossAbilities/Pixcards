/**
 * Organisation card template — a front + back design the org creates once and
 * every member's physical card is rendered from, with their own details merged
 * into the {{tokens}}. Coordinates are normalised (0–1) so the editor canvas
 * size and the print resolution stay in sync. Shared by the client designer
 * and the server-side renderer.
 */

export const CARD_RATIO = 1013 / 638; // ~CR80

export type TemplateElementKind = "text" | "image" | "qr" | "nfc";

export type TemplateElement = {
  id: string;
  kind: TemplateElementKind;
  x: number; // 0–1 (fraction of width)
  y: number; // 0–1 (fraction of height)
  w: number; // 0–1
  h: number; // 0–1
  // text
  text?: string; // may contain {{name}} {{title}} {{company}} {{url}}
  color?: string;
  fontSize?: number; // px at the 638px reference height
  fontWeight?: number;
  align?: "left" | "center" | "right";
  // Raw Pango markup rendered instead of `text` server-side (e.g. a two-tone
  // wordmark). `text` is still the plain fallback used by the editor preview.
  richText?: string;
  // image / nfc
  src?: string; // data URL for uploaded images
  nfcColor?: string; // colour for the NFC mark
};

export type SideSpec = {
  bg: string; // hex, css gradient, or url("data:…")
  elements: TemplateElement[];
};

export type CardTemplateSpec = {
  front: SideSpec;
  back: SideSpec;
};

export type MergeData = {
  name: string;
  jobTitle: string;
  company: string;
  url: string;
  email?: string;
  phone?: string;
  location?: string;
};

/** True when the org has actually designed a template (vs the empty default). */
export function hasTemplate(spec: CardTemplateSpec | null): boolean {
  if (!spec) return false;
  return (
    (spec.front?.elements?.length ?? 0) > 0 ||
    (spec.back?.elements?.length ?? 0) > 0
  );
}

/** Parse a stored design JSON string into a template spec, or null. */
export function parseTemplate(raw: string | null | undefined): CardTemplateSpec | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<CardTemplateSpec>;
    if (v && (v.front || v.back)) {
      return {
        front: { bg: v.front?.bg ?? "#4f46e5", elements: v.front?.elements ?? [] },
        back: { bg: v.back?.bg ?? "#111827", elements: v.back?.elements ?? [] },
      };
    }
  } catch {
    /* not a template */
  }
  return null;
}

/** Replace merge tokens in a text string with the member's details. */
export function applyMerge(text: string, m: MergeData): string {
  return (text || "")
    .replace(/\{\{\s*name\s*\}\}/gi, m.name)
    .replace(/\{\{\s*(title|jobtitle|role)\s*\}\}/gi, m.jobTitle)
    .replace(/\{\{\s*company\s*\}\}/gi, m.company)
    .replace(/\{\{\s*(url|link)\s*\}\}/gi, m.url)
    .replace(/\{\{\s*email\s*\}\}/gi, m.email ?? "")
    .replace(/\{\{\s*phone\s*\}\}/gi, m.phone ?? "")
    .replace(/\{\{\s*location\s*\}\}/gi, m.location ?? "");
}

export const MERGE_FIELDS: { token: string; label: string }[] = [
  { token: "{{name}}", label: "Name" },
  { token: "{{title}}", label: "Job title" },
  { token: "{{company}}", label: "Company" },
  { token: "{{url}}", label: "Profile URL" },
  { token: "{{email}}", label: "Email" },
  { token: "{{phone}}", label: "Phone" },
  { token: "{{location}}", label: "Location" },
];

export const SAMPLE_MERGE: MergeData = {
  name: "Alex Member",
  jobTitle: "Account Manager",
  company: "Your Company",
  url: "pixcards.co.uk/u/alex",
  email: "alex@yourcompany.com",
  phone: "+44 7700 900123",
};
