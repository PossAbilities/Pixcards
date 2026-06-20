import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SOCIAL_LINKS } from "@/lib/site";

export function SiteFooter() {
  const facebookHref =
    SOCIAL_LINKS.find((s) => s.label === "Facebook")?.href ?? "#";
  const linkedinHref =
    SOCIAL_LINKS.find((s) => s.label === "LinkedIn")?.href ?? "#";
  return (
    <footer className="bg-surface-dim/60 border-t border-black/5">
      <div className="max-w-[1200px] mx-auto px-4 md:px-12 py-14 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 text-sm text-muted max-w-xs">
            The last business card you&apos;ll ever need. Share your professional
            identity instantly with NFC and QR.
          </p>
        </div>
        <div>
          <h4 className="font-display font-semibold mb-3 text-sm">Product</h4>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link href="/#features" className="hover:text-primary">Features</Link></li>
            <li><Link href="/pricing" className="hover:text-primary">Pricing</Link></li>
            <li><Link href="/register" className="hover:text-primary">Get started</Link></li>
            <li><Link href="/u/alex" className="hover:text-primary">Live demo card</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display font-semibold mb-3 text-sm">Company</h4>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link href="/privacy" className="hover:text-primary">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-primary">Terms of Service</Link></li>
            <li><Link href="/cookies" className="hover:text-primary">Cookie Policy</Link></li>
            <li><Link href="/support" className="hover:text-primary">Support</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-black/5">
        <div className="max-w-[1200px] mx-auto px-4 md:px-12 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-faint">
          <p>© {new Date().getFullYear()} Pixcards Inc. All rights reserved.</p>
          <div className="flex gap-3">
            <a
              href={facebookHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="w-9 h-9 grid place-items-center rounded-full bg-surface-high hover:bg-primary hover:text-white transition-colors"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
            </a>
            <a
              href={linkedinHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="w-9 h-9 grid place-items-center rounded-full bg-surface-high hover:bg-primary hover:text-white transition-colors"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M22.23 0H1.77C.8 0 0 .8 0 1.77v20.46c0 .97.8 1.77 1.77 1.77h20.46c.97 0 1.77-.8 1.77-1.77V1.77C24 .8 23.2 0 22.23 0zM7.12 20.45H3.56V9h3.56v11.45zM5.34 7.58c-1.14 0-2.06-.92-2.06-2.06 0-1.14.92-2.06 2.06-2.06 1.14 0 2.06.92 2.06 2.06 0 1.14-.92 2.06-2.06 2.06zM20.45 20.45h-3.56v-5.6c0-1.34-.03-3.06-1.87-3.06-1.87 0-2.16 1.46-2.16 2.96v5.7h-3.56V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29z" /></svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
