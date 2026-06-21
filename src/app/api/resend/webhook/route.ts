import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";

/**
 * Resend webhook. In the Resend dashboard add an endpoint pointing at
 * /api/resend/webhook subscribed to email.* events, enable Open + Click
 * tracking on your domain, and set RESEND_WEBHOOK_SECRET (the whsec_… signing
 * secret). Resend signs with Svix headers; we verify them here.
 */

// Status precedence so a late "delivered" can't clobber an "opened"/"clicked".
const RANK: Record<string, number> = {
  sent: 1,
  delivered: 2,
  opened: 3,
  clicked: 4,
};

function verifySvix(
  secret: string,
  id: string,
  timestamp: string,
  body: string,
  signatureHeader: string,
): boolean {
  try {
    const secretBytes = Buffer.from(secret.split("_")[1] ?? secret, "base64");
    const signed = `${id}.${timestamp}.${body}`;
    const expected = crypto
      .createHmac("sha256", secretBytes)
      .update(signed)
      .digest("base64");
    // Header is space-separated "v1,<sig>" pairs.
    return signatureHeader.split(" ").some((part) => {
      const sig = part.includes(",") ? part.split(",")[1] : part;
      if (!sig || sig.length !== expected.length) return false;
      return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    });
  } catch {
    return false;
  }
}

type ResendEvent = {
  type?: string;
  data?: { email_id?: string };
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  const secret = process.env.RESEND_WEBHOOK_SECRET;

  if (secret) {
    const id = req.headers.get("svix-id") ?? "";
    const timestamp = req.headers.get("svix-timestamp") ?? "";
    const signature = req.headers.get("svix-signature") ?? "";
    if (!id || !timestamp || !signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }
    if (!verifySvix(secret, id, timestamp, body, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  }

  let event: ResendEvent;
  try {
    event = JSON.parse(body) as ResendEvent;
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  const resendId = event.data?.email_id;
  const type = event.type ?? "";
  if (!resendId) return NextResponse.json({ received: true });

  const msg = await prisma.emailMessage.findUnique({ where: { resendId } });
  if (!msg) return NextResponse.json({ received: true });

  const now = new Date();
  const data: Record<string, unknown> = {};

  switch (type) {
    case "email.delivered":
      if ((RANK[msg.status] ?? 0) < RANK.delivered) data.status = "delivered";
      break;
    case "email.opened":
      data.opens = { increment: 1 };
      if (!msg.openedAt) data.openedAt = now;
      if ((RANK[msg.status] ?? 0) < RANK.opened) data.status = "opened";
      break;
    case "email.clicked":
      data.clicks = { increment: 1 };
      if (!msg.clickedAt) data.clickedAt = now;
      if ((RANK[msg.status] ?? 0) < RANK.clicked) data.status = "clicked";
      break;
    case "email.bounced":
      data.status = "bounced";
      break;
    case "email.complained":
      data.status = "complained";
      break;
    default:
      return NextResponse.json({ received: true });
  }

  await prisma.emailMessage
    .update({ where: { id: msg.id }, data })
    .catch(() => {});
  return NextResponse.json({ received: true });
}
