import { Card, SectionHeading } from "@/components/ui";

export type EmailStatsData = {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  byType: { type: string; count: number; opens: number; clicks: number }[];
};

const TYPE_LABELS: Record<string, string> = {
  WELCOME: "Welcome",
  ORDER_RECEIPT: "Order receipt",
  PRO_WELCOME: "Pro welcome",
  ORDER_SHIPPED: "Order shipped",
  PASSWORD_RESET: "Password reset",
  MARKETING: "Marketing",
  OTHER: "Other",
};

function pct(n: number, d: number): string {
  if (d <= 0) return "—";
  return `${Math.round((n / d) * 100)}%`;
}

export function EmailStats({ data }: { data: EmailStatsData }) {
  const tiles = [
    { label: "Sent", value: data.sent, sub: "all time" },
    { label: "Delivered", value: data.delivered, sub: pct(data.delivered, data.sent) },
    { label: "Opened", value: data.opened, sub: `${pct(data.opened, data.sent)} open rate` },
    { label: "Clicked", value: data.clicked, sub: `${pct(data.clicked, data.sent)} click rate` },
  ];

  return (
    <Card className="p-6">
      <SectionHeading icon="insights" title="Delivery & engagement" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="rounded-xl border border-outline bg-surface-low p-4"
          >
            <p className="font-display text-2xl font-bold text-ink tabular-nums">
              {t.value}
            </p>
            <p className="text-sm font-semibold text-ink">{t.label}</p>
            <p className="text-xs text-muted">{t.sub}</p>
          </div>
        ))}
      </div>

      {data.bounced > 0 && (
        <p className="mt-3 text-xs font-medium text-amber-600">
          {data.bounced} bounced or marked as spam.
        </p>
      )}

      {data.byType.length > 0 && (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-faint">
                <th className="py-2 pr-3">Template</th>
                <th className="py-2 pr-3 text-right">Sent</th>
                <th className="py-2 pr-3 text-right">Opens</th>
                <th className="py-2 text-right">Clicks</th>
              </tr>
            </thead>
            <tbody>
              {data.byType.map((r) => (
                <tr key={r.type} className="border-t border-black/5">
                  <td className="py-2 pr-3 font-medium text-ink">
                    {TYPE_LABELS[r.type] ?? r.type}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-muted">
                    {r.count}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-muted">
                    {r.opens}
                  </td>
                  <td className="py-2 text-right tabular-nums text-muted">
                    {r.clicks}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
