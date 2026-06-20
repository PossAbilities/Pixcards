import type { Metadata } from "next";
import { SiteNav } from "@/components/marketing/SiteNav";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { CONTACT_EMAIL } from "@/lib/site";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Terms of Service | ${APP_NAME}`,
  description:
    "The terms that govern your use of Pixcards, including accounts, subscriptions, payments and physical card orders.",
};

export default function TermsPage() {
  return (
    <>
      <SiteNav />
      <main className="flex-1 bg-surface">
        <article className="mx-auto max-w-3xl px-4 md:px-6 py-16">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Legal
          </p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink">
            Terms of Service
          </h1>
          <p className="mt-3 text-sm text-faint">Last updated: June 2026</p>

          <div className="mt-10 space-y-10 text-[15px] leading-relaxed text-muted">
            <p>
              These Terms of Service (&ldquo;Terms&rdquo;) govern your access to
              and use of {APP_NAME} and any related websites, apps and services
              (the &ldquo;Service&rdquo;). Please read them carefully.
            </p>

            <Section title="1. Acceptance of Terms">
              <p>
                By creating an account or using the Service, you agree to be
                bound by these Terms. If you do not agree, please do not use the
                Service. If you are using {APP_NAME} on behalf of an
                organisation, you confirm that you have authority to bind that
                organisation to these Terms.
              </p>
            </Section>

            <Section title="2. Accounts">
              <p>
                You must provide accurate information when registering and keep
                your credentials secure. You are responsible for all activity
                under your account. You must be at least 16 years old, or the age
                of digital consent in your country, to use the Service.
              </p>
            </Section>

            <Section title="3. Acceptable Use">
              <p>You agree not to use the Service to:</p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>impersonate others or misrepresent your identity or affiliation;</li>
                <li>publish unlawful, infringing, deceptive or harmful content;</li>
                <li>distribute malware or attempt to disrupt or breach the Service;</li>
                <li>scrape, resell or reverse-engineer the Service without permission.</li>
              </ul>
              <p className="mt-3">
                We may remove content or suspend accounts that violate these
                rules.
              </p>
            </Section>

            <Section title="4. Subscriptions &amp; Payments">
              <p>
                {APP_NAME} offers a free Basic plan and a paid Pro plan. The Pro
                upgrade is a <strong className="text-ink">one-time payment</strong>{" "}
                — not a recurring subscription — and unlocks the Pro features
                described at the time of purchase for the life of your account.
              </p>
              <p className="mt-3">
                You may also order{" "}
                <strong className="text-ink">physical NFC cards</strong>, which
                are charged per item at the prices shown at checkout, plus any
                applicable shipping and taxes. Payments are processed securely by
                Stripe. Except where required by law, payments for digital
                upgrades and fulfilled physical orders are non-refundable; if
                something goes wrong with an order, contact us and we&rsquo;ll
                make it right.
              </p>
            </Section>

            <Section title="5. Intellectual Property">
              <p>
                The Service, including its software, design and branding, is owned
                by {APP_NAME} and protected by intellectual-property laws. You
                retain ownership of the content you upload, and you grant us a
                limited licence to host, display and distribute that content as
                needed to operate the Service (for example, rendering your public
                card).
              </p>
            </Section>

            <Section title="6. Termination">
              <p>
                You may stop using the Service and delete your account at any
                time. We may suspend or terminate your access if you breach these
                Terms or use the Service in a way that risks harm to others or to{" "}
                {APP_NAME}. Upon termination, your right to use the Service ends,
                though certain provisions survive (such as those on intellectual
                property and liability).
              </p>
            </Section>

            <Section title="7. Disclaimers">
              <p>
                The Service is provided &ldquo;as is&rdquo; and &ldquo;as
                available&rdquo; without warranties of any kind, whether express
                or implied. We do not warrant that the Service will be
                uninterrupted, error-free or completely secure.
              </p>
            </Section>

            <Section title="8. Limitation of Liability">
              <p>
                To the fullest extent permitted by law, {APP_NAME} will not be
                liable for any indirect, incidental or consequential damages, or
                for any loss of data, profits or goodwill arising from your use of
                the Service. Our total liability for any claim is limited to the
                amount you paid us in the twelve months preceding the claim.
                Nothing in these Terms excludes liability that cannot be excluded
                under applicable law.
              </p>
            </Section>

            <Section title="9. Changes to These Terms">
              <p>
                We may update these Terms from time to time. When we make material
                changes, we&rsquo;ll update the &ldquo;Last updated&rdquo; date
                above and, where appropriate, notify you. Continuing to use the
                Service after changes take effect means you accept the revised
                Terms.
              </p>
            </Section>

            <Section title="10. Contact">
              <p>
                Questions about these Terms? Reach us at{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="font-semibold text-primary hover:text-primary-deep"
                >
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            </Section>
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 font-display text-xl font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}
