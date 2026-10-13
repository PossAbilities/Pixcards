import Link from "next/link";

/**
 * Pre-purchase acknowledgement for personalised physical cards. Personalised
 * goods are exempt from the 14-day cancellation right, but the buyer must be
 * told before ordering (CCR 2013 reg. 28(1)(b) and Schedule 2(l)).
 */
export function OrderConsent({
  checked,
  onChange,
}: {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-lg border border-outline bg-surface-low/60 p-3 text-xs leading-relaxed text-muted">
      <input
        type="checkbox"
        name="personalisedAck"
        value="yes"
        required
        {...(onChange
          ? { checked: !!checked, onChange: (e) => onChange(e.target.checked) }
          : {})}
        className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
      />
      <span>
        I&apos;ve checked my design and delivery details. I understand this
        card is made to my design, so it can&apos;t be cancelled or returned
        unless it&apos;s faulty. I agree to the{" "}
        <Link href="/terms" className="font-semibold text-primary-deep underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/refunds" className="font-semibold text-primary-deep underline">
          Refund Policy
        </Link>
        .
      </span>
    </label>
  );
}
