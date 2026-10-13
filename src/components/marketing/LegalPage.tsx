import { SiteNav } from "@/components/marketing/SiteNav";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { BUSINESS, CONTACT_EMAIL, LEGAL_NAME } from "@/lib/site";

/** Shared shell for the legal / policy pages. */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteNav />
      <main id="main" className="flex-1 bg-surface">
        <article className="mx-auto max-w-3xl px-4 md:px-6 py-16">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Legal
          </p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink">
            {title}
          </h1>
          <p className="mt-3 text-sm text-muted">Last updated: {updated}</p>

          <div className="mt-10 space-y-10 text-[15px] leading-relaxed text-muted [&_a]:font-semibold [&_a]:text-primary-deep [&_a]:underline [&_a]:underline-offset-2 [&_strong]:text-ink [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_p+p]:mt-3">
            {children}
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}

export function Section({
  title,
  id,
  children,
}: {
  title: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-h` : undefined}>
      <h2
        id={id ? `${id}-h` : undefined}
        className="mb-3 font-display text-xl font-bold text-ink"
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

export function MailLink({ subject }: { subject?: string }) {
  const href = subject
    ? `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`
    : `mailto:${CONTACT_EMAIL}`;
  return <a href={href}>{CONTACT_EMAIL}</a>;
}

/** "Who we are" block — only renders the business fields that are filled in. */
export function BusinessDetails() {
  return (
    <ul>
      <li>
        <strong>{BUSINESS.tradingName}</strong> is a service operated by{" "}
        <strong>{LEGAL_NAME}</strong>
        {BUSINESS.legalForm ? `, a ${BUSINESS.legalForm}` : ""}.
      </li>
      {BUSINESS.companyNumber && <li>Company number: {BUSINESS.companyNumber}</li>}
      {BUSINESS.charityNumber && <li>Registered charity number: {BUSINESS.charityNumber}</li>}
      {BUSINESS.address && <li>Address: {BUSINESS.address}</li>}
      {BUSINESS.vatNumber && <li>VAT number: {BUSINESS.vatNumber}</li>}
      <li>
        Email: <MailLink />
      </li>
    </ul>
  );
}
