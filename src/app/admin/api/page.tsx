import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { appUrl } from "@/lib/constants";
import { ApiKeysManager, type ApiKeyRow } from "@/components/admin/ApiKeysManager";

export default async function AdminApiPage() {
  await requireAdmin();
  const keys = await prisma.apiKey.findMany({ orderBy: { createdAt: "desc" } });

  const rows: ApiKeyRow[] = keys.map((k) => ({
    id: k.id,
    name: k.name,
    prefix: k.prefix,
    lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
    revokedAt: k.revokedAt?.toISOString() ?? null,
    createdAt: k.createdAt.toISOString(),
  }));

  return (
    <div>
      <header className="mb-6 md:mb-8">
        <h1 className="font-display text-3xl font-bold text-ink">
          Monitoring API
        </h1>
        <p className="text-muted mt-1">
          Generate a key for your central monitoring platform to pull health and
          activity from Pixcards.
        </p>
      </header>
      <ApiKeysManager keys={rows} baseUrl={appUrl()} />
    </div>
  );
}
