import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { Icon } from "@/components/Icon";
import { Card, inputClass } from "@/components/ui";
import { UserRow, type AdminUser } from "@/components/admin/UserRow";

export default async function AdminUsersPage() {
  const admin = await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      profile: { select: { username: true } },
      _count: { select: { orders: true } },
    },
  });

  const rows: AdminUser[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    username: u.profile?.username ?? null,
    plan: u.plan,
    role: u.role,
    ordersCount: u._count.orders,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink">
            User Management
          </h1>
          <p className="mt-1 text-muted">
            {rows.length} {rows.length === 1 ? "account" : "accounts"} registered
          </p>
        </div>
        <div className="relative sm:w-72">
          <Icon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-faint text-[18px]"
          />
          <input
            type="search"
            placeholder="Search users…"
            className={`${inputClass} pl-10`}
          />
        </div>
      </header>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[820px]">
            <thead>
              <tr className="text-xs font-semibold text-faint uppercase tracking-wide bg-surface-low/60">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3 text-center">Orders</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted">
                    No users found.
                  </td>
                </tr>
              )}
              {rows.map((u) => (
                <UserRow key={u.id} user={u} currentAdminId={admin.id} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
