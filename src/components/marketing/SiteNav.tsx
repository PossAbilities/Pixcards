import Link from "next/link";
import { Logo } from "@/components/Logo";
import { buttonClass } from "@/components/ui";
import { getSessionUser } from "@/lib/auth";
import { MobileMenu } from "./MobileMenu";

export async function SiteNav() {
  const user = await getSessionUser();
  const dashboardHref = user?.role === "ADMIN" ? "/admin" : "/dashboard";
  return (
    <header className="sticky top-0 z-50 h-20 glass backdrop-blur-md border-b border-black/5">
      <div className="max-w-[1200px] mx-auto h-full px-4 md:px-12 flex items-center justify-between">
        <Logo />
        <nav aria-label="Main" className="hidden md:flex items-center gap-9 text-sm font-semibold">
          <Link href="/#features" className="text-muted hover:text-primary transition-colors">
            Features
          </Link>
          <Link href="/#how" className="text-muted hover:text-primary transition-colors">
            How it works
          </Link>
          <Link href="/pricing" className="text-muted hover:text-primary transition-colors">
            Pricing
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <Link href={dashboardHref} className={buttonClass("primary", "md", "max-sm:hidden")}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:inline-flex text-sm font-semibold text-muted hover:text-primary transition-colors"
              >
                Log in
              </Link>
              <Link href="/register" className={buttonClass("primary", "md", "max-sm:hidden")}>
                Create an account
              </Link>
            </>
          )}
          <MobileMenu authed={Boolean(user)} dashboardHref={dashboardHref} />
        </div>
      </div>
    </header>
  );
}
