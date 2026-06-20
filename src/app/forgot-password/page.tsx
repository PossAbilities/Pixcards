import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { Icon } from "@/components/Icon";
import { CardMockup } from "@/components/CardMockup";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Reset your password | ${APP_NAME}`,
  description:
    "Forgot your Pixcards password? Enter your email and we'll send reset instructions.",
};

const trust = [
  "Tap-to-share NFC cards & dynamic QR codes",
  "Update your details once — everywhere stays in sync",
  "Built-in analytics on every view and tap",
];

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen flex bg-background">
      {/* Brand panel */}
      <section className="relative hidden md:flex md:w-1/2 lg:w-[55%] flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary to-primary-deep p-10 lg:p-14 text-white">
        {/* decorative blurred circles */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 translate-x-1/3 translate-y-1/3 rounded-full bg-primary-soft/20 blur-3xl" />
        <div className="pointer-events-none absolute top-1/3 right-10 h-40 w-40 rounded-full bg-tertiary-bright/20 blur-2xl" />

        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 group">
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
            Let&rsquo;s get you back in.
          </h1>
          <p className="mt-4 text-white/80 text-lg leading-relaxed">
            Forgotten your password? It happens. Enter your email and we&rsquo;ll
            send you instructions to reset it.
          </p>

          <div className="mt-10 mx-auto max-w-[320px] rotate-[-6deg] drop-shadow-2xl transition-transform hover:rotate-[-3deg]">
            <CardMockup
              name="Alex Morgan"
              title="Product Designer"
              materialId="matte-black"
            />
          </div>
        </div>

        <ul className="relative z-10 space-y-3">
          {trust.map((t) => (
            <li key={t} className="flex items-center gap-3 text-sm text-white/90">
              <span className="grid place-items-center w-6 h-6 rounded-full bg-white/15 shrink-0">
                <Icon name="check" fill className="text-[15px]" />
              </span>
              {t}
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
              href="/"
              className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink transition"
            >
              <Icon name="arrow_back" className="text-[16px]" />
              Back to home
            </Link>
          </div>

          <div className="rounded-2xl border border-black/5 bg-surface p-7 shadow-[0_8px_30px_rgba(0,0,0,0.06)] sm:p-8">
            <h2 className="font-display text-2xl font-bold text-ink">
              Reset your password
            </h2>
            <p className="mt-1.5 mb-6 text-sm text-muted">
              Enter the email associated with your account and we&rsquo;ll send a
              reset link.
            </p>

            <ForgotPasswordForm />

            <p className="mt-6 text-center text-sm text-muted">
              <Link
                href="/login"
                className="inline-flex items-center gap-1 font-semibold text-primary hover:text-primary-deep"
              >
                <Icon name="arrow_back" className="text-[16px]" />
                Back to login
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
