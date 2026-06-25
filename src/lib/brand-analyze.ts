import "server-only";

/**
 * Brand-guidelines analysis via the Claude API. The admin uploads their brand
 * guidelines (image / PDF / HTML) and Claude extracts a palette + the closest
 * Pixcards theme/layout, which we pre-fill into the org brand template.
 */

export type BrandInput =
  | { kind: "image"; mediaType: string; base64: string }
  | { kind: "pdf"; base64: string }
  | { kind: "html"; text: string };

export type BrandSuggestion = {
  primary: string;
  accent: string;
  background: string;
  ink: string;
  themeId: string;
  template: string;
  summary: string;
};

const VALID_THEMES = ["indigo", "midnight", "ruby", "emerald", "slate"];
const VALID_TEMPLATES = ["classic", "minimal", "grid", "spotlight"];

export function brandAnalysisEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const hex = (v: unknown, fallback: string): string =>
  typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback;

export async function analyzeBrand(input: BrandInput): Promise<BrandSuggestion> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Brand analysis isn't configured (ANTHROPIC_API_KEY).");
  const model = process.env.BRAND_ANALYZE_MODEL || "claude-sonnet-4-6";

  const instruction =
    `You are a brand designer. Study the attached brand guidelines and extract the visual brand. ` +
    `Respond with ONLY a JSON object (no prose, no code fences) with keys: ` +
    `primary (hex #rrggbb), accent (hex), background (hex), ink (hex text colour), ` +
    `themeId (the closest of: ${VALID_THEMES.join(", ")}), ` +
    `template (one of: ${VALID_TEMPLATES.join(", ")}), ` +
    `summary (one short sentence on the brand's visual style).`;

  const content: Record<string, unknown>[] = [];
  if (input.kind === "image") {
    content.push({
      type: "image",
      source: { type: "base64", media_type: input.mediaType, data: input.base64 },
    });
  } else if (input.kind === "pdf") {
    content.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: input.base64 },
    });
  } else {
    content.push({
      type: "text",
      text: `Brand guidelines (HTML source):\n${input.text.slice(0, 80000)}`,
    });
  }
  content.push({ type: "text", text: instruction });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 500,
      messages: [{ role: "user", content }],
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`AI service error (${res.status}). ${detail.slice(0, 160)}`);
  }

  const json = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text =
    json.content?.find((c) => c.type === "text")?.text?.trim() ?? "";
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
  } catch {
    throw new Error("Couldn't read the brand colours from that file — try a clearer guidelines page.");
  }

  const primary = hex(parsed.primary, "#4f46e5");
  return {
    primary,
    accent: hex(parsed.accent, primary),
    background: hex(parsed.background, "#ffffff"),
    ink: hex(parsed.ink, "#191c1e"),
    themeId: VALID_THEMES.includes(String(parsed.themeId)) ? String(parsed.themeId) : "indigo",
    template: VALID_TEMPLATES.includes(String(parsed.template)) ? String(parsed.template) : "classic",
    summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 200) : "",
  };
}
