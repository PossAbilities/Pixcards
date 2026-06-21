"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import {
  Badge,
  Card,
  SectionHeading,
  buttonClass,
  inputClass,
  Label,
} from "@/components/ui";
import { sendBroadcast } from "@/lib/actions/email";

const TEMPLATES: {
  key: string;
  name: string;
  desc: string;
  kind: "auto" | "marketing";
}[] = [
  {
    key: "welcome",
    name: "Welcome",
    desc: "Sent automatically when someone registers.",
    kind: "auto",
  },
  {
    key: "order-receipt",
    name: "Order confirmation & receipt",
    desc: "Sent when a card order is paid.",
    kind: "auto",
  },
  {
    key: "pro-welcome",
    name: "Pro upgrade welcome",
    desc: "Sent when a user upgrades to Pro.",
    kind: "auto",
  },
  {
    key: "order-shipped",
    name: "Order shipped",
    desc: "Sent when you mark an order as shipped.",
    kind: "auto",
  },
  {
    key: "password-reset",
    name: "Password reset",
    desc: "Sent when a user requests a reset link.",
    kind: "auto",
  },
  {
    key: "marketing",
    name: "Marketing / announcement",
    desc: "Your branded broadcast template.",
    kind: "marketing",
  },
];

function PreviewGallery() {
  const [active, setActive] = useState(TEMPLATES[0].key);
  return (
    <Card className="p-6">
      <SectionHeading icon="visibility" title="Template previews" />
      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <div className="flex flex-col gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              className={`rounded-xl border-2 p-3 text-left transition ${
                active === t.key
                  ? "border-primary bg-primary-soft/40"
                  : "border-outline hover:border-primary/40"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-ink">{t.name}</span>
                <Badge color={t.kind === "auto" ? "info" : "primary"}>
                  {t.kind === "auto" ? "Auto" : "Marketing"}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted">{t.desc}</p>
            </button>
          ))}
        </div>
        <div className="overflow-hidden rounded-xl border border-outline bg-surface-low">
          <div className="flex items-center justify-between border-b border-outline bg-surface px-3 py-2">
            <span className="text-xs font-medium text-muted">Preview</span>
            <a
              href={`/admin/emails/preview/${active}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <Icon name="open_in_new" className="text-[14px]" />
              Open
            </a>
          </div>
          <iframe
            key={active}
            title="Email preview"
            src={`/admin/emails/preview/${active}`}
            className="h-[560px] w-full bg-white"
          />
        </div>
      </div>
    </Card>
  );
}

function Broadcast({ recipientCount }: { recipientCount: number }) {
  const [subject, setSubject] = useState("");
  const [heading, setHeading] = useState("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function send(testOnly: boolean) {
    setMsg(null);
    setError(null);
    if (
      !testOnly &&
      !confirm(`Send this email to all ${recipientCount} users? This can't be undone.`)
    ) {
      return;
    }
    startTransition(async () => {
      const res = await sendBroadcast({
        subject,
        heading,
        bodyHtml: body,
        ctaLabel,
        ctaUrl,
        testOnly,
      });
      if (res.ok) {
        setMsg(
          testOnly
            ? "Test email sent to your inbox."
            : `Sent to ${res.sent} recipient${res.sent === 1 ? "" : "s"}.`,
        );
      } else {
        setError(res.error ?? "Could not send.");
      }
    });
  }

  return (
    <Card className="p-6">
      <SectionHeading
        icon="campaign"
        title="Send a broadcast"
        action={<Badge color="neutral">{recipientCount} users</Badge>}
      />
      <div className="space-y-4">
        <div>
          <Label htmlFor="bc-subject">Subject line</Label>
          <input
            id="bc-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="A little something new at Pixcards"
            className={inputClass}
          />
        </div>
        <div>
          <Label htmlFor="bc-heading">Heading</Label>
          <input
            id="bc-heading"
            value={heading}
            onChange={(e) => setHeading(e.target.value)}
            placeholder="New: premium metal cards ✨"
            className={inputClass}
          />
        </div>
        <div>
          <Label htmlFor="bc-body">Body</Label>
          <textarea
            id="bc-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            placeholder={"Write your message…\n\nLeave a blank line between paragraphs."}
            className={`${inputClass} resize-y`}
          />
          <p className="mt-1 text-xs text-faint">
            Plain text becomes styled paragraphs. The recipient&apos;s first name
            is added automatically.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="bc-cta">Button label (optional)</Label>
            <input
              id="bc-cta"
              value={ctaLabel}
              onChange={(e) => setCtaLabel(e.target.value)}
              placeholder="Shop now"
              className={inputClass}
            />
          </div>
          <div>
            <Label htmlFor="bc-url">Button link (optional)</Label>
            <input
              id="bc-url"
              value={ctaUrl}
              onChange={(e) => setCtaUrl(e.target.value)}
              placeholder="https://pixcards.co.uk/dashboard/order"
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => send(true)}
            disabled={isPending}
            className={buttonClass("outline", "md")}
          >
            <Icon name="outgoing_mail" className="text-[18px]" />
            Send test to me
          </button>
          <button
            type="button"
            onClick={() => send(false)}
            disabled={isPending}
            className={buttonClass("primary", "md")}
          >
            <Icon name="campaign" className="text-[18px]" />
            Send to all users
          </button>
        </div>

        {msg && (
          <p className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
            <Icon name="check_circle" className="text-[16px]" />
            {msg}
          </p>
        )}
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      </div>
    </Card>
  );
}

export function EmailStudio({
  recipientCount,
  emailLive,
}: {
  recipientCount: number;
  emailLive: boolean;
}) {
  return (
    <div className="space-y-6">
      {!emailLive && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Icon name="info" fill className="mt-0.5 text-[18px]" />
          <span>
            Email is in <strong>demo mode</strong> — messages are logged, not
            delivered. Set <code>RESEND_API_KEY</code> and <code>EMAIL_FROM</code>{" "}
            in your environment to send for real.
          </span>
        </div>
      )}
      <PreviewGallery />
      <Broadcast recipientCount={recipientCount} />
    </div>
  );
}
