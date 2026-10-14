import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section, MailLink } from "@/components/marketing/LegalPage";

export const metadata: Metadata = {
  alternates: { canonical: "/refunds" },
  title: "Refund Policy",
  description:
    "Cancellations, refunds and faulty cards for Pixcards Pro, organisation plans and physical NFC cards.",
};

export default function RefundsPage() {
  return (
    <LegalPage title="Refund Policy" updated="13 October 2026">
      <p>
        This policy explains when you can cancel and get your money back. It
        sits alongside our <Link href="/terms">Terms of Service</Link> and does
        not reduce your legal rights as a consumer.
      </p>

      <Section id="how" title="How to ask for a refund">
        <p>
          Email <MailLink subject="Refund request" /> with your account email
          and order details (and a photo if a card is faulty). We aim to
          reply within 5 business days. Approved refunds go back to your original
          payment method within 14 days of us agreeing the refund.
        </p>
      </Section>

      <Section id="pro" title="Pro upgrade (digital)">
        <p>
          Normally you can cancel an online purchase within 14 days. For Pro,
          the features are unlocked immediately, so before you pay we ask you
          to agree to Pro starting straight away and to confirm you understand
          that <strong>you lose the 14-day right to cancel once Pro is
          active</strong>.
        </p>
        <p>
          If Pro doesn&rsquo;t work as described and we can&rsquo;t fix it
          within a reasonable time, you are entitled to a refund under the
          Consumer Rights Act 2015.
        </p>
      </Section>

      <Section id="cards" title="Physical NFC cards">
        <p>
          Cards are printed with your name and design, so they are{" "}
          <strong>personalised goods</strong> and the 14-day cancellation right
          does not apply once you have placed your order. If you contact us
          before we start printing we will try to cancel it for a full
          refund, but we can&rsquo;t guarantee this.
        </p>
        <p>
          <strong>Faulty or wrong cards.</strong> If a card arrives damaged, the
          NFC chip or QR code doesn&rsquo;t work, or we printed something
          different from the design you approved:
        </p>
        <ul>
          <li>within 30 days of delivery, you can choose a full refund or a replacement;</li>
          <li>
            after 30 days (up to 6 months, or longer where the law allows), we
            will repair or replace it, and if that fails you can get a refund.
          </li>
        </ul>
        <p>
          We don&rsquo;t charge you to return a faulty card. Mistakes that were
          in the design you approved (for example a misspelt name) are not a
          fault, so they are not covered.
        </p>
        <p>
          <strong>Late or lost delivery.</strong> If your card hasn&rsquo;t
          arrived within 30 days of ordering (or by the date we agreed), tell
          us and you can choose a replacement or a full refund.
        </p>
      </Section>

      <Section id="orgs" title="Organisation plans">
        <p>
          Organisation subscriptions can be cancelled at any time and end at
          the end of the month already paid for. We don&rsquo;t give partial
          refunds for unused days, unless the Service was not provided as
          described.
        </p>
      </Section>

      <Section id="disputes" title="If you're not happy">
        <p>
          Please contact us first at <MailLink subject="Complaint" /> &mdash; we
          want to put things right. You can also get free advice from Citizens
          Advice (citizensadvice.org.uk, 0808 223 1133).
        </p>
      </Section>
    </LegalPage>
  );
}
