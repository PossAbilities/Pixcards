import type { Metadata } from "next";
import { SiteNav } from "@/components/marketing/SiteNav";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { CONTACT_EMAIL } from "@/lib/site";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Privacy Policy | ${APP_NAME}`,
  description:
    "How Pixcards collects, uses and protects your personal data, including your rights under the GDPR.",
};

export default function PrivacyPage() {
  return (
    <>
      <SiteNav />
      <main className="flex-1 bg-surface">
        <article className="mx-auto max-w-3xl px-4 md:px-6 py-16">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Legal
          </p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-faint">Last updated: June 2026</p>

          <div className="mt-10 space-y-10 text-[15px] leading-relaxed text-muted">
            <p>
              This Privacy Policy explains how {APP_NAME} (&ldquo;we&rdquo;,
              &ldquo;us&rdquo; or &ldquo;our&rdquo;) collects, uses and protects
              the personal information you provide when you create an account,
              build a digital business card, order a physical card or otherwise
              use our service. We are committed to handling your data
              responsibly and in line with applicable data-protection law,
              including the UK GDPR and EU GDPR.
            </p>

            <Section title="Information We Collect">
              <p>We collect the following categories of information:</p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-ink">Account data</strong> — your
                  name, email address and a securely hashed password when you
                  register.
                </li>
                <li>
                  <strong className="text-ink">Profile content</strong> — the
                  information you choose to publish on your card, such as job
                  title, company, phone number, links, social handles and
                  profile or cover images you upload.
                </li>
                <li>
                  <strong className="text-ink">Order data</strong> — shipping
                  details and order history when you purchase a physical NFC
                  card.
                </li>
                <li>
                  <strong className="text-ink">Usage &amp; analytics data</strong>{" "}
                  — aggregated, privacy-respecting metrics about how your card is
                  viewed and tapped, plus basic technical data such as device
                  type and approximate region.
                </li>
              </ul>
            </Section>

            <Section title="How We Use It">
              <p>We use your information to:</p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>provide, operate and maintain your digital card and account;</li>
                <li>process Pro upgrades and physical card orders;</li>
                <li>show you analytics about how your card performs;</li>
                <li>respond to support requests and important service notices;</li>
                <li>protect against fraud, abuse and security incidents.</li>
              </ul>
              <p className="mt-3">
                We do not sell your personal data, and we never publish anything
                beyond what you have chosen to include on your public card.
              </p>
            </Section>

            <Section title="Cookies">
              <p>
                We use a single essential session cookie to keep you securely
                signed in, along with limited analytics to understand how the
                service is used. For full details, see our{" "}
                <a
                  href="/cookies"
                  className="font-semibold text-primary hover:text-primary-deep"
                >
                  Cookie Policy
                </a>
                .
              </p>
            </Section>

            <Section title="Data Sharing">
              <p>
                We share data only with the trusted service providers that make{" "}
                {APP_NAME} work, and only to the extent necessary:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-ink">Stripe</strong> — to process
                  payments securely. We never store your full card numbers;
                  payment details are handled directly by Stripe.
                </li>
                <li>
                  <strong className="text-ink">Hosting &amp; analytics providers</strong>{" "}
                  — to run our infrastructure and measure aggregate usage.
                </li>
                <li>
                  <strong className="text-ink">Fulfilment partners</strong> — to
                  print and ship physical cards you order.
                </li>
              </ul>
              <p className="mt-3">
                We may also disclose information where required by law or to
                protect our legal rights.
              </p>
            </Section>

            <Section title="Your Rights (GDPR)">
              <p>
                If you are in the UK or EU, you have the right to access, correct,
                export or delete your personal data, to object to or restrict
                certain processing, and to withdraw consent at any time. You can
                update or delete most of your data directly from your dashboard,
                or contact us to exercise any of these rights. You also have the
                right to lodge a complaint with your local data-protection
                authority.
              </p>
            </Section>

            <Section title="Data Security">
              <p>
                We protect your data with industry-standard measures, including
                encryption in transit, hashed passwords and access controls. No
                online service can guarantee absolute security, but we work
                continuously to keep your information safe and to respond
                promptly to any incident.
              </p>
            </Section>

            <Section title="Contact">
              <p>
                Questions about this policy or your data? Email us at{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="font-semibold text-primary hover:text-primary-deep"
                >
                  {CONTACT_EMAIL}
                </a>{" "}
                and we&rsquo;ll be glad to help.
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
