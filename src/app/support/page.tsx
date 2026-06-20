import Link from "next/link";
import type { Metadata } from "next";
import { SiteNav } from "@/components/marketing/SiteNav";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Icon } from "@/components/Icon";
import { buttonClass, Badge } from "@/components/ui";
import { CONTACT_EMAIL, SUPPORT_RESPONSE_TIME } from "@/lib/site";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Support | ${APP_NAME}`,
  description:
    "Help and answers for Pixcards — how NFC works, updating your card, ordering a physical card, Pro features and account help.",
};

const TOPICS: { icon: string; q: string; a: string }[] = [
  {
    icon: "contactless",
    q: "How does NFC tap-to-share work?",
    a: "Every Pixcard has a tiny NFC chip inside. When someone holds their phone near the card, your digital profile opens instantly in their browser — no app and no setup needed on their end.",
  },
  {
    icon: "edit",
    q: "How do I update my card?",
    a: "Sign in and head to your dashboard. Edit your name, title, links, photo or theme and changes go live instantly — your physical card always points to the latest version, so you never reprint.",
  },
  {
    icon: "local_shipping",
    q: "How do I order a physical card?",
    a: "From your dashboard, pick a card material and finish, confirm your shipping details and check out securely with Stripe. Your card arrives pre-linked to your digital profile.",
  },
  {
    icon: "bolt",
    q: "What do I get with Pro?",
    a: "Pro is a one-time upgrade that unlocks unlimited links, premium card themes, the advanced analytics dashboard, custom branding and priority support — yours forever, with no subscription.",
  },
  {
    icon: "account_circle",
    q: "I need help with my account",
    a: "You can update your email and password from your account settings. Forgot your password? Use the reset link on the login page. Still stuck? Email us and we'll sort it out.",
  },
  {
    icon: "qr_code_2",
    q: "Do recipients need an app to view my card?",
    a: "No. Your card opens as a normal web page when tapped or scanned, so anyone with a modern smartphone can view it and save your contact details instantly.",
  },
];

export default function SupportPage() {
  return (
    <>
      <SiteNav />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative hero-gradient overflow-hidden">
          <div className="absolute -top-10 -right-10 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative mx-auto max-w-[1200px] px-4 md:px-12 pt-16 pb-20 text-center">
            <Badge color="primary" className="mb-5">
              <Icon name="help" className="text-[14px]" />
              Help Center
            </Badge>
            <h1 className="font-display text-4xl md:text-5xl font-extrabold tracking-tight text-ink">
              How can we help?
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
              Find quick answers to common questions about {APP_NAME}, or get in
              touch with our team — we&rsquo;re happy to help you get set up.
            </p>
          </div>
        </section>

        {/* Topics / FAQ grid */}
        <section className="bg-surface px-4 md:px-12 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-8 text-center font-display text-2xl font-bold text-ink">
              Popular help topics
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {TOPICS.map((t) => (
                <div
                  key={t.q}
                  className="flex flex-col rounded-2xl border border-black/5 bg-surface p-6 shadow-sm transition-transform hover:-translate-y-1"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary-deep">
                    <Icon name={t.icon} fill className="text-[22px]" />
                  </span>
                  <h3 className="mt-4 font-display font-semibold text-ink">
                    {t.q}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {t.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact card */}
        <section className="bg-surface-low px-4 md:px-12 py-16">
          <div className="mx-auto max-w-3xl">
            <div className="overflow-hidden rounded-2xl border border-black/5 bg-surface shadow-sm">
              <div className="grid gap-8 p-8 md:grid-cols-[1.3fr_1fr] md:p-10">
                <div>
                  <h2 className="font-display text-2xl font-bold text-ink">
                    Still need a hand?
                  </h2>
                  <p className="mt-3 text-[15px] leading-relaxed text-muted">
                    Our team reads every message. Email us with as much detail as
                    you can — including your account email and what you were
                    trying to do — and we&rsquo;ll get back to you{" "}
                    {SUPPORT_RESPONSE_TIME}.
                  </p>
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className={buttonClass("primary", "lg", "mt-6")}
                  >
                    <Icon name="mail" className="text-[20px]" />
                    Email support
                  </a>
                  <p className="mt-3 text-sm text-faint">
                    or write to us at{" "}
                    <a
                      href={`mailto:${CONTACT_EMAIL}`}
                      className="font-semibold text-primary hover:text-primary-deep"
                    >
                      {CONTACT_EMAIL}
                    </a>
                  </p>
                </div>

                <div className="rounded-xl border border-primary-soft bg-primary-soft/30 p-6">
                  <p className="flex items-center gap-2 font-display font-semibold text-primary-deep">
                    <Icon name="schedule" fill className="text-[18px]" />
                    Response time
                  </p>
                  <p className="mt-2 text-sm text-muted">
                    We typically reply {SUPPORT_RESPONSE_TIME}, Monday to Friday.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick links */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Link
                href="/pricing"
                className="flex items-center justify-between rounded-2xl border border-black/5 bg-surface p-5 shadow-sm transition-colors hover:border-primary/40"
              >
                <span>
                  <span className="block font-display font-semibold text-ink">
                    See plans &amp; pricing
                  </span>
                  <span className="text-sm text-muted">
                    Compare Basic and Pro, plus card materials.
                  </span>
                </span>
                <Icon name="arrow_forward" className="text-[20px] text-primary" />
              </Link>
              <Link
                href="/register"
                className="flex items-center justify-between rounded-2xl border border-black/5 bg-surface p-5 shadow-sm transition-colors hover:border-primary/40"
              >
                <span>
                  <span className="block font-display font-semibold text-ink">
                    Create your free card
                  </span>
                  <span className="text-sm text-muted">
                    Get started in minutes — no card required.
                  </span>
                </span>
                <Icon name="arrow_forward" className="text-[20px] text-primary" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
