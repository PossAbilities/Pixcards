import Link from "next/link";
import { SiteNav } from "@/components/marketing/SiteNav";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Reveal } from "@/components/marketing/Reveal";
import { CardMockup } from "@/components/CardMockup";
import { Icon } from "@/components/Icon";
import { buttonClass, Badge } from "@/components/ui";
import { money, PRO_PRICE_CENTS } from "@/lib/constants";

export default function LandingPage() {
  return (
    <>
      <SiteNav />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative hero-gradient overflow-hidden">
          <div className="absolute -top-10 -right-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
          <div className="max-w-[1200px] mx-auto px-4 md:px-12 pt-16 pb-24 grid md:grid-cols-2 gap-12 items-center relative">
            <div className="text-center md:text-left">
              <Badge color="primary" className="mb-5">
                <Icon name="auto_awesome" className="text-[14px]" />
                Revolutionising Networking
              </Badge>
              <h1 className="font-display text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05] text-ink">
                The Last Business Card You&apos;ll Ever Need.
              </h1>
              <p className="mt-5 text-lg text-muted max-w-xl mx-auto md:mx-0">
                Share your professional identity instantly with NFC and QR.
                Stand out, get connected, and grow your network — all from one
                beautiful Pixcard.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                <Link href="/register" className={buttonClass("primary", "lg")}>
                  <Icon name="contactless" className="text-[20px] fill" />
                  Order Your Pixcard
                </Link>
                <Link href="/pricing" className={buttonClass("outline", "lg")}>
                  View Pricing
                </Link>
              </div>
              <div className="mt-8 flex items-center gap-6 justify-center md:justify-start text-sm text-muted">
                <span className="flex items-center gap-1.5">
                  <Icon name="group" className="text-primary text-[18px]" />
                  50,000+ professionals
                </span>
                <span className="flex items-center gap-1.5">
                  <Icon name="star" className="text-amber-500 text-[18px] fill" />
                  4.9/5 rating
                </span>
              </div>
            </div>
            <div className="relative">
              <div className="relative z-10 max-w-sm mx-auto transform rotate-6 hover:rotate-3 transition-transform duration-500">
                <CardMockup name="Alex Sterling" title="Senior Product Designer" materialId="white-gloss" />
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary/10 rounded-full blur-3xl -z-0" />
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-20 px-4 md:px-12 bg-surface">
          <div className="max-w-[1200px] mx-auto">
            <Reveal className="text-center mb-14">
              <h2 className="font-display text-3xl font-bold">Unmatched Connectivity Features</h2>
              <p className="mt-2 text-muted">Built for modern professionals who value speed and efficiency.</p>
            </Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              <Reveal className="md:col-span-2 bg-surface rounded-2xl border border-black/5 shadow-sm p-7 hover:-translate-y-1 transition-transform">
                <FeatureIcon icon="nfc" tone="primary" />
                <h3 className="font-display text-xl font-semibold mt-4">Smart Sharing</h3>
                <p className="mt-2 text-muted text-sm">
                  Share your contact info, social links, and portfolio with a single tap or scan.
                  No apps required for the recipient — it just works.
                </p>
                <div className="mt-5 rounded-xl bg-gradient-to-br from-primary/90 to-primary-deep p-6 text-white flex items-center gap-4">
                  <Icon name="smartphone" className="text-4xl" />
                  <Icon name="arrow_forward" className="text-2xl opacity-70" />
                  <Icon name="contactless" className="text-4xl fill" />
                  <span className="ml-auto text-sm font-semibold opacity-90">Tap to connect</span>
                </div>
              </Reveal>
              <Reveal delay={80} className="bg-surface rounded-2xl border border-black/5 shadow-sm p-7 hover:-translate-y-1 transition-transform">
                <FeatureIcon icon="edit_note" tone="tertiary" />
                <h3 className="font-display text-lg font-semibold mt-4">Real-time Updates</h3>
                <p className="mt-2 text-muted text-sm">
                  Change your number, job title, or company? Update your profile instantly online —
                  never reprint a card again.
                </p>
              </Reveal>
              <Reveal delay={160} className="bg-surface rounded-2xl border border-black/5 shadow-sm p-7 hover:-translate-y-1 transition-transform">
                <FeatureIcon icon="monitoring" tone="info" />
                <h3 className="font-display text-lg font-semibold mt-4">Analytics</h3>
                <p className="mt-2 text-muted text-sm">
                  Track how many times your card is scanned and which links get the most attention from your leads.
                </p>
              </Reveal>

              {/* Eco strip */}
              <Reveal className="md:col-span-2 lg:col-span-4 rounded-2xl bg-inverse text-white p-8 flex flex-col md:flex-row items-center gap-6">
                <div className="flex-1">
                  <h3 className="font-display text-2xl font-bold text-primary-soft">Eco-friendly &amp; Sustainable</h3>
                  <p className="mt-2 text-white/80 max-w-xl">
                    One Pixcard replaces thousands of paper business cards. Reduce your carbon footprint
                    while maintaining a premium professional image.
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-tertiary-bright">
                    <Icon name="park" className="fill" />
                    <span className="font-semibold text-sm">1,000+ trees saved by our community this year</span>
                  </div>
                </div>
                <div className="w-full md:w-72 glass rounded-xl p-4 bg-white/5 border-white/10">
                  <div className="flex justify-between text-xs mb-2">
                    <span>Paper waste saved</span>
                    <span className="text-tertiary-bright font-semibold">92%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full w-[92%] bg-tertiary-bright" />
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="py-20 px-4 md:px-12 bg-surface-low">
          <div className="max-w-[1200px] mx-auto">
            <Reveal className="text-center mb-14">
              <h2 className="font-display text-3xl font-bold">Up and running in minutes</h2>
              <p className="mt-2 text-muted">From sign-up to your first tap — it&apos;s effortless.</p>
            </Reveal>
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { icon: "person_add", title: "Create your profile", body: "Sign up free and build your digital card with links, socials and contact details." },
                { icon: "design_services", title: "Design your card", body: "Pick a premium material and finish, then customise it to match your brand." },
                { icon: "local_shipping", title: "We print & ship", body: "Your NFC card is produced and delivered, pre-linked to your account." },
                { icon: "contactless", title: "Tap & share", body: "Tap your card or show your QR code to share everything instantly." },
              ].map((s, i) => (
                <Reveal key={s.title} delay={i * 80} className="bg-surface rounded-2xl border border-black/5 p-6">
                  <div className="flex items-center justify-between">
                    <FeatureIcon icon={s.icon} tone="primary" />
                    <span className="font-display text-4xl font-extrabold text-primary/15">{i + 1}</span>
                  </div>
                  <h3 className="font-display font-semibold mt-3">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-muted">{s.body}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing preview */}
        <section id="pricing" className="py-20 px-4 md:px-12 bg-surface">
          <div className="max-w-4xl mx-auto">
            <Reveal className="text-center mb-12">
              <h2 className="font-display text-3xl font-bold">Simple, Transparent Pricing</h2>
              <p className="mt-2 text-muted">Choose the plan that fits your networking style.</p>
            </Reveal>
            <div className="grid md:grid-cols-2 gap-6 items-stretch">
              <Reveal className="bg-surface rounded-2xl border border-black/5 shadow-sm p-8 flex flex-col">
                <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Free Starter</span>
                <h3 className="font-display text-2xl font-bold mt-1">Basic</h3>
                <div className="flex items-baseline gap-1 mt-3">
                  <span className="font-display text-4xl font-extrabold">£0</span>
                  <span className="text-muted text-sm">/forever</span>
                </div>
                <ul className="mt-6 space-y-3 text-sm flex-1">
                  <Perk ok>Digital QR &amp; NFC profile</Perk>
                  <Perk ok>Contact info sharing</Perk>
                  <Perk ok>Up to 5 social links</Perk>
                  <Perk>Custom themes &amp; branding</Perk>
                  <Perk>Advanced analytics</Perk>
                </ul>
                <Link href="/register" className={buttonClass("outline", "lg", "mt-6 w-full")}>Get Started Free</Link>
              </Reveal>
              <Reveal delay={80} className="relative bg-surface rounded-2xl border-2 border-primary shadow-xl p-8 flex flex-col md:scale-[1.03]">
                <span className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl">MOST POPULAR</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">Advanced Networking</span>
                <h3 className="font-display text-2xl font-bold mt-1">Pro</h3>
                <div className="flex items-baseline gap-1 mt-3">
                  <span className="font-display text-4xl font-extrabold">{money(PRO_PRICE_CENTS)}</span>
                  <span className="text-muted text-sm">one-time</span>
                </div>
                <ul className="mt-6 space-y-3 text-sm flex-1">
                  <Perk ok>Everything in Basic</Perk>
                  <Perk ok>Unlimited links</Perk>
                  <Perk ok>Premium card themes</Perk>
                  <Perk ok>Advanced analytics dashboard</Perk>
                  <Perk ok>Priority support &amp; custom branding</Perk>
                </ul>
                <Link href="/pricing" className={buttonClass("primary", "lg", "mt-6 w-full")}>Upgrade to Pro</Link>
              </Reveal>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative py-20 px-4 md:px-12 bg-primary text-white text-center overflow-hidden">
          <div className="absolute -bottom-24 -left-24 w-96 h-96 border-[40px] border-white/5 rounded-full" />
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
          <div className="max-w-2xl mx-auto relative">
            <h2 className="font-display text-3xl md:text-4xl font-extrabold">Ready to Upgrade Your Identity?</h2>
            <p className="mt-3 text-white/85 text-lg">Join 50,000+ professionals making better connections with Pixcards.</p>
            <Link href="/register" className="mt-8 inline-flex items-center gap-2 bg-white text-primary font-semibold text-lg px-8 py-3.5 rounded-lg hover:-translate-y-0.5 hover:shadow-2xl transition-all">
              <Icon name="contactless" className="fill" />
              Order Your Card Today
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function FeatureIcon({ icon, tone }: { icon: string; tone: "primary" | "tertiary" | "info" }) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    tertiary: "bg-tertiary-soft text-tertiary",
    info: "bg-blue-100 text-blue-600",
  };
  return (
    <div className={`w-12 h-12 rounded-xl grid place-items-center ${tones[tone]}`}>
      <Icon name={icon} className="text-2xl" />
    </div>
  );
}

function Perk({ children, ok }: { children: React.ReactNode; ok?: boolean }) {
  return (
    <li className={`flex items-center gap-2 ${ok ? "" : "text-faint/60"}`}>
      <Icon name={ok ? "check_circle" : "block"} className={`text-[18px] ${ok ? "text-primary" : ""}`} />
      {children}
    </li>
  );
}
