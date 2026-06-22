import { Icon } from "@/components/Icon";
import { Badge, Card, SectionHeading } from "@/components/ui";
import {
  APP_NAME,
  CARD_MATERIALS,
  PRO_PRICE_CENTS,
  appUrl,
  money,
} from "@/lib/constants";
import { prisma } from "@/lib/db";
import { storageProvider } from "@/lib/storage";
import { MigrateImages } from "@/components/admin/MigrateImages";

export default async function AdminSettingsPage() {
  const environment = process.env.NODE_ENV ?? "development";
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);
  const has = (k: string) => Boolean(process.env[k]?.trim());

  const [pendingProfiles, pendingOrders] = await Promise.all([
    prisma.profile.count({
      where: {
        OR: [
          { avatarUrl: { startsWith: "data:" } },
          { headerUrl: { startsWith: "data:" } },
        ],
      },
    }),
    prisma.order.count({ where: { design: { contains: "data:" } } }),
  ]);
  const pendingImages = pendingProfiles + pendingOrders;

  const integrations: {
    title: string;
    icon: string;
    vars: string[];
    note: string;
  }[] = [
    {
      title: "Apple Wallet",
      icon: "wallet",
      vars: [
        "APPLE_PASS_TYPE_ID",
        "APPLE_TEAM_ID",
        "APPLE_PASS_CERT_BASE64",
        "APPLE_WWDR_BASE64",
      ],
      note: "All four required for the Add to Apple Wallet button.",
    },
    {
      title: "Google Wallet",
      icon: "wallet",
      vars: [
        "GOOGLE_WALLET_ISSUER_ID",
        "GOOGLE_WALLET_SA_EMAIL",
        "GOOGLE_WALLET_SA_KEY",
      ],
      note: "All three required for the Add to Google Wallet button.",
    },
    {
      title: "Email (Resend)",
      icon: "mail",
      vars: ["RESEND_API_KEY", "RESEND_WEBHOOK_SECRET", "EMAIL_FROM"],
      note: "API key sends mail; webhook secret enables open/click tracking.",
    },
    {
      title: "Image storage (Supabase)",
      icon: "cloud_upload",
      vars: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
      note: "Without these, uploads are stored inline as data-URIs.",
    },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-extrabold text-ink">
          Settings
        </h1>
        <p className="mt-1 text-muted">
          Platform configuration, pricing and integrations.
        </p>
      </header>

      {/* Integrations — live detection of env config (presence only, no values) */}
      <Card className="p-6">
        <SectionHeading icon="extension" title="Integrations status" />
        <p className="-mt-2 mb-4 text-sm text-muted">
          Live detection of configuration on this deploy. Only presence is shown
          — never the secret values.
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {integrations.map((group) => {
            const ok = group.vars.every(has);
            return (
              <div
                key={group.title}
                className="rounded-xl border border-outline p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <Icon
                      name={group.icon}
                      className="text-[18px] text-primary"
                    />
                    {group.title}
                  </span>
                  <Badge color={ok ? "success" : "warning"}>
                    {ok ? "Active" : "Incomplete"}
                  </Badge>
                </div>
                <ul className="space-y-1">
                  {group.vars.map((v) => (
                    <li
                      key={v}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <code className="font-mono text-faint">{v}</code>
                      <span
                        className={
                          has(v)
                            ? "inline-flex items-center gap-1 font-semibold text-emerald-600"
                            : "inline-flex items-center gap-1 font-semibold text-red-500"
                        }
                      >
                        <Icon
                          name={has(v) ? "check_circle" : "cancel"}
                          className="text-[14px]"
                        />
                        {has(v) ? "set" : "missing"}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] leading-snug text-faint">
                  {group.note}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Image storage */}
      <Card className="p-6">
        <SectionHeading icon="cloud_upload" title="Image storage" />
        {storageProvider === "supabase" ? (
          <div className="space-y-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
              <Icon name="check_circle" className="text-[16px]" />
              Supabase Storage is active — new uploads are saved to the CDN.
            </p>
            <MigrateImages pending={pendingImages} />
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <Icon name="info" fill className="mt-0.5 text-[18px]" />
            <span>
              Uploads are currently stored inline as data-URIs (heavier pages).
              Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code>SUPABASE_SERVICE_ROLE_KEY</code> to switch to Supabase
              Storage. {pendingImages > 0 && `${pendingImages} image record(s) are currently inline.`}
            </span>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform */}
        <Card className="p-6">
          <SectionHeading icon="tune" title="Platform" />
          <dl className="divide-y divide-black/5">
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-sm text-muted">App name</dt>
              <dd className="text-sm font-semibold text-ink">{APP_NAME}</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-sm text-muted">Environment</dt>
              <dd>
                <Badge color={environment === "production" ? "success" : "info"}>
                  {environment}
                </Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-sm text-muted">Public URL</dt>
              <dd className="truncate text-sm font-semibold text-ink">
                {appUrl()}
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-sm text-muted">Card materials</dt>
              <dd className="text-sm font-semibold text-ink">
                {CARD_MATERIALS.length}
              </dd>
            </div>
          </dl>
        </Card>

        {/* Payments */}
        <Card className="p-6">
          <SectionHeading icon="credit_card" title="Payments" />
          <div className="flex items-start gap-3 rounded-xl bg-surface-low p-4">
            <Icon
              name={stripeConfigured ? "check_circle" : "info"}
              fill
              className={
                stripeConfigured
                  ? "text-tertiary text-[22px]"
                  : "text-amber-500 text-[22px]"
              }
            />
            <div>
              <p className="text-sm font-semibold text-ink">
                Stripe{" "}
                {stripeConfigured ? "is configured" : "runs in demo mode"}
              </p>
              <p className="mt-0.5 text-sm text-muted">
                {stripeConfigured
                  ? "Live checkout sessions are enabled."
                  : "Stripe runs in demo mode unless STRIPE_SECRET_KEY is set. Orders are simulated end-to-end."}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between py-2.5">
            <span className="text-sm text-muted">Currency</span>
            <span className="text-sm font-semibold text-ink">GBP (£)</span>
          </div>
        </Card>

        {/* Pricing */}
        <Card className="p-6 lg:col-span-2">
          <SectionHeading icon="sell" title="Pricing" />
          <div className="flex items-center justify-between rounded-xl bg-primary-soft/50 p-4 mb-4">
            <div>
              <p className="text-sm font-semibold text-primary-deep">
                Pro upgrade
              </p>
              <p className="text-xs text-muted">One-time lifetime unlock</p>
            </div>
            <p className="font-display text-2xl font-extrabold text-primary-deep">
              {money(PRO_PRICE_CENTS)}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-semibold text-faint uppercase tracking-wide">
                  <th className="py-2.5 pr-4">Material</th>
                  <th className="py-2.5 pr-4">Tier</th>
                  <th className="py-2.5 text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {CARD_MATERIALS.map((m) => (
                  <tr key={m.id} className="border-t border-black/5">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-6 h-6 rounded-md border border-black/10 shrink-0"
                          style={{ background: m.swatch }}
                        />
                        <span className="text-sm font-medium text-ink">
                          {m.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      {m.pro ? (
                        <Badge color="primary">Pro</Badge>
                      ) : (
                        <Badge color="neutral">Standard</Badge>
                      )}
                    </td>
                    <td className="py-3 text-right text-sm font-semibold text-ink tabular-nums">
                      {money(m.priceCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
