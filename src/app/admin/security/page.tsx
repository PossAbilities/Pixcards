import { requireAdmin } from "@/lib/guards";
import { SecurityCenter } from "@/components/admin/SecurityCenter";

export default async function AdminSecurityPage() {
  await requireAdmin();
  return (
    <div>
      <header className="mb-6 md:mb-8">
        <h1 className="font-display text-3xl font-bold text-ink">
          Security &amp; Health
        </h1>
        <p className="text-muted mt-1">
          Automated checks across your data and configuration, with one-click
          fixes for anything that needs attention.
        </p>
      </header>
      <SecurityCenter />
    </div>
  );
}
