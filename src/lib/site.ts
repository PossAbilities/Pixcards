// Central site config — single source of truth for contact, business and
// external links. The legal pages, footer and emails all read from here.

export const CONTACT_EMAIL = "hello@pixcards.co.uk";

export const SUPPORT_RESPONSE_TIME = "within 1 business day";

/**
 * The legal entity behind Pixcards. UK law (E-Commerce Regulations 2002,
 * Companies Act 2006, Consumer Contracts Regulations 2013) requires the
 * operator's legal name, a geographic postal address and — where they exist —
 * the company/charity number and VAT number to be shown on the site.
 *
 * Fields left as `null` are simply not displayed, so nothing false is ever
 * shown.
 */
export const BUSINESS = {
  /** Brand customers see. */
  tradingName: "Pixcards",
  /** Who runs the service. */
  operatorName: "PossAbilities",
  /** Exact registered name, e.g. "PossAbilities CIC". */
  legalName: "PossAbilities CIC" as string | null,
  /** e.g. "Community interest company registered in England and Wales". */
  legalForm: "community interest company registered in England and Wales" as string | null,
  /** Companies House number, e.g. "01234567". */
  companyNumber: "08837981" as string | null,
  /** Charity number, if a registered charity. */
  charityNumber: null as string | null,
  /** Registered office / trading address (a real postal address, not a PO box). */
  address:
    "The Cherwell Wellbeing Hub, Cherwell Avenue, Heywood, Rochdale, Lancashire, OL10 4SY" as
      | string
      | null,
  /** e.g. "GB 123 4567 89". TODO(owner): PossAbilities is VAT-registered — add the number. */
  vatNumber: null as string | null,
};

/** The name to use in legal text: the registered name once set, else the operator. */
export const LEGAL_NAME = BUSINESS.legalName ?? BUSINESS.operatorName;

export type SocialLink = {
  label: "LinkedIn" | "Facebook" | "Instagram" | "X";
  href: string;
};

/**
 * Real Pixcards social profiles only. Leave empty until they exist — the footer
 * hides the icons rather than pointing at a generic homepage.
 */
export const SOCIAL_LINKS: SocialLink[] = [];

export type FooterLink = {
  label: string;
  href: string;
};

export const LEGAL_LINKS: FooterLink[] = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Refund Policy", href: "/refunds" },
  { label: "Cookie Policy", href: "/cookies" },
  { label: "Accessibility", href: "/accessibility" },
];
