import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { ConfirmEmailButton } from "@/components/auth/ConfirmEmailButton";

export const metadata: Metadata = {
  title: "Confirm your email",
  robots: { index: false },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Logo />
        </div>
        <div className="rounded-2xl border border-outline bg-surface p-6 shadow-sm sm:p-8">
          <h1 className="font-display text-2xl font-bold text-ink">Confirm your email</h1>
          <p className="mt-1.5 mb-6 text-sm text-muted">
            Press the button to confirm this is your email address.
          </p>
          <ConfirmEmailButton token={token ?? ""} />
        </div>
      </div>
    </main>
  );
}
