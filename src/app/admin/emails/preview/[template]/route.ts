import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { appUrl } from "@/lib/constants";
import {
  welcomeEmail,
  orderReceiptEmail,
  proWelcomeEmail,
  orderShippedEmail,
  passwordResetEmail,
  marketingEmail,
  type BuiltEmail,
} from "@/lib/email/templates";

const base = appUrl();

const SAMPLES: Record<string, () => BuiltEmail> = {
  welcome: () =>
    welcomeEmail({
      name: "Alex Morgan",
      shareUrl: `${base}/u/alexmorgan`,
      dashboardUrl: `${base}/dashboard`,
    }),
  "order-receipt": () =>
    orderReceiptEmail({
      name: "Alex Morgan",
      orderShortId: "A1B2C3D4",
      materialName: "Matte Black Classic",
      quantity: 2,
      unitPriceCents: 2900,
      discountLabel: "WELCOME10",
      discountCents: 580,
      totalCents: 5220,
      shipLines: ["Alex Morgan", "12 High Street", "Manchester, M1 2AB", "United Kingdom"],
      orderUrl: `${base}/dashboard/orders`,
    }),
  "pro-welcome": () =>
    proWelcomeEmail({
      name: "Alex Morgan",
      amountPaidCents: 4900,
      dashboardUrl: `${base}/dashboard`,
    }),
  "order-shipped": () =>
    orderShippedEmail({
      name: "Alex Morgan",
      orderShortId: "A1B2C3D4",
      trackingNumber: "RM123456789GB",
      orderUrl: `${base}/dashboard/orders`,
    }),
  "password-reset": () =>
    passwordResetEmail({
      name: "Alex Morgan",
      resetUrl: `${base}/reset-password?token=sample`,
    }),
  marketing: () =>
    marketingEmail({
      name: "Alex Morgan",
      heading: "New: premium metal cards ✨",
      bodyHtml:
        '<p style="margin:0 0 16px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#5b6166;">We just launched brushed-steel NFC cards with laser-etched detail. Upgrade your first impression.</p>',
      ctaLabel: "Shop metal cards",
      ctaUrl: `${base}/dashboard/order`,
      unsubscribeUrl: `${base}/dashboard/settings`,
    }),
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ template: string }> },
) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const { template } = await params;
  const make = SAMPLES[template];
  if (!make) return new NextResponse("Unknown template", { status: 404 });

  return new NextResponse(make().html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
