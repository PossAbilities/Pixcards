"use client";

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { StatusScreen } from "@/components/StatusScreen";
import { buttonClass } from "@/components/ui";
import { CONTACT_EMAIL } from "@/lib/site";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <StatusScreen
      icon="error"
      title="Something didn't load"
      actions={
        <>
          <button type="button" onClick={reset} className={buttonClass("primary", "lg")}>
            <Icon name="refresh" className="text-[20px]" />
            Try again
          </button>
          <Link href="/" className={buttonClass("outline", "lg")}>
            <Icon name="home" className="text-[20px]" />
            Back to home
          </Link>
        </>
      }
    >
      <p>
        We couldn&apos;t load this page. Please try again in a moment. If it
        keeps happening, email{" "}
        <a
          href={`mailto:${CONTACT_EMAIL}${error.digest ? `?subject=${encodeURIComponent(`Error ${error.digest}`)}` : ""}`}
          className="font-semibold text-primary-deep underline"
        >
          {CONTACT_EMAIL}
        </a>
        {error.digest ? " and quote the reference below." : "."}
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-xs text-muted">Reference: {error.digest}</p>
      )}
    </StatusScreen>
  );
}
