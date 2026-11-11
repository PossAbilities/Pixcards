import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { Icon } from "@/components/Icon";
import { buttonClass } from "@/components/ui";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { verifyResetToken } from "@/lib/password-reset";

export const metadata: Metadata = {
  title: "Set a new password",
  robots: { index: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; invite?: string }>;
}) {
  const { token, invite: inviteParam } = await searchParams;
  const invite = inviteParam === "1";
  const valid = token ? Boolean(await verifyResetToken(token)) : false;

  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted transition hover:text-ink"
          >
            <Icon name="arrow_back" className="text-[16px]" />
            Back to log in
          </Link>
        </div>

        <div className="rounded-2xl border border-black/5 bg-surface p-7 shadow-[0_8px_30px_rgba(0,0,0,0.06)] sm:p-8">
          {valid && token ? (
            <>
              <h1 className="font-display text-2xl font-bold text-ink">
                {invite ? "Set up your account" : "Choose a new password"}
              </h1>
              <p className="mt-1.5 mb-6 text-sm text-muted">
                {invite
                  ? "Choose a password for your Pixcards account. Next you\u2019ll add your photo, bio and links to finish your card."
                  : "Enter a new password for your Pixcards account. You\u2019ll be logged in automatically."}
              </p>
              <ResetPasswordForm token={token} invite={invite} />
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
                {invite
                  ? "This set-up link has expired or has already been used. Request a new one below with the same email address, or ask your admin to resend your invitation."
                  : "This password reset link has expired or has already been used. Reset links are valid for 60 minutes."}
              </p>
              <Link
                href="/forgot-password"
                className={buttonClass("primary", "md", "mt-5 w-full")}
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
