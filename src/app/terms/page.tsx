import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalPage,
  Section,
  MailLink,
  BusinessDetails,
} from "@/components/marketing/LegalPage";
import { LEGAL_NAME } from "@/lib/site";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Terms of Service | ${APP_NAME}`,
  description:
    "The terms for using Pixcards, including accounts, Pro, organisation plans and physical card orders.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="13 October 2026">
      <p>
        These terms apply when you use {APP_NAME} (the &ldquo;Service&rdquo;),
        including the website, digital cards, Pro upgrade, organisation plans
        and physical NFC cards. Please read them together with our{" "}
        <Link href="/privacy">Privacy Policy</Link> and{" "}
        <Link href="/refunds">Refund Policy</Link>.
      </p>

      <Section id="who" title="1. Who we are">
        <p>
          The Service is provided by <strong>{LEGAL_NAME}</strong>
          (&ldquo;we&rdquo;, &ldquo;us&rdquo;). Contact us at <MailLink />.
        </p>
        <BusinessDetails />
      </Section>

      <Section id="accept" title="2. Agreeing to these terms">
        <p>
          You agree to these terms when you create an account. If you use the
          Service for an organisation, you confirm you are allowed to accept
          these terms on its behalf. You must be at least 16 years old.
        </p>
      </Section>

      <Section id="account" title="3. Your account">
        <p>
          Give accurate details, keep your password private and tell us
          straight away if you think someone else has used your account. You
          are responsible for what is published on your card.
        </p>
      </Section>

      <Section id="content" title="4. Your content">
        <p>
          You keep ownership of everything you add (text, photos, logos). You
          give us permission to store, display, print and share it only as
          needed to run the Service &mdash; for example, showing your public
          card and printing your physical card. This permission ends when you
          delete the content or your account, except for cards already printed.
        </p>
        <p>
          You must have the right to use everything you upload, including
          photos of other people and company logos. Don&rsquo;t publish
          anything that is unlawful, misleading, defamatory, infringes
          someone&rsquo;s rights, or impersonates another person or
          organisation. Don&rsquo;t misuse the Service (for example by
          spreading malware, scraping it, or trying to break its security). We
          may remove content or suspend accounts that break these rules. To
          report content on a card, email <MailLink subject="Report content" />.
        </p>
      </Section>

      <Section id="free-pro" title="5. Free plan and Pro">
        <p>
          The Basic plan is free. <strong>Pro is a one-time payment</strong>, not
          a subscription: it unlocks the Pro features described on the{" "}
          <Link href="/pricing">pricing page</Link> at the time you buy, for as
          long as your account exists and we operate the Service. If we ever
          close the Service we will give you at least 60 days&rsquo; notice.
          Prices are shown in pounds sterling and include any VAT that applies.
        </p>
        <p>
          Pro starts immediately after payment. Before you pay, we ask you to
          agree to this and to confirm you understand that you lose the
          14-day right to cancel once Pro is active. See the{" "}
          <Link href="/refunds">Refund Policy</Link>.
        </p>
      </Section>

      <Section id="orgs" title="6. Organisation plans">
        <p>
          Organisation plans are a <strong>monthly subscription</strong> charged
          per member (&ldquo;seat&rdquo;). The price and number of seats are
          confirmed before checkout. The subscription renews every month until
          cancelled. An organisation admin can cancel at any time from the
          organisation billing page (or by emailing <MailLink subject="Cancel organisation plan" />),
          and the plan ends at the end of the month already paid for. Organisation
          administrators can create, edit and manage cards for their members.
        </p>
      </Section>

      <Section id="cards" title="7. Physical NFC cards">
        <ul>
          <li>
            The price for each card, and the total, is shown before you pay.
            There is no separate delivery charge unless one is shown at
            checkout.
          </li>
          <li>
            Cards are printed to your design, so please check names, spelling
            and artwork carefully before ordering. We print what you submit.
          </li>
          <li>
            Unless we tell you otherwise, we will deliver within 30 days of your
            order. If we can&rsquo;t, we will tell you and you can cancel for a
            full refund.
          </li>
          <li>
            Each card links to your {APP_NAME} profile. If you delete your
            account, the card will no longer show your details.
          </li>
          <li>
            Because cards are personalised, the 14-day cancellation right does
            not apply &mdash; but your rights for faulty cards do. See the{" "}
            <Link href="/refunds">Refund Policy</Link>.
          </li>
        </ul>
      </Section>

      <Section id="rights" title="8. Your legal rights">
        <p>
          If you are a consumer, nothing in these terms affects your legal
          rights under the Consumer Rights Act 2015 and the Consumer Contracts
          Regulations 2013. For free advice, contact Citizens Advice.
        </p>
      </Section>

      <Section id="availability" title="9. Availability and changes">
        <p>
          We work to keep the Service running, but we can&rsquo;t promise it
          will never be interrupted &mdash; for example during maintenance. We
          may improve or change features; we won&rsquo;t remove a feature you
          have paid for without offering a fair alternative or refund.
        </p>
      </Section>

      <Section id="liability" title="10. Our responsibility to you">
        <p>
          If we break these terms or fail to use reasonable care and skill, we
          are responsible for loss you suffer that was a foreseeable result. We
          are not responsible for loss that was not foreseeable, or for
          business losses (such as lost profit or opportunities) if you use the
          Service for business purposes; for business customers our total
          liability is limited to the amount paid to us in the 12 months before
          the claim.
        </p>
        <p>
          Nothing in these terms limits our liability for death or personal
          injury caused by our negligence, for fraud, or for anything else the
          law does not allow us to limit.
        </p>
      </Section>

      <Section id="ending" title="11. Ending your account">
        <p>
          You can delete your account at any time from{" "}
          <Link href="/dashboard/settings">your settings</Link>. We may suspend
          or close an account that seriously or repeatedly breaks these terms;
          where reasonable, we will warn you first and explain why.
        </p>
      </Section>

      <Section id="changes" title="12. Changes to these terms">
        <p>
          We may update these terms, for example to reflect changes in the law
          or the Service. For significant changes we will email you at least 30
          days before they take effect. Changes don&rsquo;t apply to purchases
          you made before they took effect.
        </p>
      </Section>

      <Section id="law" title="13. Law and complaints">
        <p>
          These terms are governed by the law of England and Wales. If you live
          in Scotland or Northern Ireland you can also bring claims in your local
          courts. If you have a complaint, please email <MailLink subject="Complaint" />{" "}
          first &mdash; we aim to resolve it within 14 days.
        </p>
      </Section>
    </LegalPage>
  );
}
