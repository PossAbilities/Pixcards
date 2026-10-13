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
          <li>Text on our pages meets WCAG contrast ratios, and we automatically adjust colours that card owners choose so text stays readable.</li>
          <li>Animations are switched off if your device is set to reduce motion.</li>
          <li>Pages work when zoomed to 200% and on small screens.</li>
        </ul>
      </Section>

      <Section id="designer" title="Using the card designer with a keyboard">
        <ul>
          <li><strong>Tab</strong> to an element on the card to select it.</li>
          <li><strong>Arrow keys</strong> move it by 1 pixel; hold <strong>Shift</strong> to move 10 pixels.</li>
          <li><strong>Alt</strong> (Option on a Mac) + <strong>arrow keys</strong> resize it: right and down make it bigger, left and up make it smaller.</li>
          <li>The panel next to the card sets text, colours, alignment and exact position.</li>
        </ul>
      </Section>

      <Section id="known" title="Known issues">
        <ul>
          <li>
            Placing elements precisely in the card designer is easiest with a
            mouse or touch screen. If the keyboard controls above don&rsquo;t
            work for you, email us your text and logo and we&rsquo;ll help you
            lay out the card.
          </li>
          <li>
            People choose their own card colours and images. We adjust text
            colours automatically to keep them readable, but a busy background
            image could still make a card harder to read.
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
