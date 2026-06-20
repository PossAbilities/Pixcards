import { Icon } from "@/components/Icon";
import { Badge, Card, SectionHeading } from "@/components/ui";
import {
  APP_NAME,
  CARD_MATERIALS,
  PRO_PRICE_CENTS,
  money,
} from "@/lib/constants";

export default function AdminSettingsPage() {
  const environment = process.env.NODE_ENV ?? "development";
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

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
