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
import { THEMES, CARD_TEMPLATES, ORG_SEAT_PRICE_CENTS, money, material, PLATFORMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  createOrganisation,
  updateOrgBranding,
  addMemberDirect,
  inviteMember,
  removeMember,
  revokeInvite,
  updateMemberProfile,
  orderTeamCards,
  startOrgSubscription,
  openBillingPortal,
  analyzeBrandGuidelines,
  updateOrgCardOptions,
  updateOrgLinks,
} from "@/lib/actions/org";
import { previewDiscount } from "@/lib/actions/discounts";
import { nfcMarkDataUrl } from "@/lib/nfc-logo";
import { OrgCardDesigner } from "./OrgCardDesigner";

type Member = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  role: "OWNER" | "ADMIN" | "MEMBER";
  jobTitle: string;
  phone: string;
  contactEmail: string;
  bio: string;
  location: string;
  views: number;
};

export type OrgData = {
  id: string;
  name: string;
  company: string;
  theme: string;
  template: string;
  accentColor: string;
  brandHeader: string | null;
  cardUseBrand: boolean;
  cardNfcLogo: boolean;
  cardDesign: string;
  cardMaterial: string;
  sharedLinks: string;
  allowedLinkTypes: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  planStatus: string;
  analytics: { views: number; taps: number; clicks: number };
  members: Member[];
  invites: { id: string; email: string; role: string }[];
} | null;

export function OrgManager({ data }: { data: OrgData }) {
  if (!data) return <CreateOrg />;
  const isAdmin = data.role === "OWNER" || data.role === "ADMIN";
  if (!isAdmin) return <MemberView data={data} />;
  return <AdminView data={data} />;
}

/* ------------------------------- Create ---------------------------------- */

function CreateOrg() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function create() {
    setError(null);
    startTransition(async () => {
      const res = await createOrganisation(name);
      if (!res.ok) setError(res.error ?? "Could not create organisation.");
    });
  }

  return (
    <Card className="p-6">
      <SectionHeading icon="corporate_fare" title="Create an organisation" />
      <p className="-mt-1 mb-3 text-sm text-muted">
        Manage business cards for your whole team under one brand — shared
        design, central member management and team ordering.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Label htmlFor="org-name">Organisation name</Label>
          <input
            id="org-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Perspective Studios"
            className={inputClass}
          />
        </div>
        <button
          type="button"
          onClick={create}
          disabled={isPending || !name.trim()}
          className={buttonClass("primary", "md")}
        >
          <Icon name="add_business" className="text-[18px]" />
          Create
        </button>
      </div>
      {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
    </Card>
  );
}

/* ----------------------------- Member view ------------------------------- */

function MemberView({ data }: { data: NonNullable<OrgData> }) {
  return (
    <Card className="p-6">
      <SectionHeading icon="groups" title={data.name} />
      <p className="text-sm text-muted">
        You&apos;re a member of <strong>{data.name}</strong>. Your card uses the
        organisation&apos;s brand — edit your details on your Profile page
        (colours &amp; layout are managed by your organisation).
      </p>
    </Card>
  );
}

/* ------------------------------ Admin view ------------------------------- */

function AdminView({ data }: { data: NonNullable<OrgData> }) {
  return (
    <div className="space-y-6">
      <BillingCard planStatus={data.planStatus} memberCount={data.members.length} />
      <AnalyticsCard a={data.analytics} memberCount={data.members.length} />
      <BrandForm data={data} />
      <ProfileLinksCard data={data} />
      <PrintedCardCard data={data} />
      <OrgCardDesigner data={data} />
      <MembersCard data={data} />
      <TeamOrderCard data={data} />
    </div>
  );
}

