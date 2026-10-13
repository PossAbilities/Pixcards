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
  title: `Privacy Policy | ${APP_NAME}`,
  description:
    "What personal data Pixcards collects, why, who we share it with, how long we keep it and your rights under UK GDPR.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="13 October 2026">
      <p>
        This policy explains how {APP_NAME} collects and uses personal data when
        you create an account, publish a digital business card, order a
        physical card, or view someone else&rsquo;s card. We only collect what
        we need to run the service, and we never sell personal data.
      </p>

      <Section id="who" title="1. Who we are">
        <p>
          The data controller is <strong>{LEGAL_NAME}</strong>. You can contact
          us about anything in this policy at <MailLink subject="Privacy" />.
        </p>
        <BusinessDetails />
      </Section>

      <Section id="collect" title="2. What we collect and why">
        <p>
          The table below lists each kind of data, why we use it, and the
          lawful basis under UK GDPR.
        </p>
        <div className="mt-4 overflow-x-auto" tabIndex={0} role="region" aria-label="Personal data table">
          <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <caption className="sr-only">
              Personal data we collect, its purpose and lawful basis
            </caption>
            <thead>
              <tr className="border-b border-outline text-ink">
                <th scope="col" className="py-2 pr-4 font-semibold">Data</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Why</th>
                <th scope="col" className="py-2 font-semibold">Lawful basis</th>
              </tr>
            </thead>
            <tbody className="align-top [&_td]:py-2.5 [&_td]:pr-4 [&_tr]:border-b [&_tr]:border-outline/60">
              <tr>
                <td>Account: name, email address, password (stored only as a one-way hash)</td>
                <td>Create and secure your account, sign you in</td>
                <td>Contract</td>
              </tr>
              <tr>
                <td>
                  Card content you choose to add: job title, company, bio,
                  location, phone, email, links, photos and design choices
                </td>
                <td>Show your public card to the people you share it with</td>
                <td>Contract</td>
              </tr>
              <tr>
                <td>
                  Orders: name printed on the card, card artwork, delivery name
                  and address, quantity, price and payment reference
                </td>
                <td>Print, deliver and support your physical card order; keep accounting records</td>
                <td>Contract; legal obligation (tax records)</td>
              </tr>
              <tr>
                <td>Pro upgrade and discount-code use</td>
                <td>Unlock Pro features and apply discounts</td>
                <td>Contract</td>
              </tr>
              <tr>
                <td>
                  Card activity: when your card is viewed or tapped, which links
                  are clicked, contact saves, and the referring web page
                </td>
                <td>Show you statistics about your own card</td>
                <td>Legitimate interests (providing the analytics feature you use)</td>
              </tr>
              <tr>
                <td>Organisation membership: your organisation, department and role</td>
                <td>Let your organisation manage team cards and branding</td>
                <td>Legitimate interests of you and your organisation</td>
              </tr>
              <tr>
                <td>Records of emails we send you (and, where enabled, whether they were delivered, opened or clicked)</td>
                <td>Make sure important account and order emails reach you</td>
                <td>Legitimate interests</td>
              </tr>
              <tr>
                <td>Marketing preference</td>
                <td>Send product news only if you have opted in</td>
                <td>Consent (you can withdraw at any time)</td>
              </tr>
              <tr>
                <td>Support messages and security logs (for example sign-in and account events)</td>
                <td>Answer your questions; keep the service and your account secure</td>
                <td>Legitimate interests</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4">
          We do not use your data for automated decision-making or profiling,
          and we do not use advertising trackers.
        </p>
      </Section>

      <Section id="visitors" title="3. If you view someone's card">
        <p>
          When you open a {APP_NAME} card we record that the card was viewed,
          tapped or a link was clicked, together with the address of the page
          that sent you there (if your browser provides it). We do not store
          your IP address or set any cookies for this, and the card owner only
          sees totals &mdash; not who you are. Contact details you save from a
          card go straight to your own device; we don&rsquo;t receive them.
        </p>
      </Section>

      <Section id="public" title="4. What is public">
        <p>
          Your card is published at a public web address so anyone with the
          link, QR code or NFC card can see it. When you sign up, your card
          shows only your name (plus your work email address if you signed up
          with an organisation address we support, such as a company domain);
          after that, only the details you add are shown. You can unpublish your card or remove details at any
          time from your dashboard. Please only add information about other
          people (such as a colleague&rsquo;s photo) if you have the right to
          share it.
        </p>
      </Section>

      <Section id="sharing" title="5. Who we share data with">
        <p>
          We use the following service providers, who process data on our
          behalf and under contract:
        </p>
        <ul>
          <li>
            <strong>Stripe</strong> &mdash; payment processing. Your card details
            go directly to Stripe; we never see or store them.
          </li>
          <li>
            <strong>Resend</strong> &mdash; sending account, order and (if you
            opt in) marketing emails.
          </li>
          <li>
            <strong>Hosting, database and file-storage providers</strong>{" "}
            &mdash; to run the website and store your account and images.
          </li>
          <li>
            <strong>Our printing and delivery partners</strong> &mdash; the
            artwork, card name and delivery address needed to make and send
            your physical card.
          </li>
          <li>
            <strong>Anthropic</strong> &mdash; only if an organisation admin
            chooses to upload brand guidelines for automatic colour matching.
            The uploaded file is sent for analysis; no member data is included.
          </li>
          <li>
            <strong>Apple and Google</strong> &mdash; only if you choose
            &ldquo;Add to Apple Wallet&rdquo; or &ldquo;Add to Google
            Wallet&rdquo;. The pass contains the card details you publish.
          </li>
        </ul>
        <p>
          If you belong to an organisation on {APP_NAME}, its administrators can
          see and manage your organisation card and see team-level activity
          totals. We may also disclose data where the law requires it, or to
          protect our rights or the safety of others.
        </p>
      </Section>

      <Section id="transfers" title="6. International transfers">
        <p>
          Some providers (including Stripe, Resend and Anthropic) are based in,
          or process data in, the United States. Where data leaves the UK we
          rely on UK adequacy regulations (including the UK&ndash;US
          &ldquo;data bridge&rdquo;) or the UK International Data Transfer
          Addendum to the EU standard contractual clauses.
        </p>
      </Section>

      <Section id="retention" title="7. How long we keep data">
        <ul>
          <li>
            <strong>Account, card and activity data</strong> &mdash; until you
            delete your account. Deleting your account permanently removes your
            profile, links, orders, activity history and email records from
            our systems. (If a card you&rsquo;ve paid for is still being made,
            we ask you to wait until it ships so we can deliver it.)
          </li>
          <li>
            <strong>Payment and accounting records</strong> &mdash; held by
            Stripe and in our accounts for as long as tax law requires
            (normally six years), even after account deletion.
          </li>
          <li>
            <strong>Password-reset links</strong> &mdash; expire automatically
            and are deleted with your account.
          </li>
          <li>
            <strong>Support emails</strong> &mdash; for as long as needed to
            resolve your request, and no longer than two years.
          </li>
        </ul>
      </Section>

      <Section id="rights" title="8. Your rights">
        <p>Under UK GDPR you have the right to:</p>
        <ul>
          <li>access a copy of your data;</li>
          <li>correct inaccurate data;</li>
          <li>have your data deleted;</li>
          <li>receive your data in a portable format;</li>
          <li>object to, or ask us to restrict, processing based on legitimate interests;</li>
          <li>withdraw consent (for example to marketing) at any time.</li>
        </ul>
        <p>
          You can edit or delete your card, download your data, change your
          email preferences and delete your account yourself from{" "}
          <Link href="/dashboard/settings">your account settings</Link>. For
          anything else, email <MailLink subject="Data request" />. We will
          reply within one month.
        </p>
        <p>
          If you are unhappy with how we handle your data, please tell us
          first. You also have the right to complain to the Information
          Commissioner&rsquo;s Office (ICO) at{" "}
          <a href="https://ico.org.uk/make-a-complaint/" rel="noopener noreferrer">
            ico.org.uk
          </a>{" "}
          or 0303 123 1113.
        </p>
      </Section>

      <Section id="cookies" title="9. Cookies">
        <p>
          We use one strictly necessary cookie to keep you signed in, and no
          analytics or advertising cookies. See our{" "}
          <Link href="/cookies">Cookie Policy</Link>.
        </p>
      </Section>

      <Section id="security" title="10. Security">
        <p>
          We use encryption in transit (HTTPS), store passwords only as salted
          hashes, and restrict admin access. No online service is perfectly
          secure; if a breach affects your data in a way that puts you at risk,
          we will tell you and, where required, the ICO.
        </p>
      </Section>

      <Section id="children" title="11. Children">
        <p>
          {APP_NAME} is not intended for anyone under 16, and we do not knowingly
          collect data from children.
        </p>
      </Section>

      <Section id="changes" title="12. Changes to this policy">
        <p>
          If we make significant changes we will update the date at the top and,
          where appropriate, let you know by email.
        </p>
      </Section>
    </LegalPage>
  );
}
