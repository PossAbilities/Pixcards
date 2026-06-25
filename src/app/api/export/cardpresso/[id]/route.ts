import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { appUrl } from "@/lib/constants";

export const runtime = "nodejs";

type Design = { frontImage?: string; backImage?: string };

/** Decode a data-URI or fetch a URL into PNG bytes. */
async function toBytes(value?: string): Promise<Buffer | null> {
  if (!value) return null;
  try {
    if (value.startsWith("data:")) {
      const m = /^data:[^;]+;base64,([\s\S]+)$/.exec(value);
      return m ? Buffer.from(m[1], "base64") : null;
    }
    const res = await fetch(value);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

function csvCell(v: string): string {
  return `"${(v ?? "").replace(/"/g, '""')}"`;
}

/**
 * GET /api/export/cardpresso/<orderId>  (admin only)
 * Returns a ZIP: card artwork PNG(s) + cards.csv. Import cards.csv into
 * CardPresso as a database to batch-print, with the image columns linked
 * to the included PNG files.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getSessionUser();
  if (!viewer || viewer.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: { include: { profile: true } },
      cards: {
        include: { user: { include: { profile: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let design: Design = {};
  try {
    design = JSON.parse(order.design) as Design;
  } catch {
    /* no design */
  }

  const zip = new JSZip();
  const front = await toBytes(design.frontImage);
  const back = await toBytes(design.backImage);
  if (front) zip.file("front.png", front);
  if (back) zip.file("back.png", back);

  const base = appUrl();
  const header = [
    "Code",
    "Name",
    "JobTitle",
    "Company",
    "ProfileURL",
    "FrontImage",
    "BackImage",
  ].join(",");

  // One row per pre-linked card (team order), or a single row for the order.
  const rows: string[] = [];
  const list =
    order.cards.length > 0
      ? order.cards.map((c) => ({
          code: c.code,
          name: c.user?.name ?? order.user.name,
          jobTitle: c.user?.profile?.jobTitle ?? "",
          company: c.user?.profile?.company ?? "",
          username: c.user?.profile?.username ?? order.user.profile?.username ?? "",
        }))
      : [
          {
            code: "",
            name: order.user.name,
            jobTitle: order.user.profile?.jobTitle ?? "",
            company: order.user.profile?.company ?? "",
            username: order.user.profile?.username ?? "",
          },
        ];

  for (const r of list) {
    rows.push(
      [
        csvCell(r.code),
        csvCell(r.name),
        csvCell(r.jobTitle),
        csvCell(r.company),
        csvCell(r.username ? `${base}/u/${r.username}` : ""),
        csvCell(front ? "front.png" : ""),
        csvCell(back ? "back.png" : ""),
      ].join(","),
    );
  }

  zip.file("cards.csv", [header, ...rows].join("\r\n"));
  zip.file(
    "README.txt",
    [
      "Pixcards → CardPresso export",
      "",
      "1. Unzip this folder.",
      "2. In CardPresso: Database → connect → choose cards.csv.",
      "3. Map the text fields (Name, JobTitle, Company) to your card design,",
      "   add a QR field linked to ProfileURL, and link the image field to",
      "   the FrontImage / BackImage column (the PNGs are in this folder).",
      "4. Print → it batches every row as a card.",
    ].join("\n"),
  );

  const buf = await zip.generateAsync({ type: "nodebuffer" });
  const shortId = order.id.slice(-8).toUpperCase();
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="pixcards-cardpresso-${shortId}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
