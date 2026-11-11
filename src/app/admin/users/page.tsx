import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { UsersTable } from "@/components/admin/UsersTable";
import { type AdminUser } from "@/components/admin/UserRow";

export const metadata: Metadata = { title: "Users · Admin" };

export default async function AdminUsersPage() {
  const admin = await requireAdmin();

  const [users, orgs] = await Promise.all([
    prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      profile: { select: { username: true, cardPreset: true } },
      orgMembership: { include: { org: { select: { name: true } } } },
      _count: { select: { orders: true } },
    },
    }),
    prisma.organisation.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const rows: AdminUser[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    username: u.profile?.username ?? null,
    plan: u.plan,
    proUntil: u.proUntil ? u.proUntil.toISOString() : null,
    proComplimentary: u.proComplimentary,
    role: u.role,
    cardPreset: u.profile?.cardPreset ?? null,
    orgId: u.orgMembership?.orgId ?? null,
    orgName: u.orgMembership?.org.name ?? null,
    orgRole: u.orgMembership?.role ?? null,
    ordersCount: u._count.orders,
    createdAt: u.createdAt.toISOString(),
  }));

  return <UsersTable users={rows} orgs={orgs} currentAdminId={admin.id} />;
}
