import { requireAdmin } from "@/lib/guards";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <div className="min-h-dvh bg-background">
      <AdminSidebar user={{ name: user.name, email: user.email }} />
      <main className="md:pl-64 pb-24 md:pb-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
