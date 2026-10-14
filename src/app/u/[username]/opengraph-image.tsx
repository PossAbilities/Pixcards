import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";
import { OG_SIZE, OgLogo, ogFonts } from "@/lib/og";

export const alt = "Digital business card on Pixcards";
export const size = OG_SIZE;
export const contentType = "image/png";

/** Inline a remote avatar so a slow or missing image can't break the render. */
async function avatarSrc(url: string | null): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("data:")) return url;
  if (!/^https?:\/\//.test(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !/^image\/(png|jpe?g|webp|gif)/.test(type)) return null;
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

/** Shorten to `max` characters on a word boundary, with an ellipsis. */
function clamp(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export default async function ProfileImage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await prisma.profile.findUnique({
    where: { username },
    select: {
      published: true,
      jobTitle: true,
      company: true,
      avatarUrl: true,
      accentColor: true,
      user: { select: { name: true } },
    },
  });
  // Unpublished or unknown cards get the generic brand image — nothing private leaks.
  const show = profile?.published ? profile : null;
  const fullName = show?.user.name || "Digital business card";
  const name = clamp(fullName, 44);
  const subtitle = clamp(show ? [show.jobTitle, show.company].filter(Boolean).join(" · ") : "", 90);
  const avatar = await avatarSrc(show?.avatarUrl ?? null);
  const accent = show?.accentColor && /^#[0-9a-f]{6}$/i.test(show.accentColor) ? show.accentColor : "#4f46e5";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #4f46e5 0%, #3525cd 100%)",
          fontFamily: "Body",
        }}
      >
        <div
          style={{
            width: 1000,
            height: 470,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 60,
            borderRadius: 40,
            background: "#ffffff",
            boxShadow: "0 30px 60px rgba(0,0,0,0.25)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 44 }}>
            {avatar ? (
              <img src={avatar} width={180} height={180} alt="" style={{ borderRadius: 90, objectFit: "cover" }} />
            ) : (
              <div
                style={{
                  width: 180,
                  height: 180,
                  borderRadius: 90,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: accent,
                  color: "#ffffff",
                  fontFamily: "Montserrat",
                  fontSize: 68,
                }}
              >
                {show ? initials(fullName) : "P"}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 14, width: 640, maxHeight: 260, overflow: "hidden" }}>
              <div
                style={{
                  fontFamily: "Montserrat",
                  fontSize: name.length > 30 ? 46 : name.length > 20 ? 56 : 66,
                  color: "#191c1e",
                  letterSpacing: -1.5,
                  lineHeight: 1.08,
                  wordBreak: "break-word",
                }}
              >
                {name}
              </div>
              {subtitle && (
                <div style={{ fontSize: 30, lineHeight: 1.3, color: "#464555", wordBreak: "break-word" }}>
                  {subtitle}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <OgLogo size={44} color="#3525cd" />
            <div style={{ fontSize: 26, color: "#464555" }}>Tap or scan to connect</div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: ogFonts() },
  );
}
