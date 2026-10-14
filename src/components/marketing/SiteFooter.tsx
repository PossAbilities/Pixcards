import Link from "next/link";
import { Logo } from "@/components/Logo";
import { BUSINESS, LEGAL_LINKS, LEGAL_NAME, SOCIAL_LINKS } from "@/lib/site";

const SOCIAL_ICONS: Record<string, string> = {
  Facebook:
    "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  LinkedIn:
    "M22.23 0H1.77C.8 0 0 .8 0 1.77v20.46c0 .97.8 1.77 1.77 1.77h20.46c.97 0 1.77-.8 1.77-1.77V1.77C24 .8 23.2 0 22.23 0zM7.12 20.45H3.56V9h3.56v11.45zM5.34 7.58c-1.14 0-2.06-.92-2.06-2.06 0-1.14.92-2.06 2.06-2.06 1.14 0 2.06.92 2.06 2.06 0 1.14-.92 2.06-2.06 2.06zM20.45 20.45h-3.56v-5.6c0-1.34-.03-3.06-1.87-3.06-1.87 0-2.16 1.46-2.16 2.96v5.7h-3.56V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29z",
};

export function SiteFooter() {
  const company = [
    BUSINESS.legalForm &&
      BUSINESS.legalForm.charAt(0).toUpperCase() + BUSINESS.legalForm.slice(1),
    BUSINESS.companyNumber && `Company no. ${BUSINESS.companyNumber}`,
    BUSINESS.charityNumber && `Charity no. ${BUSINESS.charityNumber}`,
    BUSINESS.vatNumber && `VAT no. ${BUSINESS.vatNumber}`,
    BUSINESS.address,
  ].filter(Boolean);

  return (
    <footer className="bg-surface-dim/60 border-t border-black/5">
      <div className="max-w-[1200px] mx-auto px-4 md:px-12 py-14 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 text-sm text-muted max-w-xs">
            Digital business cards you can share by NFC tap or QR code.
          </p>
        </div>
        <nav aria-labelledby="footer-product">
          <h2 id="footer-product" className="font-display font-semibold mb-3 text-sm">Product</h2>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link href="/#features" className="hover:text-primary">Features</Link></li>
            <li><Link href="/pricing" className="hover:text-primary">Pricing</Link></li>
            <li><Link href="/register" className="hover:text-primary">Create an account</Link></li>
            <li><Link href="/login" className="hover:text-primary">Log in</Link></li>
            <li><Link href="/support" className="hover:text-primary">Support</Link></li>
          </ul>
        </nav>
        <nav aria-labelledby="footer-legal">
          <h2 id="footer-legal" className="font-display font-semibold mb-3 text-sm">Legal</h2>
          <ul className="space-y-2 text-sm text-muted">
            {LEGAL_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-primary">{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-black/5">
        <div className="max-w-[1200px] mx-auto px-4 md:px-12 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted">
          <div className="text-center sm:text-left">
            <p>
              © {new Date().getFullYear()} {LEGAL_NAME}. {BUSINESS.tradingName} is
              operated by {LEGAL_NAME}.
            </p>
            {company.length > 0 && <p className="mt-1 text-xs">{company.join(" · ")}</p>}
          </div>
          {SOCIAL_LINKS.length > 0 && (
            <ul className="flex gap-3">
              {SOCIAL_LINKS.filter((s) => SOCIAL_ICONS[s.label]).map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${BUSINESS.tradingName} on ${s.label} (opens in a new tab)`}
                    className="w-11 h-11 grid place-items-center rounded-full bg-surface-high hover:bg-primary hover:text-white transition-colors"
                  >
                    <svg aria-hidden="true" className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d={SOCIAL_ICONS[s.label]} />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}
