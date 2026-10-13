import type { Metadata } from "next";
import { LegalPage, Section, MailLink } from "@/components/marketing/LegalPage";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Accessibility | ${APP_NAME}`,
  description: "How we make Pixcards accessible, known issues and how to get help.",
};

export default function AccessibilityPage() {
  return (
    <LegalPage title="Accessibility" updated="13 October 2026">
      <p>
        We want everyone to be able to use {APP_NAME}, including people who use
        a keyboard, screen reader, magnification or other assistive technology.
        We are working towards the Web Content Accessibility Guidelines (WCAG)
        2.2 at level AA.
      </p>

      <Section id="done" title="What we do">
        <ul>
          <li>Every page can be used with a keyboard, with a visible focus outline and a &ldquo;Skip to main content&rdquo; link.</li>
          <li>Form fields have labels, and errors are announced to screen readers.</li>
          <li>Text colours are chosen to meet WCAG contrast ratios.</li>
          <li>Animations are switched off if your device is set to reduce motion.</li>
          <li>Pages work when zoomed to 200% and on small screens.</li>
        </ul>
      </Section>

      <Section id="known" title="Known issues">
        <ul>
          <li>
            The drag-and-drop card designer (used to lay out a physical card)
            needs a mouse or touch screen to move and resize elements. If you
            can&rsquo;t use it, email us your text and logo and we will lay out
            the card for you.
          </li>
          <li>
            Colours on a person&rsquo;s card are chosen by its owner, so some
            custom card designs may have lower contrast.
          </li>
        </ul>
      </Section>

      <Section id="help" title="Need help or found a problem?">
        <p>
          Email <MailLink subject="Accessibility" /> and tell us what
          you were trying to do. We&rsquo;ll help you complete it another way
          and fix the problem where we can.
        </p>
      </Section>
    </LegalPage>
  );
}
