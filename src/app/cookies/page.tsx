import type { Metadata } from "next";
import { SiteNav } from "@/components/marketing/SiteNav";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { CONTACT_EMAIL } from "@/lib/site";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Cookie Policy | ${APP_NAME}`,
  description:
    "How Pixcards uses cookies, including the essential session cookie that keeps you signed in and limited analytics.",
};

export default function CookiesPage() {
  return (
    <>
      <SiteNav />
      <main className="flex-1 bg-surface">
        <article className="mx-auto max-w-3xl px-4 md:px-6 py-16">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Legal
          </p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink">
            Cookie Policy
          </h1>
          <p className="mt-3 text-sm text-faint">Last updated: June 2026</p>

          <div className="mt-10 space-y-10 text-[15px] leading-relaxed text-muted">
            <p>
              This Cookie Policy explains how {APP_NAME} uses cookies and similar
              technologies when you visit our website or use the Service.
            </p>

            <Section title="What Are Cookies?">
              <p>
                Cookies are small text files placed on your device when you visit
                a website. They allow the site to remember your actions and
                preferences over time — for example, keeping you signed in so you
                don&rsquo;t have to log in on every page.
              </p>
            </Section>

            <Section title="Essential Session Cookie">
              <p>
                {APP_NAME} uses a single{" "}
                <strong className="text-ink">essential session cookie</strong> to
                authenticate you and keep you securely signed in to your
                dashboard. This cookie is strictly necessary for the Service to
                function and cannot be switched off without breaking sign-in. It
                does not track you across other websites.
              </p>
            </Section>

            <Section title="Analytics">
              <p>
                We use limited, privacy-respecting analytics to understand how the
                Service is used in aggregate — for example, which features are
                popular and how cards perform. These analytics help us improve{" "}
                {APP_NAME} and are not used to build advertising profiles or to
                identify you individually.
              </p>
            </Section>

            <Section title="Managing Cookies">
              <p>
                You can control and delete cookies through your browser settings.
                Please note that blocking the essential session cookie will
                prevent you from signing in and using your dashboard. Most
                browsers let you clear existing cookies and block future ones from
                the privacy or security section of their settings.
              </p>
            </Section>

            <Section title="Contact">
              <p>
                If you have any questions about our use of cookies, email us at{" "}
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
