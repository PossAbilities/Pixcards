import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Icon } from "@/components/Icon";
import { CardMockup } from "@/components/CardMockup";
import { AuthForm } from "@/components/auth/AuthForm";

const features: { icon: string; text: string }[] = [
  { icon: "contactless", text: "NFC tap & QR code sharing — no app to download" },
  { icon: "sync", text: "Real-time updates across all your live cards" },
  { icon: "monitoring", text: "Analytics on views, taps and saved contacts" },
];

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; from?: string }>;
}) {
  const { next, from } = await searchParams;
  // Where the back button goes — the page they came from (e.g. a profile),
  // falling back to the home page. Only same-site relative paths are allowed.
  const safeFrom =
    from && from.startsWith("/") && !from.startsWith("//") ? from : null;
  const backHref = safeFrom ?? "/";
  const backLabel = safeFrom ? "Back" : "Back to home";
  return (
    <main className="min-h-screen flex bg-background">
      {/* Brand panel */}
      <section className="relative hidden md:flex md:w-1/2 lg:w-[55%] flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary to-primary-deep p-10 lg:p-14 text-white">
        {/* decorative blurred circles */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-96 w-96 -translate-x-1/3 translate-y-1/3 rounded-full bg-primary-soft/20 blur-3xl" />
        <div className="pointer-events-none absolute top-1/4 left-12 h-40 w-40 rounded-full bg-tertiary-bright/20 blur-2xl" />

        <div className="relative z-10">
          <span className="inline-flex items-center gap-2">
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-white/15 backdrop-blur text-white">
              <span className="material-symbols-outlined text-[22px] fill">
                contactless
              </span>
            </span>
            <span className="font-display text-2xl font-extrabold tracking-tight text-white">
              Pixcards
            </span>
          </span>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="font-display text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight">
            Join 50,000+ professionals.
          </h1>
          <p className="mt-4 text-white/80 text-lg leading-relaxed">
            One smart card for every introduction. Create your profile today and
            start sharing in minutes.
          </p>

          <div className="mt-10 mx-auto max-w-[320px] rotate-[6deg] drop-shadow-2xl transition-transform hover:rotate-[3deg]">
            <CardMockup
              name="Jordan Lee"
              title="Founder & CEO"
              materialId="white-gloss"
            />
          </div>
        </div>

        <ul className="relative z-10 space-y-3">
          {features.map((f) => (
            <li key={f.text} className="flex items-center gap-3 text-sm text-white/90">
              <span className="grid place-items-center w-6 h-6 rounded-full bg-white/15 shrink-0">
                <Icon name={f.icon} fill className="text-[15px]" />
              </span>
              {f.text}
            </li>
          ))}
        </ul>
      </section>

      {/* Form panel */}
      <section className="flex w-full md:w-1/2 lg:w-[45%] flex-col items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between">
            <Logo />
            <Link
              href={backHref}
              className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink transition"
            >
              <Icon name="arrow_back" className="text-[16px]" />
              {backLabel}
            </Link>
          </div>

          <div className="rounded-2xl border border-black/5 bg-surface p-7 shadow-[0_8px_30px_rgba(0,0,0,0.06)] sm:p-8">
            <h2 className="font-display text-2xl font-bold text-ink">
              Create your free account
            </h2>
            <p className="mt-1.5 mb-6 text-sm text-muted">
              No card required to start. Build your digital profile in minutes.
            </p>

            <AuthForm mode="register" next={next} />
          </div>

          <p className="mt-5 text-center text-xs text-faint">
            By creating an account you agree to our Terms & Privacy Policy.
          </p>
        </div>
      </section>
    </main>
  );
}
