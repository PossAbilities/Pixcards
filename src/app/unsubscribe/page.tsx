import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { UnsubscribeForm } from "@/components/public/UnsubscribeForm";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Unsubscribe | ${APP_NAME}`,
  robots: { index: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-black/5 bg-surface p-8 shadow-sm">
        <Logo />
        <h1 className="mt-6 font-display text-2xl font-bold text-ink">
          Unsubscribe from marketing emails
        </h1>
        <p className="mt-2 text-sm text-muted">
          You&apos;ll still get emails about your account and orders (such as
          receipts and password resets).
        </p>
        <UnsubscribeForm token={token ?? ""} />
      </div>
    </main>
  );
}
