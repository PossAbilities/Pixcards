// Central site config — single source of truth for contact + external links.
// Owners can edit the placeholder URLs below; the rest of the app reads from here
// so there are no dead links anywhere in the UI.

export const CONTACT_EMAIL = "hello@pixcards.app";

export const SUPPORT_RESPONSE_TIME = "within 1 business day";

export type SocialLink = {
  label: string;
  href: string;
};

/** Working external placeholder URLs — replace with real profiles when ready. */
export const SOCIAL_LINKS: SocialLink[] = [
  { label: "LinkedIn", href: "https://www.linkedin.com/" },
  { label: "Facebook", href: "https://www.facebook.com/" },
  { label: "X", href: "https://x.com/" },
];

export type FooterLink = {
  label: string;
  href: string;
};

export const FOOTER_LINKS: {
  product: FooterLink[];
  company: FooterLink[];
  legal: FooterLink[];
} = {
  product: [
    { label: "Features", href: "/#features" },
    { label: "Pricing", href: "/pricing" },
    { label: "Get started", href: "/register" },
    { label: "Live demo card", href: "/u/alex" },
  ],
  company: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Policy", href: "/cookies" },
    { label: "Support", href: "/support" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Policy", href: "/cookies" },
  ],
};
