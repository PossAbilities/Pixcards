import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { emailEnabled } from "@/lib/email/send";
import { EmailStudio } from "@/components/admin/EmailStudio";
import { EmailStats, type EmailStatsData } from "@/components/admin/EmailStats";

export default async function AdminEmailsPage() {
  await requireAdmin();

  const [recipientCount, sent, delivered, opened, clicked, bounced, grouped] =
    await Promise.all([
      prisma.user.count(),
      prisma.emailMessage.count({ where: { status: { not: "demo" } } }),
      prisma.emailMessage.count({
        where: { status: { in: ["delivered", "opened", "clicked"] } },
      }),
      prisma.emailMessage.count({ where: { opens: { gt: 0 } } }),
      prisma.emailMessage.count({ where: { clicks: { gt: 0 } } }),
      prisma.emailMessage.count({ where: { status: "bounced" } }),
      prisma.emailMessage.groupBy({
        by: ["type"],
        _count: { _all: true },
        _sum: { opens: true, clicks: true },
      }),
    ]);

  const stats: EmailStatsData = {
    sent,
    delivered,
    opened,
    clicked,
    bounced,
    byType: grouped
      .map((g) => ({
        type: g.type,
        count: g._count._all,
        opens: g._sum.opens ?? 0,
        clicks: g._sum.clicks ?? 0,
      }))
      .sort((a, b) => b.count - a.count),
  };

  return (
    <div>
      <header className="mb-6 md:mb-8">
        <h1 className="font-display text-3xl font-bold text-ink">Emails</h1>
        <p className="text-muted mt-1">
          Preview the branded templates, track engagement and send announcements.
        </p>
      </header>
      <div className="space-y-6">
        <EmailStats data={stats} />
        <EmailStudio recipientCount={recipientCount} emailLive={emailEnabled()} />
      </div>
    </div>
  );
}
