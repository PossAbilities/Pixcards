"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Icon } from "@/components/Icon";
import { Badge, ProBadge } from "@/components/ui";
import { logoutAction } from "@/app/(auth)/actions";
import { cn, initials } from "@/lib/utils";
import type { Plan, Role } from "@prisma/client";

type NavItem = { href: string; label: string; icon: string };

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Profile", icon: "contact_page" },
  { href: "/dashboard/analytics", label: "Analytics", icon: "monitoring" },
  { href: "/dashboard/orders", label: "Orders", icon: "inventory_2" },
  { href: "/dashboard/order", label: "Order a Card", icon: "add_card" },
  { href: "/dashboard/settings", label: "Settings", icon: "settings" },
];

export type SidebarUser = {
  name: string;
  plan: Plan;
  role: Role;
};

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:w-64 md:flex-col bg-surface border-r border-black/5 z-30">
        <div className="px-5 py-5">
          <Logo href="/dashboard" />
        </div>

        {/* User card */}
        <div className="mx-3 mb-4 flex items-center gap-3 rounded-2xl bg-surface-low p-3">
          <span className="grid place-items-center w-10 h-10 rounded-full bg-primary text-white font-bold text-sm shrink-0">
            {initials(user.name || "P")}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink truncate">{user.name}</p>
            {user.plan === "PRO" ? (
              <ProBadge className="mt-0.5" />
            ) : (
              <Badge color="neutral" className="mt-0.5">
                Free
              </Badge>
            )}
          </div>
        </div>

        <nav className="flex-1 px-3 flex flex-col gap-1 overflow-y-auto">
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
                    : "text-muted hover:bg-surface-high/60 hover:text-ink",
                )}
              >
                <Icon name={item.icon} fill={active} className="text-[20px]" />
                {item.label}
              </Link>
            );
          })}

          {user.role === "ADMIN" && (
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                isActive(pathname, "/admin")
                  ? "bg-inverse text-white"
                  : "text-muted hover:bg-surface-high/60 hover:text-ink",
              )}
            >
              <Icon name="shield_person" className="text-[20px]" />
              Admin Panel
            </Link>
          )}
        </nav>

        <div className="p-3 flex flex-col gap-3">
          {user.plan === "FREE" && (
            <Link
              href="/pricing"
              className="block rounded-2xl bg-gradient-to-br from-primary to-primary-deep p-4 text-white shadow-sm shadow-primary/30 transition-transform hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-1.5 font-display font-bold text-sm">
                <Icon name="bolt" fill className="text-[18px]" />
                Upgrade to Pro
              </div>
              <p className="text-xs text-white/80 mt-1 leading-snug">
                Unlimited links, premium themes & advanced analytics.
              </p>
            </Link>
          )}

          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-muted hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <Icon name="logout" className="text-[20px]" />
              Log out
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between bg-surface/90 backdrop-blur border-b border-black/5 px-4 py-3">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2">
          {user.plan === "PRO" ? (
            <ProBadge />
          ) : (
            <Link href="/pricing">
              <Badge color="primary">Upgrade</Badge>
            </Link>
          )}
          <form action={logoutAction}>
            <button
              type="submit"
              aria-label="Log out"
              className="grid place-items-center w-9 h-9 rounded-full text-muted hover:bg-surface-high/60"
            >
              <Icon name="logout" className="text-[20px]" />
            </button>
          </form>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur border-t border-black/5 flex items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[10px] font-semibold transition-colors",
                active ? "text-primary" : "text-faint",
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
