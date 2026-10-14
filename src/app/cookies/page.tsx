import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section, MailLink } from "@/components/marketing/LegalPage";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  alternates: { canonical: "/cookies" },
  title: "Cookie Policy",
  description:
    "Pixcards uses one strictly necessary sign-in cookie and no analytics or advertising cookies.",
};

export default function CookiesPage() {
  return (
    <LegalPage title="Cookie Policy" updated="13 October 2026">
      <p>
        Cookies are small files a website stores in your browser. This page
        lists every cookie {APP_NAME} sets.
      </p>

      <Section id="ours" title="Cookies we set">
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Cookies table">
          <table className="w-full min-w-[520px] border-collapse text-left text-sm">
            <caption className="sr-only">Cookies set by {APP_NAME}</caption>
            <thead>
              <tr className="border-b border-outline text-ink">
                <th scope="col" className="py-2 pr-4 font-semibold">Name</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Purpose</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Duration</th>
                <th scope="col" className="py-2 font-semibold">Type</th>
              </tr>
            </thead>
            <tbody className="align-top [&_td]:py-2.5 [&_td]:pr-4">
              <tr className="border-b border-outline/60">
                <td><code>pix_session</code></td>
                <td>Keeps you logged in. Only set when you log in.</td>
                <td>30 days, or until you log out</td>
                <td>Strictly necessary</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4">
          That is the only cookie. Because it is strictly necessary for a
          service you have asked for, the law (the Privacy and Electronic
          Communications Regulations) does not require us to ask for consent,
          which is why there is no cookie banner.
        </p>
      </Section>

      <Section id="analytics" title="Analytics">
        <p>
          We don&rsquo;t use Google Analytics or any other analytics or
          advertising cookies. The view and tap counts that card owners see are
          recorded on our own server without cookies and without storing IP
          addresses &mdash; see our <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </Section>

      <Section id="third" title="Third-party sites">
        <p>
          When you pay, you are taken to Stripe&rsquo;s secure checkout page,
          which sets its own cookies for fraud prevention under{" "}
          <a href="https://stripe.com/cookies-policy/legal" rel="noopener noreferrer">
            Stripe&rsquo;s cookie policy
          </a>
          . Links on people&rsquo;s cards (for example to LinkedIn) take you to
          other websites, which have their own cookie policies.
        </p>
      </Section>

      <Section id="manage" title="Managing cookies">
        <p>
          You can delete or block cookies in your browser settings. If you block
          the <code>pix_session</code> cookie you will not be able to log in,
          but you can still view cards.
        </p>
      </Section>

      <Section id="contact" title="Contact">
        <p>
          Questions? Email <MailLink subject="Cookies" />.
        </p>
      </Section>
    </LegalPage>
  );
}
