import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { SiteNav } from "@/components/marketing/SiteNav";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Reveal } from "@/components/marketing/Reveal";
import { Icon } from "@/components/Icon";
import { buttonClass, ProBadge, Badge } from "@/components/ui";
import { UpgradeButton } from "@/components/public/UpgradeButton";
import { upgradeToPro } from "@/lib/actions/checkout";
import { money, PRO_PRICE_CENTS, CARD_MATERIALS, APP_NAME } from "@/lib/constants";

// Form-action wrapper: upgradeToPro redirects on success and only returns an
// error object on failure, which we surface by redirecting back with a flag.
async function upgradePro(): Promise<void> {
  "use server";
  const result = await upgradeToPro();
  if (result?.error) {
    redirect("/pricing?cancelled=1");
  }
}

export const metadata: Metadata = {
  title: `Pricing | ${APP_NAME}`,
  description:
    "Simple, transparent pricing. Start free, or unlock unlimited links, premium themes, advanced analytics and custom branding with a one-time Pro upgrade.",
};

type Cell = boolean | string;

const COMPARISON: { feature: string; basic: Cell; pro: Cell }[] = [
  { feature: "Digital QR & NFC profile", basic: true, pro: true },
  { feature: "Number of links", basic: "5", pro: "Unlimited" },
  { feature: "Contact sharing (vCard)", basic: true, pro: true },
  { feature: "Premium card themes", basic: false, pro: true },
  { feature: "Advanced analytics", basic: false, pro: true },
  { feature: "Custom branding", basic: false, pro: true },
  { feature: "Priority support", basic: false, pro: true },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "How does NFC work?",
    a: "Every Pixcard has a tiny NFC chip embedded inside. When someone taps it to the back of their phone, your digital card opens instantly in their browser — no setup required on your end.",
  },
  {
    q: "Do recipients need an app?",
    a: "No. Your card opens as a normal web page when tapped or scanned. Anyone with a modern smartphone can view it and save your contact details — no downloads, no accounts.",
  },
  {
    q: "Can I update my card later?",
    a: "Yes, anytime. Change your job title, phone number, links or photo from your dashboard and it updates everywhere instantly. You never have to reprint a card.",
  },
  {
    q: "Is Pro a subscription?",
    a: "No — Pro is a single one-time payment. Pay once and keep unlimited links, premium themes, analytics and custom branding forever.",
  },
  {
    q: "What's included in Pro?",
    a: "Pro unlocks unlimited links, every premium theme, the advanced analytics dashboard, custom branding and priority support — plus access to the premium metal card material.",
  },
];

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const { cancelled } = await searchParams;

  return (
    <>
      <SiteNav />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative hero-gradient overflow-hidden">
          <div className="absolute -top-10 -right-10 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative mx-auto max-w-[1200px] px-4 md:px-12 pt-16 pb-20 text-center">
            <Badge color="primary" className="mb-5">
              <Icon name="sell" className="text-[14px]" />
              No subscriptions, ever
            </Badge>
            <h1 className="font-display text-4xl md:text-5xl font-extrabold tracking-tight text-ink">
              Simple, transparent pricing
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
              Start free and share your digital card today. Upgrade once to
              unlock the full power of {APP_NAME} — no recurring fees.
            </p>
          </div>
        </section>

        {/* Cancelled banner */}
        {cancelled && (
          <div className="mx-auto max-w-4xl px-4 md:px-12 -mt-6">
            <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">
              <Icon name="info" className="text-[20px]" />
              Checkout cancelled — no payment was taken. You can upgrade whenever
              you&apos;re ready.
            </div>
          </div>
        )}

        {/* Plans */}
        <section className="px-4 md:px-12 py-16 bg-surface">
          <div className="mx-auto grid max-w-4xl items-stretch gap-6 md:grid-cols-2">
            {/* Basic */}
            <Reveal className="flex flex-col rounded-2xl border border-black/5 bg-surface p-8 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                Free Starter
              </span>
              <h2 className="mt-1 font-display text-2xl font-bold">Basic</h2>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-4xl font-extrabold">£0</span>
                <span className="text-sm text-muted">/forever</span>
              </div>
              <p className="mt-3 text-sm text-muted">
                Everything you need to share your professional identity online.
              </p>
              <ul className="mt-6 flex-1 space-y-3 text-sm">
                <Perk ok>Digital QR &amp; NFC profile</Perk>
                <Perk ok>Up to 5 links</Perk>
                <Perk ok>Contact sharing (vCard)</Perk>
                <Perk ok>Real-time profile updates</Perk>
                <Perk>Premium card themes</Perk>
                <Perk>Advanced analytics &amp; branding</Perk>
              </ul>
              <Link
                href="/register"
                className={buttonClass("outline", "lg", "mt-7 w-full")}
              >
                Get started free
              </Link>
            </Reveal>

            {/* Pro */}
            <Reveal
              delay={80}
              className="relative flex flex-col rounded-2xl border-2 border-primary bg-surface p-8 shadow-xl md:scale-[1.03]"
            >
              <span className="absolute right-0 top-0 rounded-bl-xl rounded-tr-2xl bg-primary px-3 py-1 text-xs font-bold text-white">
                MOST POPULAR
              </span>
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                Advanced networking <ProBadge />
              </span>
              <h2 className="mt-1 font-display text-2xl font-bold">Pro</h2>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-4xl font-extrabold">
                  {money(PRO_PRICE_CENTS)}
                </span>
                <span className="text-sm text-muted">one-time</span>
              </div>
              <p className="mt-3 text-sm text-muted">
                Pay once, keep everything forever. No subscription.
              </p>
              <ul className="mt-6 flex-1 space-y-3 text-sm">
                <Perk ok>Everything in Basic</Perk>
                <Perk ok>Unlimited links</Perk>
                <Perk ok>Premium card themes</Perk>
                <Perk ok>Advanced analytics dashboard</Perk>
                <Perk ok>Custom branding</Perk>
                <Perk ok>Priority support</Perk>
              </ul>
              <form action={upgradePro} className="mt-7">
                <UpgradeButton />
              </form>
              <p className="mt-3 text-center text-xs text-faint">
                Secure checkout · One-time payment
              </p>
            </Reveal>
          </div>
        </section>

        {/* Feature comparison */}
        <section className="px-4 md:px-12 py-16 bg-surface-low">
          <div className="mx-auto max-w-4xl">
            <Reveal className="mb-10 text-center">
              <h2 className="font-display text-3xl font-bold">Compare plans</h2>
              <p className="mt-2 text-muted">
                Everything in Basic, plus a lot more in Pro.
              </p>
            </Reveal>
            <Reveal className="overflow-hidden rounded-2xl border border-black/5 bg-surface shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/5 bg-surface-high/50">
                    <th className="px-5 py-4 text-left font-semibold text-muted">
                      Feature
                    </th>
                    <th className="px-5 py-4 text-center font-display font-semibold">
                      Basic
                    </th>
                    <th className="px-5 py-4 text-center font-display font-semibold text-primary">
                      Pro
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row, i) => (
                    <tr
                      key={row.feature}
                      className={i % 2 === 1 ? "bg-surface-low/40" : undefined}
                    >
                      <td className="px-5 py-3.5 font-medium text-ink">
                        {row.feature}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <CompareCell value={row.basic} />
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <CompareCell value={row.pro} pro />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Reveal>
          </div>
        </section>

        {/* Card materials */}
        <section className="px-4 md:px-12 py-16 bg-surface">
          <div className="mx-auto max-w-5xl">
            <Reveal className="mb-10 text-center">
              <h2 className="font-display text-3xl font-bold">
                Card materials &amp; pricing
              </h2>
              <p className="mt-2 text-muted">
                Order a physical NFC card pre-linked to your profile. Choose the
                finish that fits your brand.
              </p>
            </Reveal>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {CARD_MATERIALS.map((m, i) => (
                <Reveal
                  key={m.id}
                  delay={i * 70}
                  className="flex flex-col rounded-2xl border border-black/5 bg-surface p-5 shadow-sm transition-transform hover:-translate-y-1"
                >
                  <div
                    className="h-28 rounded-xl ring-1 ring-black/5"
                    style={{ background: m.swatch }}
                  />
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <h3 className="font-display font-semibold">{m.name}</h3>
                    {m.pro && <ProBadge />}
                  </div>
                  <p className="mt-1.5 flex-1 text-sm text-muted">
                    {m.description}
                  </p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="font-display text-2xl font-extrabold">
                      {money(m.priceCents)}
                    </span>
                    <span className="text-xs text-muted">each</span>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-4 md:px-12 py-16 bg-surface-low">
          <div className="mx-auto max-w-3xl">
            <Reveal className="mb-10 text-center">
              <h2 className="font-display text-3xl font-bold">
                Frequently asked questions
              </h2>
              <p className="mt-2 text-muted">
                Everything you need to know before you start.
              </p>
            </Reveal>
            <div className="flex flex-col gap-3">
              {FAQS.map((f) => (
                <details
                  key={f.q}
                  className="group rounded-2xl border border-black/5 bg-surface p-5 shadow-sm [&_summary::-webkit-details-marker]:hidden"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-3 font-display font-semibold text-ink">
                    {f.q}
                    <Icon
                      name="expand_more"
                      className="text-[24px] text-muted transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA band */}
        <section className="relative overflow-hidden bg-primary px-4 md:px-12 py-20 text-center text-white">
          <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full border-[40px] border-white/5" />
          <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="font-display text-3xl md:text-4xl font-extrabold">
              Ready to upgrade your identity?
            </h2>
            <p className="mt-3 text-lg text-white/85">
              Start free in minutes — upgrade to Pro whenever you&apos;re ready.
            </p>
            <Link
              href="/register"
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-8 py-3.5 text-lg font-semibold text-primary transition-all hover:-translate-y-0.5 hover:shadow-2xl"
            >
              <Icon name="contactless" className="fill" />
              Create your free card
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function CompareCell({ value, pro }: { value: Cell; pro?: boolean }) {
  if (typeof value === "string") {
    return (
      <span
        className={
          pro ? "font-semibold text-primary" : "font-medium text-ink"
        }
      >
        {value}
      </span>
    );
  }
  return value ? (
    <Icon
      name="check_circle"
      className={`text-[20px] ${pro ? "text-primary" : "text-emerald-500"}`}
    />
  ) : (
    <Icon name="remove" className="text-[20px] text-faint/60" />
  );
}

function Perk({ children, ok }: { children: React.ReactNode; ok?: boolean }) {
  return (
    <li className={`flex items-center gap-2 ${ok ? "" : "text-faint/60"}`}>
      <Icon
        name={ok ? "check_circle" : "block"}
        className={`text-[18px] ${ok ? "text-primary" : ""}`}
      />
      {children}
    </li>
  );
}