function BillingCard({
  planStatus,
  memberCount,
}: {
  planStatus: string;
  memberCount: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const active = planStatus === "active";
  const estimate = money(memberCount * ORG_SEAT_PRICE_CENTS);

  function subscribe() {
    setError(null);
    startTransition(async () => {
      const res = await startOrgSubscription();
      if (res.ok && res.url) window.location.href = res.url;
      else if (res.ok) window.location.reload();
      else setError(res.error ?? "Could not start subscription.");
    });
  }
  function manage() {
    setError(null);
    startTransition(async () => {
      const res = await openBillingPortal();
      if (res.ok && res.url) window.location.href = res.url;
      else setError(res.error ?? "Billing management isn't available.");
    });
  }

  return (
    <Card className={cn("p-6", !active && "border-primary/30 bg-primary-soft/20")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-soft text-primary-deep">
            <Icon name="workspace_premium" fill className="text-[22px]" />
          </span>
          <div>
            <p className="font-display text-sm font-bold text-ink">
              {active ? "Team plan active" : "Team plan"}
              {planStatus === "past_due" && " — payment overdue"}
            </p>
            <p className="text-sm text-muted">
              {memberCount} member{memberCount === 1 ? "" : "s"} ·{" "}
              {money(ORG_SEAT_PRICE_CENTS)}/member/month (≈ {estimate}/mo)
            </p>
          </div>
        </div>
        {active ? (
          <button type="button" onClick={manage} disabled={isPending} className={buttonClass("outline", "md")}>
            <Icon name="credit_card" className="text-[18px]" /> Manage billing
          </button>
        ) : (
          <button type="button" onClick={subscribe} disabled={isPending} className={buttonClass("primary", "md")}>
            <Icon name="bolt" fill className="text-[18px]" /> Subscribe
          </button>
        )}
      </div>
      {!active && (
        <p className="mt-3 text-xs text-muted">
          Everything keeps working while you decide — subscribe whenever you&apos;re ready.
        </p>
      )}
      {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
    </Card>
  );
}

function AnalyticsCard({
  a,
  memberCount,
}: {
  a: { views: number; taps: number; clicks: number };
  memberCount: number;
}) {
  const tiles = [
    { label: "Members", value: memberCount },
    { label: "Views (30d)", value: a.views },
    { label: "Taps (30d)", value: a.taps },
    { label: "Link clicks (30d)", value: a.clicks },
  ];
  return (
    <Card className="p-6">
      <SectionHeading icon="insights" title="Team activity" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-outline bg-surface-low p-4">
            <p className="font-display text-2xl font-bold text-ink tabular-nums">{t.value}</p>
            <p className="text-xs font-semibold text-muted">{t.label}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function BrandForm({ data }: { data: NonNullable<OrgData> }) {
  const [name, setName] = useState(data.name);
  const [company, setCompany] = useState(data.company);
  const [theme, setTheme] = useState(data.theme);
  const [template, setTemplate] = useState(data.template);
  const [accent, setAccent] = useState(data.accentColor);
  // Custom brand gradient from the AI (overrides the preset theme header).
  const [brandHeader, setBrandHeader] = useState<string | null>(data.brandHeader);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [analyzing, setAnalyzing] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // What the card header will actually look like: custom brand gradient if set,
  // otherwise the selected preset theme's gradient.
  const presetHeader =
    THEMES.find((t) => t.id === theme)?.header ?? THEMES[0].header;
  const previewHeader = brandHeader || presetHeader;

  // Picking a preset theme clears any custom brand gradient so the preset wins.
  function pickTheme(t: (typeof THEMES)[number]) {
    setTheme(t.id);
    setAccent(t.accent);
    setBrandHeader(null);
    setSaved(false);
  }

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateOrgBranding({
        name,
        company,
        theme,
        template,
        accentColor: accent,
        brandHeader: brandHeader ?? "",
      });
      if (res.ok) setSaved(true);
      else setError(res.error ?? "Could not save.");
    });
  }

  function onGuidelines(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-uploading the same file
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) {
      setAiError("That file is too large — keep it under 6 MB.");
      return;
    }
    setAiError(null);
    setAiNote(null);
    setSaved(false);
    setAnalyzing(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      startTransition(async () => {
        const res = await analyzeBrandGuidelines({ dataUrl });
        setAnalyzing(false);
        if (res.ok && res.suggestion) {
          const s = res.suggestion;
          setTheme(s.themeId);
          setTemplate(s.template);
          setAccent(s.accent || s.primary);
          setBrandHeader(s.headerGradient || null);
          setAiNote(
            s.summary
              ? `${s.summary} — review the colours and layout below, then Save brand.`
              : "Brand applied — review the colours and layout below, then Save brand.",
          );
        } else {
          setAiError(res.error ?? "Couldn't analyse that file.");
        }
      });
    };
    reader.onerror = () => {
      setAnalyzing(false);
      setAiError("Couldn't read that file.");
    };
    reader.readAsDataURL(file);
  }

  return (
    <Card className="p-6">
      <SectionHeading icon="palette" title="Brand template" />
      <p className="-mt-1 mb-4 text-sm text-muted">
        Applied to every member&apos;s card. Members can edit their own details
        but not the colours or layout.
      </p>

      <div className="mb-5 rounded-xl border border-dashed border-outline bg-surface-2/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <Icon name="auto_awesome" className="text-[18px] text-primary" />
              Analyse brand guidelines with AI
            </p>
            <p className="mt-0.5 text-xs text-muted">
              Upload a PNG, JPEG, PDF or HTML file and we&apos;ll match the
              colours, theme and layout for you.
            </p>
          </div>
          <label className={cn(buttonClass("secondary", "md"), analyzing && "pointer-events-none opacity-60")}>
            <Icon name="upload_file" className="text-[18px]" />
            {analyzing ? "Analysing…" : "Upload guidelines"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf,text/html,.html,.htm"
              onChange={onGuidelines}
              disabled={analyzing}
              className="hidden"
            />
          </label>
        </div>
        {aiNote && (
          <p className="mt-3 flex items-start gap-1.5 text-sm font-medium text-emerald-600">
            <Icon name="auto_awesome" className="mt-0.5 text-[16px]" />
            {aiNote}
          </p>
        )}
        {aiError && <p className="mt-3 text-sm font-medium text-red-600">{aiError}</p>}
      </div>

      {/* Live preview — instantly reflects the chosen / AI-detected brand. */}
      <div className="mb-5">
        <div className="flex items-center justify-between">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">Preview</p>
          {brandHeader && (
            <button
              type="button"
              onClick={() => { setBrandHeader(null); setSaved(false); }}
              className="text-xs font-semibold text-muted hover:text-primary"
            >
              Reset to preset theme
            </button>
          )}
        </div>
        <div className="overflow-hidden rounded-2xl border border-outline">
          <div className="h-20 w-full" style={{ background: previewHeader }} />
          <div className="flex items-center gap-3 bg-surface px-4 py-3">
            <span
              className="grid h-10 w-10 place-items-center rounded-full text-sm font-bold text-white"
              style={{ background: accent }}
            >
              {(company || name || "B").trim().charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{company || name || "Your company"}</p>
              <p className="truncate text-xs" style={{ color: accent }}>
                {brandHeader ? "Custom brand colours" : "Preset theme"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="o-name">Organisation name</Label>
          <input id="o-name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <Label htmlFor="o-company">Company shown on cards</Label>
          <input id="o-company" value={company} onChange={(e) => setCompany(e.target.value)} className={inputClass} />
        </div>
      </div>

      <p className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-faint">Theme</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {brandHeader && (
          <button
            type="button"
            onClick={() => setSaved(false)}
            className="rounded-xl border-2 border-primary p-2 text-left text-xs font-semibold transition"
          >
            <span className="block h-6 rounded" style={{ background: brandHeader }} />
            <span className="mt-1 flex items-center gap-1 text-ink">
              <Icon name="auto_awesome" className="text-[14px] text-primary" /> Your brand
            </span>
          </button>
        )}
        {THEMES.map((t) => (
          <button key={t.id} type="button" onClick={() => pickTheme(t)}
            className={cn("rounded-xl border-2 p-2 text-left text-xs font-semibold transition", theme === t.id && !brandHeader ? "border-primary" : "border-outline hover:border-primary/40")}>
            <span className="block h-6 rounded" style={{ background: t.header }} />
            <span className="mt-1 block text-ink">{t.name}</span>
          </button>
        ))}
      </div>

      <p className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-faint">Layout</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {CARD_TEMPLATES.map((tpl) => (
          <button key={tpl.id} type="button" onClick={() => setTemplate(tpl.id)}
            className={cn("rounded-xl border-2 p-2 text-xs font-semibold transition", template === tpl.id ? "border-primary bg-primary-soft/40" : "border-outline hover:border-primary/40")}>
            {tpl.name}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Label htmlFor="o-accent">Accent colour</Label>
        <input id="o-accent" type="color" value={accent} onChange={(e) => setAccent(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-outline bg-transparent p-0" />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={isPending} className={buttonClass("primary", "md")}>
          <Icon name="save" className="text-[18px]" /> Save brand
        </button>
        {saved && !isPending && (
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
            <Icon name="check_circle" className="text-[16px]" /> Saved &amp; applied to all members
          </span>
        )}
        {error && <span className="text-sm font-medium text-red-600">{error}</span>}
      </div>
    </Card>
  );
}

type SharedLinkRow = { platform: string; label: string; url: string };

function ProfileLinksCard({ data }: { data: NonNullable<OrgData> }) {
  const initialShared: SharedLinkRow[] = (() => {
    try {
      const v = JSON.parse(data.sharedLinks || "[]");
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  })();
  const initialAllowed: string[] = (() => {
    try {
      const v = JSON.parse(data.allowedLinkTypes || "[]");
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  })();

  const [shared, setShared] = useState<SharedLinkRow[]>(initialShared);
  const [allowed, setAllowed] = useState<string[]>(initialAllowed);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function addRow() {
    setShared((s) => [...s, { platform: "website", label: "", url: "" }]);
    setSaved(false);
  }
  function setRow(i: number, patch: Partial<SharedLinkRow>) {
    setShared((s) => s.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    setSaved(false);
  }
  function removeRow(i: number) {
    setShared((s) => s.filter((_, idx) => idx !== i));
    setSaved(false);
  }
  function toggleAllowed(id: string) {
    setAllowed((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
    setSaved(false);
  }

  function save() {
    setError(null);
    setSaved(false);
    const cleaned = shared
      .map((r) => ({ ...r, url: r.url.trim(), label: r.label.trim() }))
      .filter((r) => r.url);
    startTransition(async () => {
      const res = await updateOrgLinks({ sharedLinks: cleaned, allowedLinkTypes: allowed });
      if (res.ok) setSaved(true);
      else setError(res.error ?? "Could not save.");
    });
  }

  return (
    <Card className="p-6">
      <SectionHeading icon="link" title="Profile buttons & links" />
      <p className="-mt-1 mb-4 text-sm text-muted">
        Shared links appear on <strong>every</strong> member&apos;s profile and
        can&apos;t be removed by them. Allowed types are the extra links members
        may add themselves.
      </p>

      {/* Shared (locked) links */}
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">
        Shared links (on every card)
      </p>
      <div className="space-y-2">
        {shared.length === 0 && (
          <p className="text-sm text-muted">No shared links yet.</p>
        )}
        {shared.map((row, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <select
              value={row.platform}
              onChange={(e) => setRow(i, { platform: e.target.value })}
              className={cn(inputClass, "w-36")}
            >
              {PLATFORMS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
            <input
              value={row.label}
              onChange={(e) => setRow(i, { label: e.target.value })}
              placeholder="Label (optional)"
              className={cn(inputClass, "w-40")}
            />
            <input
              value={row.url}
              onChange={(e) => setRow(i, { url: e.target.value })}
              placeholder="https://…"
              className={cn(inputClass, "min-w-0 flex-1")}
            />
            <button type="button" onClick={() => removeRow(i)} className="rounded p-1.5 text-red-600 hover:bg-red-50" title="Remove">
              <Icon name="delete" className="text-[18px]" />
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={addRow} className={buttonClass("outline", "sm", "mt-2")}>
        <Icon name="add" className="text-[16px]" /> Add shared link
      </button>

      {/* Allowed member-added types */}
      <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-faint">
        Links members may add themselves
      </p>
      <p className="mb-2 text-xs text-muted">
        Tick the types members can add. Leave all unticked to allow everything.
      </p>
      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => toggleAllowed(p.id)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition",
              allowed.includes(p.id)
                ? "border-primary bg-primary-soft/40 text-primary-deep"
                : "border-outline text-muted hover:border-primary/40",
            )}
          >
            <Icon name={p.icon} className="text-[14px]" />
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={isPending} className={buttonClass("primary", "md")}>
          <Icon name="save" className="text-[18px]" /> Save links
        </button>
        {saved && !isPending && (
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
            <Icon name="check_circle" className="text-[16px]" /> Saved &amp; applied to all members
          </span>
        )}
        {error && <span className="text-sm font-medium text-red-600">{error}</span>}
      </div>
    </Card>
  );
}

function PrintedCardCard({ data }: { data: NonNullable<OrgData> }) {
  const [useBrand, setUseBrand] = useState(data.cardUseBrand);
  const [nfcLogo, setNfcLogo] = useState(data.cardNfcLogo);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // The baked card uses the brand gradient when enabled, else a solid accent.
  const cardBg = useBrand && data.brandHeader ? data.brandHeader : data.accentColor;
  const nfcSrc = nfcMarkDataUrl({ color: "#ffffff", label: true });

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateOrgCardOptions({ cardUseBrand: useBrand, cardNfcLogo: nfcLogo });
      if (res.ok) setSaved(true);
      else setError(res.error ?? "Could not save.");
    });
  }

  return (
    <Card className="p-6">
      <SectionHeading icon="badge" title="Printed card design" />
      <p className="-mt-1 mb-4 text-sm text-muted">
        Controls the artwork baked into every team member&apos;s physical NFC
        card (and the CardPresso export).
      </p>

      <div className="grid items-start gap-6 sm:grid-cols-[auto,1fr]">
        {/* Live mini card preview */}
        <div
          className="relative h-[150px] w-[238px] shrink-0 overflow-hidden rounded-xl text-white shadow-md ring-1 ring-black/10"
          style={{ background: cardBg }}
        >
          <div className="absolute bottom-3 left-3">
            <p className="text-base font-bold leading-tight">Alex Member</p>
            <p className="text-[11px] opacity-90">Account Manager</p>
            <p className="text-[11px] opacity-90">{data.company || data.name}</p>
          </div>
          <span className="absolute right-3 top-3 grid h-12 w-12 place-items-center rounded bg-white/90 text-[9px] font-semibold text-ink">
            QR
          </span>
          {nfcLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={nfcSrc} alt="NFC" className="absolute bottom-3 right-3 h-10 w-auto" />
          )}
        </div>

        <div className="space-y-3">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={useBrand}
              onChange={(e) => { setUseBrand(e.target.checked); setSaved(false); }}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-semibold text-ink">
                Use our brand colours
              </span>
              <span className="block text-xs text-muted">
                Bakes the brand gradient (from your guidelines) onto the card
                instead of a flat colour.
                {!data.brandHeader && " Upload brand guidelines above to set this."}
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={nfcLogo}
              onChange={(e) => { setNfcLogo(e.target.checked); setSaved(false); }}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-semibold text-ink">
                Show the NFC logo
              </span>
              <span className="block text-xs text-muted">
                Adds the universal NFC &ldquo;tap&rdquo; mark so people know the
                card is contactless.
              </span>
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button type="button" onClick={save} disabled={isPending} className={buttonClass("primary", "md")}>
              <Icon name="save" className="text-[18px]" /> Save card design
            </button>
            {saved && !isPending && (
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
                <Icon name="check_circle" className="text-[16px]" /> Saved
              </span>
            )}
            {error && <span className="text-sm font-medium text-red-600">{error}</span>}
          </div>
        </div>
      </div>
    </Card>
  );
}

function MemberRow({ m }: { m: Member }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(m.name);
  const [jobTitle, setJobTitle] = useState(m.jobTitle);
  const [phone, setPhone] = useState(m.phone);
  const [email, setEmail] = useState(m.contactEmail);
  const [bio, setBio] = useState(m.bio);
  const [location, setLocation] = useState(m.location);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setMsg(null);
    setErr(null);
    startTransition(async () => {
      const res = await updateMemberProfile(m.id, { name, jobTitle, phone, email, bio, location });
      if (res.ok) setMsg("Saved.");
      else setErr(res.error ?? "Could not save.");
    });
  }

  function remove() {
    if (!confirm(`Remove ${m.name} from the organisation?`)) return;
    startTransition(async () => {
      await removeMember(m.id);
    });
  }

  return (
    <li className="py-3">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => setOpen((v) => !v)} className="min-w-0 text-left">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            {m.name}
            {m.role !== "MEMBER" && <Badge color="primary">{m.role}</Badge>}
            <Icon name={open ? "expand_less" : "expand_more"} className="text-[16px] text-faint" />
          </p>
          <p className="truncate text-xs text-muted">
            {m.email} · {m.views} views (30d)
          </p>
        </button>
        {m.role !== "OWNER" && (
          <button type="button" disabled={isPending} onClick={remove}
            className={buttonClass("ghost", "sm", "text-red-600 hover:bg-red-50")}>
            Remove
          </button>
        )}
      </div>

      {open && (
        <div className="mt-3 grid gap-2 rounded-xl border border-outline bg-surface-low p-3 sm:grid-cols-2">
          <div>
            <Label>Name</Label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <Label>Job title</Label>
            <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className={inputClass} />
          </div>
          <div>
            <Label>Phone</Label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
          </div>
          <div>
            <Label>Contact email</Label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </div>
          <div>
            <Label>Location</Label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <Label>Bio</Label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2} className={`${inputClass} resize-none`} />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <button type="button" onClick={save} disabled={isPending} className={buttonClass("primary", "sm")}>
              <Icon name="save" className="text-[16px]" /> Save details
            </button>
            {m.username && (
              <a href={`/u/${m.username}`} target="_blank" rel="noopener noreferrer"
                className="text-xs font-semibold text-primary hover:underline">
                View card ↗
              </a>
            )}
            {msg && <span className="text-sm font-semibold text-emerald-600">{msg}</span>}
            {err && <span className="text-sm font-medium text-red-600">{err}</span>}
          </div>
        </div>
      )}
    </li>
  );
}

function MembersCard({ data }: { data: NonNullable<OrgData> }) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mName, setMName] = useState("");
  const [mEmail, setMEmail] = useState("");
  const [mJob, setMJob] = useState("");
  const [invEmail, setInvEmail] = useState("");

  function act(fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) {
    setMsg(null);
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) setMsg(ok);
      else setError(res.error ?? "Something went wrong.");
    });
  }

  return (
    <Card className="p-6">
      <SectionHeading icon="groups" title={`Members (${data.members.length})`} />
      <ul className="divide-y divide-black/5">
        {data.members.map((m) => (
          <MemberRow key={m.id} m={m} />
        ))}
      </ul>

      {data.invites.length > 0 && (
        <div className="mt-4 rounded-xl border border-outline p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">Pending invites</p>
          <ul className="space-y-1.5">
            {data.invites.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted">{i.email}</span>
                <button type="button" disabled={isPending} onClick={() => act(() => revokeInvite(i.id), "Invite revoked.")}
                  className="text-xs font-semibold text-red-500 hover:underline">Revoke</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 border-t border-black/5 pt-5">
        <p className="mb-2 text-sm font-semibold text-ink">Add a member</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <input value={mName} onChange={(e) => setMName(e.target.value)} placeholder="Full name" className={inputClass} />
          <input value={mEmail} onChange={(e) => setMEmail(e.target.value)} placeholder="Email" className={inputClass} />
          <input value={mJob} onChange={(e) => setMJob(e.target.value)} placeholder="Job title (optional)" className={inputClass} />
        </div>
        <button type="button" disabled={isPending || !mName.trim() || !mEmail.trim()}
          onClick={() => act(async () => {
            const res = await addMemberDirect({ name: mName, email: mEmail, jobTitle: mJob });
            if (res.ok) { setMName(""); setMEmail(""); setMJob(""); }
            return res;
          }, "Member added. They can set a password via 'forgot password'.")}
          className={buttonClass("secondary", "sm", "mt-2")}>
          <Icon name="person_add" className="text-[16px]" /> Create member
        </button>
      </div>

      <div className="mt-5 border-t border-black/5 pt-5">
        <p className="mb-2 text-sm font-semibold text-ink">Invite by email</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input value={invEmail} onChange={(e) => setInvEmail(e.target.value)} placeholder="colleague@company.com" className={inputClass} />
          <button type="button" disabled={isPending || !invEmail.trim()}
            onClick={() => act(async () => {
              const res = await inviteMember(invEmail);
              if (res.ok) setInvEmail("");
              return res;
            }, "Invite sent.")}
            className={buttonClass("outline", "md")}>
            <Icon name="mail" className="text-[16px]" /> Send invite
          </button>
        </div>
      </div>

      {msg && <p className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-emerald-600"><Icon name="check_circle" className="text-[16px]" />{msg}</p>}
      {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
    </Card>
  );
}

function TeamOrderCard({ data }: { data: NonNullable<OrgData> }) {
  const members = data.members;
  const [selected, setSelected] = useState<Set<string>>(new Set(members.map((m) => m.id)));
  const [shipName, setShipName] = useState("");
  const [shipAddress, setShipAddress] = useState("");
  const [shipCity, setShipCity] = useState("");
  const [shipPostal, setShipPostal] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState<{ off: number; final: number } | null>(null);
  const [codeMsg, setCodeMsg] = useState<string | null>(null);
  const [codeChecking, setCodeChecking] = useState(false);

  // Same auto-design that gets baked onto each card, so they can confirm it.
  const cardBg = data.cardUseBrand && data.brandHeader ? data.brandHeader : data.accentColor;
  const nfcSrc = nfcMarkDataUrl({ color: "#ffffff", label: true });
  const sampleMember = members.find((m) => selected.has(m.id));
  const sampleName = sampleMember?.name ?? "Member name";
  const sampleTitle = sampleMember?.jobTitle ?? "";
  // Selected members with no job title — their card prints without a role.
  const missingTitle = members
    .filter((m) => selected.has(m.id) && !m.jobTitle.trim())
    .map((m) => m.name);
  const unitPrice = material(data.cardMaterial).priceCents;
  const total = unitPrice * selected.size;
  const payable = discount ? discount.final : total;

  function applyCode() {
    setCodeMsg(null);
    if (!code.trim()) {
      setDiscount(null);
      return;
    }
    setCodeChecking(true);
    startTransition(async () => {
      const res = await previewDiscount(code, "CARD", total);
      setCodeChecking(false);
      if (res.ok) {
        setDiscount({ off: res.amountOffCents ?? 0, final: res.finalCents ?? total });
        setCodeMsg(`Code applied — you save ${money(res.amountOffCents ?? 0)}.`);
      } else {
        setDiscount(null);
        setCodeMsg(res.reason ?? "That code isn't valid.");
      }
    });
  }

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
    // Total changed — a previewed discount is no longer accurate.
    setDiscount(null);
    setCodeMsg(null);
  }

  function place() {
    setMsg(null);
    setError(null);
    startTransition(async () => {
      const res = await orderTeamCards({
        memberIds: [...selected],
        shipName,
        shipAddress,
        shipCity,
        shipPostal,
        shipCountry: "United Kingdom",
        discountCode: discount ? code.trim() : undefined,
      });
      if (res.ok && res.url) window.location.href = res.url;
      else if (res.ok) setMsg("Team order placed — cards are pre-linked to each member and ready to fulfil.");
      else setError(res.error ?? "Could not place the order.");
    });
  }

  return (
    <Card className="p-6">
      <SectionHeading icon="local_shipping" title="Order NFC cards for the team" />
      <p className="-mt-1 mb-3 text-sm text-muted">
        Generates a physical NFC card for each selected member, pre-linked to
        their profile, shipped to one address.
      </p>

      {/* Card design preview — what every member's card will look like */}
      <div className="mb-4 rounded-xl border border-outline bg-surface-2/40 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-faint">
          Card design
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <div
            className="relative h-[150px] w-[238px] shrink-0 overflow-hidden rounded-xl text-white shadow-md ring-1 ring-black/10"
            style={{ background: cardBg }}
          >
            <div className="absolute bottom-3 left-3">
              <p className="text-base font-bold leading-tight">{sampleName}</p>
              {sampleTitle && <p className="text-[11px] opacity-90">{sampleTitle}</p>}
              <p className="text-[11px] opacity-90">{data.company || data.name}</p>
            </div>
            <span className="absolute right-3 top-3 grid h-12 w-12 place-items-center rounded bg-white/90 text-[9px] font-semibold text-ink">
              QR
            </span>
            {data.cardNfcLogo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={nfcSrc} alt="NFC" className="absolute bottom-3 right-3 h-10 w-auto" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted">
              Each card is auto-designed with the member&apos;s name, role and QR
              code on your{" "}
              {data.cardUseBrand && data.brandHeader ? "brand colours" : "accent colour"}
              {data.cardNfcLogo ? " with the NFC logo" : ""}. Change this in{" "}
              <strong>Printed card design</strong> above.
            </p>
            {missingTitle.length > 0 && (
              <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                <Icon name="warning" className="mt-0.5 text-[14px]" />
                Add a job title for {missingTitle.join(", ")} under{" "}
                <strong>Members</strong> above before ordering — every card needs
                a role.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mb-3 max-h-44 overflow-y-auto rounded-xl border border-outline p-2">
        {members.map((m) => (
          <label key={m.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-low">
            <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} />
            <span className="text-ink">{m.name}</span>
            <span className="text-xs text-faint">{m.email}</span>
          </label>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <input value={shipName} onChange={(e) => setShipName(e.target.value)} placeholder="Delivery name" className={inputClass} />
        <input value={shipAddress} onChange={(e) => setShipAddress(e.target.value)} placeholder="Address" className={inputClass} />
        <input value={shipCity} onChange={(e) => setShipCity(e.target.value)} placeholder="City" className={inputClass} />
        <input value={shipPostal} onChange={(e) => setShipPostal(e.target.value)} placeholder="Postcode" className={inputClass} />
      </div>
      {/* Discount code */}
      <div className="mt-3">
        <Label htmlFor="team-discount">Discount code</Label>
        <div className="mt-1 flex gap-2">
          <input
            id="team-discount"
            value={code}
            onChange={(e) => { setCode(e.target.value); setDiscount(null); setCodeMsg(null); }}
            placeholder="Enter a code (optional)"
            className={cn(inputClass, "flex-1")}
          />
          <button type="button" onClick={applyCode} disabled={codeChecking || !code.trim()}
            className={buttonClass("outline", "md")}>
            {codeChecking ? "Checking…" : "Apply"}
          </button>
        </div>
        {codeMsg && (
          <p className={cn("mt-1.5 text-sm font-medium", discount ? "text-emerald-600" : "text-red-600")}>
            {codeMsg}
          </p>
        )}
      </div>

      <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5"
        />
        <span>I&apos;ve reviewed the card design above and want to order it.</span>
      </label>
      <p className="mt-3 text-sm text-muted">
        {selected.size} {selected.size === 1 ? "card" : "cards"} × {money(unitPrice)} ={" "}
        {discount ? (
          <>
            <span className="line-through">{money(total)}</span>{" "}
            <strong className="text-ink">{money(payable)}</strong>
          </>
        ) : (
          <strong className="text-ink">{money(total)}</strong>
        )}
        . You&apos;ll be taken to secure checkout to pay.
      </p>
      <button type="button" onClick={place} disabled={isPending || selected.size === 0 || !confirmed || missingTitle.length > 0}
        className={buttonClass("primary", "md", "mt-2")}>
        <Icon name="shopping_cart_checkout" className="text-[18px]" />
        {isPending ? "Starting checkout…" : `Continue to payment · ${money(payable)}`}
      </button>
      {msg && <p className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-emerald-600"><Icon name="check_circle" className="text-[16px]" />{msg}</p>}
      {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
    </Card>
  );
}
