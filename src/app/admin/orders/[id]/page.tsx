import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Badge, Card, buttonClass, SectionHeading } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { material, money } from "@/lib/constants";
import { cardTapUrl } from "@/lib/cards";
import { formatDate } from "@/lib/utils";
import { OrderStatusForm } from "@/components/admin/OrderStatusForm";
import { OrderNfcPanel } from "@/components/admin/OrderNfcPanel";

const STATUS_COLOR: Record<
  string,
  "neutral" | "primary" | "success" | "warning" | "danger" | "info"
> = {
  PENDING: "neutral",
  PAID: "info",
  PRINTING: "warning",
  SHIPPED: "primary",
  DELIVERED: "success",
  CANCELLED: "danger",
};

type DesignSpec = {
  front?: unknown;
  back?: unknown;
  material?: string;
  cardName?: string;
};

type OrderDesign = {
  frontImage?: string;
  backImage?: string;
  spec?: DesignSpec;
};

function parseDesign(raw: string): OrderDesign {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") {
      return parsed as OrderDesign;
    }
  } catch {
    // malformed JSON — fall through to empty design
  }
  return {};
}

function ArtworkPanel({
  side,
  image,
  orderId,
}: {
  side: "front" | "back";
  image?: string;
  orderId: string;
}) {
  const label = side === "front" ? "Front" : "Back";
  return (
    <div className="flex-1">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">
        {label}
      </p>
      <div className="overflow-hidden rounded-xl border border-outline bg-surface-low">
        {image ? (
          <img
            src={image}
            alt={`Card ${label.toLowerCase()} artwork`}
            className="block aspect-[1011/638] w-full bg-white object-contain"
          />
        ) : (
          <div className="grid aspect-[1011/638] w-full place-items-center text-sm text-muted">
            No {label.toLowerCase()} image
          </div>
        )}
      </div>
      {image && (
        <a
          href={image}
          download={`card-${orderId}-${side}.png`}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass("primary", "sm", "mt-3 w-full")}
        >
          <Icon name="download" className="text-[16px]" />
          Download {label} PNG
        </a>
      )}
    </div>
  );
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: { include: { profile: true } },
      cards: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) notFound();

  const fulfilCards = order.cards.map((c) => ({
    id: c.id,
    code: c.code,
    tapUrl: cardTapUrl(c.code),
    encoded: c.encoded,
  }));

  const design = parseDesign(order.design);
  const hasArtwork = Boolean(design.frontImage || design.backImage);
  const mat = material(order.material);
  const cardNameText = design.spec?.cardName || order.cardName;
  const username = order.user.profile?.username;
  const shortId = order.id.slice(-8).toUpperCase();

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted transition-colors hover:text-ink"
        >
          <Icon name="arrow_back" className="text-[18px]" />
          Back to orders
        </Link>
      </div>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-extrabold text-ink">
              Order #{shortId}
            </h1>
            <Badge color={STATUS_COLOR[order.status] ?? "neutral"}>
              {order.status}
            </Badge>
          </div>
          <p className="mt-1 text-muted">
            Placed {formatDate(order.createdAt)}
            <span className="mx-2 text-faint">·</span>
            <span className="font-mono text-xs text-faint">{order.id}</span>
          </p>
        </div>
      </header>

      {/* Artwork */}
      <Card className="p-6">
        <SectionHeading icon="image" title="Submitted artwork" />
        {hasArtwork ? (
          <>
            <div className="flex flex-col gap-6 sm:flex-row">
              <ArtworkPanel
                side="front"
                image={design.frontImage}
                orderId={order.id}
              />
              <ArtworkPanel
                side="back"
                image={design.backImage}
                orderId={order.id}
              />
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-sm text-muted">
              <Icon name="info" className="text-[16px] text-primary" />
              Print-ready PNG — import into your card software (CardPresso).
            </p>
          </>
        ) : (
          <div className="grid place-items-center rounded-xl border border-dashed border-outline bg-surface-low px-6 py-12 text-center">
            <Icon name="hide_image" className="text-[36px] text-faint" />
            <p className="mt-3 font-semibold text-ink">
              No custom artwork submitted
            </p>
            <p className="mt-1 text-sm text-muted">
              This order was placed without artwork from the card studio.
            </p>
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Order details */}
        <Card className="p-6">
          <SectionHeading icon="receipt_long" title="Order details" />
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-faint">
                Customer
              </dt>
              <dd className="mt-1 font-semibold text-ink">{order.user.name}</dd>
              <dd className="text-muted">{order.user.email}</dd>
              {username && (
                <dd className="mt-1">
                  <Link
                    href={`/u/${username}`}
                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                  >
                    <Icon name="badge" className="text-[15px]" />@{username}
                  </Link>
                </dd>
              )}
            </div>

            <div className="border-t border-black/5 pt-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-faint">
                Card material
              </dt>
              <dd className="mt-1 flex items-center gap-2">
                <span
                  className="h-5 w-5 shrink-0 rounded-md border border-black/10"
                  style={{ background: mat.swatch }}
                />
                <span className="font-medium text-ink">{mat.name}</span>
              </dd>
            </div>

            {cardNameText && (
              <div className="border-t border-black/5 pt-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-faint">
                  Name on card
                </dt>
                <dd className="mt-1 font-medium text-ink">{cardNameText}</dd>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 border-t border-black/5 pt-4">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-faint">
                  Quantity
                </dt>
                <dd className="mt-1 font-medium text-ink tabular-nums">
                  {order.quantity}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-faint">
                  Unit price
                </dt>
                <dd className="mt-1 font-medium text-ink tabular-nums">
                  {money(Math.round(order.priceCents / order.quantity))}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-faint">
                  Total
                </dt>
                <dd className="mt-1 font-bold text-ink tabular-nums">
                  {money(order.priceCents)}
                </dd>
              </div>
            </div>
          </dl>
        </Card>

        {/* Shipping */}
        <Card className="p-6">
          <SectionHeading icon="local_shipping" title="Shipping" />
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-faint">
                Recipient
              </dt>
              <dd className="mt-1 font-semibold text-ink">
                {order.shipName || "—"}
              </dd>
            </div>
            <div className="border-t border-black/5 pt-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-faint">
                Address
              </dt>
              <dd className="mt-1 whitespace-pre-line text-ink">
                {[
                  order.shipAddress,
                  [order.shipCity, order.shipPostal]
                    .filter(Boolean)
                    .join(", "),
                  order.shipCountry,
                ]
                  .filter(Boolean)
                  .join("\n") || "—"}
              </dd>
            </div>
            <div className="border-t border-black/5 pt-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-faint">
                Tracking number
              </dt>
              <dd className="mt-1 font-mono text-ink">
                {order.trackingNumber || (
                  <span className="font-sans text-muted">Not set</span>
                )}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      {/* NFC card activation / fulfilment */}
      <Card className="p-6">
        <SectionHeading icon="contactless" title="NFC card activation" />
        <OrderNfcPanel
          orderId={order.id}
          quantity={order.quantity}
          cards={fulfilCards}
        />
      </Card>

      {/* Update status */}
      <Card className="p-6">
        <SectionHeading icon="edit_note" title="Update status" />
        <OrderStatusForm
          orderId={order.id}
          currentStatus={order.status}
          currentTracking={order.trackingNumber ?? ""}
        />
      </Card>
    </div>
  );
}
