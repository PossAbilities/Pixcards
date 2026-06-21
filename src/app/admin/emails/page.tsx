import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { emailEnabled } from "@/lib/email/send";
import { EmailStudio } from "@/components/admin/EmailStudio";

export default async function AdminEmailsPage() {
  await requireAdmin();
  const recipientCount = await prisma.user.count();

  return (
    <div>
      <header className="mb-6 md:mb-8">
        <h1 className="font-display text-3xl font-bold text-ink">Emails</h1>
        <p className="text-muted mt-1">
          Preview the branded templates and send announcements to your users.
        </p>
      </header>
      <EmailStudio recipientCount={recipientCount} emailLive={emailEnabled()} />
    </div>
  );
}
