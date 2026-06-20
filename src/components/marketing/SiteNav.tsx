import Link from "next/link";
import { Logo } from "@/components/Logo";
import { buttonClass } from "@/components/ui";
import { getSessionUser } from "@/lib/auth";

export async function SiteNav() {
  const user = await getSessionUser();
  return (
    <nav className="sticky top-0 z-50 h-20 glass backdrop-blur-md border-b border-black/5">
      <div className="max-w-[1200px] mx-auto h-full px-4 md:px-12 flex items-center justify-between">
        <Logo />
        <div className="hidden md:flex items-center gap-9 text-sm font-semibold">
          <Link href="/#features" className="text-muted hover:text-primary transition-colors">
            Features
          </Link>
          <Link href="/#how" className="text-muted hover:text-primary transition-colors">
            How it works
          </Link>
          <Link href="/pricing" className="text-muted hover:text-primary transition-colors">
            Pricing
          </Link>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <Link href={user.role === "ADMIN" ? "/admin" : "/dashboard"} className={buttonClass("primary", "md")}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:inline-flex text-sm font-semibold text-muted hover:text-primary transition-colors"
              >
                Login
              </Link>
              <Link href="/register" className={buttonClass("primary", "md")}>
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
