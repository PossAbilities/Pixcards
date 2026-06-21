import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GDPR right to access / portability: download everything we hold about the
 * signed-in user as a JSON file.
 */
export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    include: {
      profile: { include: { links: true } },
      orders: true,
      cards: true,
      redemptions: { include: { code: { select: { code: true } } } },
      emails: true,
    },
  });
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Strip the password hash — never export credentials.
  const { passwordHash: _omit, ...safeUser } = user;
  void _omit;

  const payload = {
    exportedAt: new Date().toISOString(),
    account: safeUser,
  };

  const filename = `pixcards-data-${user.id}.json`;
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
