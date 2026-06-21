import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { Icon } from "@/components/Icon";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { verifyResetToken } from "@/lib/password-reset";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Set a new password | ${APP_NAME}`,
  robots: { index: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const valid = token ? Boolean(await verifyResetToken(token)) : false;

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted transition hover:text-ink"
          >
            <Icon name="arrow_back" className="text-[16px]" />
            Back to login
          </Link>
        </div>

        <div className="rounded-2xl border border-black/5 bg-surface p-7 shadow-[0_8px_30px_rgba(0,0,0,0.06)] sm:p-8">
          {valid && token ? (
            <>
              <h1 className="font-display text-2xl font-bold text-ink">
                Choose a new password
              </h1>
              <p className="mt-1.5 mb-6 text-sm text-muted">
                Enter a new password for your Pixcards account. You&rsquo;ll be
                signed in automatically.
              </p>
              <ResetPasswordForm token={token} />
            </>
          ) : (
            <div className="text-center">
              <Icon
                name="link_off"
                className="mx-auto text-[40px] text-faint"
              />
              <h1 className="mt-3 font-display text-2xl font-bold text-ink">
                Link expired or invalid
              </h1>
              <p className="mt-2 text-sm text-muted">
                This password reset link has expired or has already been used.
                Reset links are valid for 60 minutes.
              </p>
              <Link
                href="/forgot-password"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5"
              >
                Request a new link
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
