"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Icon } from "@/components/Icon";
import { logoutAction } from "@/app/(auth)/actions";
import { cn, initials } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: string };

const NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: "dashboard" },
  { href: "/admin/orders", label: "Orders", icon: "inventory_2" },
  { href: "/admin/cards", label: "Cards", icon: "contactless" },
  { href: "/admin/users", label: "Users", icon: "group" },
  { href: "/admin/discounts", label: "Discounts", icon: "sell" },
  { href: "/admin/emails", label: "Emails", icon: "mail" },
  { href: "/admin/api", label: "Monitoring API", icon: "api" },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
];

export type AdminSidebarUser = {
  name: string;
  email: string;
};

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar({ user }: { user: AdminSidebarUser }) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:w-64 md:flex-col bg-inverse text-white z-30">
        <div className="px-5 py-5 border-b border-white/10">
          <Logo href="/admin" />
          <p className="mt-2 text-[10px] font-bold tracking-[0.18em] text-tertiary-bright">
            ADMIN PANEL
          </p>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                  active
                    ? "bg-primary text-white shadow-sm shadow-primary/30"
                    : "text-white/60 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon name={item.icon} fill={active} className="text-[20px]" />
                {item.label}
              </Link>
            );
          })}

          <Link
            href="/dashboard"
            className="mt-2 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/50 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Icon name="arrow_back" className="text-[20px]" />
            Back to app
          </Link>
        </nav>

        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
            <span className="grid place-items-center w-10 h-10 rounded-full bg-primary text-white font-bold text-sm shrink-0">
              {initials(user.name || "A")}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{user.name}</p>
              <p className="text-xs text-white/50 truncate">{user.email}</p>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                aria-label="Log out"
                className="grid place-items-center w-9 h-9 rounded-full text-white/60 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Icon name="logout" className="text-[20px]" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between bg-inverse text-white px-4 py-3">
        <div className="flex items-center gap-2">
          <Logo href="/admin" />
          <span className="text-[10px] font-bold tracking-[0.18em] text-tertiary-bright">
            ADMIN
          </span>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            aria-label="Log out"
            className="grid place-items-center w-9 h-9 rounded-full text-white/70 hover:bg-white/10"
          >
            <Icon name="logout" className="text-[20px]" />
          </button>
        </form>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-inverse text-white flex items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[10px] font-semibold transition-colors",
                active ? "text-tertiary-bright" : "text-white/50",
              )}
            >
              <Icon name={item.icon} fill={active} className="text-[22px]" />
              <span className="truncate max-w-full">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
