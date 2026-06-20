import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { Card, ProBadge } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default async function AnalyticsPage() {
  const user = await requireUser();
  const isPro = user.plan === "PRO";

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    include: { links: true },
  });
  if (!profile) redirect("/login");

  const events = await prisma.analyticsEvent.findMany({
    where: { profileId: profile.id },
    select: { type: true, linkId: true, createdAt: true },
  });

  const totalViews = events.filter((e) => e.type === "VIEW").length;
  const linkClicks = events.filter((e) => e.type === "LINK_CLICK").length;
  const saves = events.filter((e) => e.type === "SAVE_CONTACT").length;
  const ctr = totalViews > 0 ? Math.round((linkClicks / totalViews) * 100) : 0;

  const now = new Date();
  const sevenAgo = new Date(now);
  sevenAgo.setDate(now.getDate() - 7);
  const views7 = events.filter(
    (e) => e.type === "VIEW" && e.createdAt >= sevenAgo,
  ).length;

  // 14-day daily view chart
  const DAYS = 14;
  const today = startOfDay(now);
  const daily: { label: string; count: number }[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    const next = new Date(day);
    next.setDate(day.getDate() + 1);
    const count = events.filter(
      (e) =>
        (e.type === "VIEW" || e.type === "TAP") &&
        e.createdAt >= day &&
        e.createdAt < next,
    ).length;
    daily.push({
      label: day.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      count,
    });
  }
  const maxDaily = Math.max(1, ...daily.map((d) => d.count));

  // Top links
  const linkLabel = new Map(profile.links.map((l) => [l.id, l.label]));
  const clicksByLink = new Map<string, number>();
  for (const e of events) {
    if (e.type === "LINK_CLICK" && e.linkId) {
      clicksByLink.set(e.linkId, (clicksByLink.get(e.linkId) ?? 0) + 1);
    }
  }
  const topLinks = [...clicksByLink.entries()]
    .map(([id, count]) => ({ label: linkLabel.get(id) ?? "Removed link", count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const maxLink = Math.max(1, ...topLinks.map((l) => l.count));

  const stats = [
    { label: "Total Views", value: totalViews, icon: "visibility", sub: `${views7} in last 7 days` },
    { label: "Link Clicks", value: linkClicks, icon: "ads_click", sub: "All time" },
    { label: "Contacts Saved", value: saves, icon: "contact_phone", sub: "vCard downloads" },
    { label: "Click-through Rate", value: `${ctr}%`, icon: "trending_up", sub: "Clicks / views" },
  ];

  return (
    <div>
      <header className="mb-6 md:mb-8">
        <h1 className="font-display text-3xl font-bold text-ink">Analytics</h1>
        <p className="text-muted mt-1">
          See how your digital card is performing.
        </p>
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted uppercase tracking-wide">
                {s.label}
              </span>
              <span className="grid place-items-center w-9 h-9 rounded-xl bg-primary-soft text-primary-deep">
                <Icon name={s.icon} className="text-[18px]" />
              </span>
            </div>
            <p className="font-display text-3xl font-bold text-ink mt-3">
              {s.value}
            </p>
            <p className="text-xs text-faint mt-1">{s.sub}</p>
          </Card>
        ))}
      </div>

      {/* Advanced section */}
      <div className="relative">
        <div
          className={cn(
            "grid grid-cols-1 lg:grid-cols-2 gap-6",
            !isPro && "blur-sm pointer-events-none select-none",
          )}
          aria-hidden={!isPro}
        >
          {/* Daily chart */}
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold mb-1">
              Daily Activity
            </h3>
            <p className="text-xs text-muted mb-5">Views over the last 14 days</p>
            <div className="flex items-end gap-1.5 h-40">
              {daily.map((d, i) => (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center justify-end h-full group"
                  title={`${d.label}: ${d.count}`}
                >
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-primary to-primary/60 min-h-[2px] transition-all"
                    style={{ height: `${(d.count / maxDaily) * 100}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-faint mt-2">
              <span>{daily[0]?.label}</span>
              <span>{daily[daily.length - 1]?.label}</span>
            </div>
          </Card>

          {/* Top links */}
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold mb-1">Top Links</h3>
            <p className="text-xs text-muted mb-5">Most clicked destinations</p>
            {topLinks.length === 0 ? (
              <p className="text-sm text-muted py-8 text-center">
                No link clicks recorded yet.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {topLinks.map((l, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-semibold text-ink truncate">
                        {l.label}
                      </span>
                      <span className="text-muted shrink-0 ml-2">{l.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-high overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(l.count / maxLink) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {!isPro && (
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center bg-surface/80 backdrop-blur-md rounded-2xl border border-black/5 shadow-lg p-8 max-w-sm">
              <ProBadge className="mb-3" />
              <h3 className="font-display text-xl font-bold text-ink">
                Advanced Analytics
              </h3>
              <p className="text-sm text-muted mt-2 mb-4">
                Upgrade to Pro to unlock daily activity charts and top-link
                breakdowns.
              </p>
              <Link href="/pricing" className="inline-flex">
                <span className="inline-flex items-center gap-2 font-semibold rounded-lg bg-primary text-white px-5 py-2.5 text-sm shadow-sm shadow-primary/30 hover:-translate-y-0.5 transition-transform">
                  <Icon name="bolt" fill className="text-[18px]" />
                  Upgrade to Pro
                </span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
