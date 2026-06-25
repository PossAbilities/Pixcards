import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { appUrl } from "@/lib/constants";
import { renderCardSide } from "@/lib/card-artwork";
import { parseTemplate } from "@/lib/card-template";

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

  // Org card-design settings (brand colours / NFC logo) for team orders. The
  // order is placed by the org owner, so resolve the org from that membership.
  const membership = await prisma.orgMember.findUnique({
    where: { userId: order.userId },
    include: { org: true },
  });
  const useBrand = membership?.org.cardUseBrand ?? true;
  const nfcLogo = membership?.org.cardNfcLogo ?? false;
  const template = parseTemplate(membership?.org.cardDesign);

  const zip = new JSZip();
  const base = appUrl();
  const header = [
    "Code",
    "Name",
    "JobTitle",
    "Company",
    "ProfileURL",
    "Print",
    "Back",
  ].join(",");
  const rows: string[] = [];

  if (order.cards.length > 0) {
    // Team order — bake a print-ready PNG per member (name/role/QR included).
    for (const c of order.cards) {
      const p = c.user?.profile;
      const username = p?.username ?? "";
      const profileUrl = username ? `${base}/u/${username}` : base;
      const frontFile = `card-${c.code}-front.png`;
      const backFile = `card-${c.code}-back.png`;
      const common = {
        template,
        name: c.user?.name ?? order.user.name,
        jobTitle: p?.jobTitle,
        company: p?.company,
        accentColor: p?.accentColor ?? "#4f46e5",
        brandHeader: useBrand ? p?.brandHeader : null,
        profileUrl,
        nfcLogo,
      };
      let haveFront = false;
      let haveBack = false;
      try {
        zip.file(frontFile, await renderCardSide({ ...common, side: "front" }));
        haveFront = true;
      } catch {
        /* skip front, keep the row */
      }
      try {
        zip.file(backFile, await renderCardSide({ ...common, side: "back" }));
        haveBack = true;
      } catch {
        /* skip back */
      }
      rows.push(
        [
          csvCell(c.code),
          csvCell(c.user?.name ?? ""),
          csvCell(p?.jobTitle ?? ""),
          csvCell(p?.company ?? ""),
          csvCell(username ? profileUrl : ""),
          csvCell(haveFront ? frontFile : ""),
          csvCell(haveBack ? backFile : ""),
        ].join(","),
      );
    }
  } else {
    // Single order — use the artwork designed in the studio.
    const front = await toBytes(design.frontImage);
    const back = await toBytes(design.backImage);
    if (front) zip.file("front.png", front);
    if (back) zip.file("back.png", back);
    const p = order.user.profile;
    rows.push(
      [
        csvCell(""),
        csvCell(order.user.name),
        csvCell(p?.jobTitle ?? ""),
        csvCell(p?.company ?? ""),
        csvCell(p?.username ? `${base}/u/${p.username}` : ""),
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
      "This folder contains a print-ready card image per person plus a",
      "cards.csv database to batch-print them in CardPresso.",
      "",
      "Quickest (use the baked images):",
      "1. Unzip this folder.",
      "2. New CardPresso card at CR80 size (with bleed), double-sided.",
      "3. Database -> connect -> cards.csv.",
      "4. Add a full-card image field on the FRONT linked to the 'Print'",
      "   column, and one on the BACK linked to the 'Back' column",
      "   (card-*-front.png / card-*-back.png have each person's details,",
      "   QR and brand baked in).",
      "5. Print -> it batches every row, both sides.",
      "",
      "Or build your own design and use the text columns (Name, JobTitle,",
      "Company) + a QR field linked to ProfileURL.",
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
