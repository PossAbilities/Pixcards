"use client";

import { useSyncExternalStore } from "react";
import { CONTACT_EMAIL } from "@/lib/site";

const subscribe = () => () => {};

/**
 * A mailto link to the contact address that Cloudflare's Email Obfuscation
 * leaves alone. Cloudflare rewrites any `mailto:` href or plain-text address in
 * the server HTML into a `/cdn-cgi/l/email-protection` link, which 404s for
 * crawlers and link checkers. So the server HTML carries neither: the href is
 * only attached once we're in the browser, and the visible address is split
 * across text nodes so it never matches as a single string.
 */
export function EmailLink({
  subject,
  className,
  children,
}: {
  subject?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const href = subject
    ? `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`
    : `mailto:${CONTACT_EMAIL}`;
  const [user, domain] = CONTACT_EMAIL.split("@");
  return (
    <a href={mounted ? href : undefined} className={className}>
      {children ?? (
        <>
          {user}
          <span>@</span>
          {domain}
        </>
      )}
    </a>
  );
}
