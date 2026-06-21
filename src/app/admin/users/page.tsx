import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { UsersTable } from "@/components/admin/UsersTable";
import { type AdminUser } from "@/components/admin/UserRow";

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
    proUntil: u.proUntil ? u.proUntil.toISOString() : null,
    proComplimentary: u.proComplimentary,
    role: u.role,
    ordersCount: u._count.orders,
    createdAt: u.createdAt.toISOString(),
  }));

  return <UsersTable users={rows} currentAdminId={admin.id} />;
}
