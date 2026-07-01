import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/dashboard/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  // "Organisation" only shows in the nav for users actually part of one —
  // it's not a self-serve feature everyday personal accounts need to see.
  const membership = await prisma.orgMember.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  return (
    <div className="min-h-dvh bg-background">
      <Sidebar
        user={{ name: user.name, plan: user.plan, role: user.role }}
        hasOrg={Boolean(membership)}
      />
      <main className="md:pl-64 pb-24 md:pb-0">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 md:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
