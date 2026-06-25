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
import { THEMES, CARD_TEMPLATES, ORG_SEAT_PRICE_CENTS, money } from "@/lib/constants";
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
} from "@/lib/actions/org";

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
      <MembersCard data={data} />
      <TeamOrderCard members={data.members} />
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
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateOrgBranding({ name, company, theme, template, accentColor: accent });
      if (res.ok) setSaved(true);
      else setError(res.error ?? "Could not save.");
    });
  }

  return (
    <Card className="p-6">
      <SectionHeading icon="palette" title="Brand template" />
      <p className="-mt-1 mb-4 text-sm text-muted">
        Applied to every member&apos;s card. Members can edit their own details
        but not the colours or layout.
      </p>
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
        {THEMES.map((t) => (
          <button key={t.id} type="button" onClick={() => { setTheme(t.id); setAccent(t.accent); }}
            className={cn("rounded-xl border-2 p-2 text-left text-xs font-semibold transition", theme === t.id ? "border-primary" : "border-outline hover:border-primary/40")}>
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

function TeamOrderCard({ members }: { members: Member[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(members.map((m) => m.id)));
  const [shipName, setShipName] = useState("");
  const [shipAddress, setShipAddress] = useState("");
  const [shipCity, setShipCity] = useState("");
  const [shipPostal, setShipPostal] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
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
      });
      if (res.ok) setMsg("Team order placed — cards are pre-linked to each member and ready to fulfil.");
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
      <button type="button" onClick={place} disabled={isPending || selected.size === 0}
        className={buttonClass("primary", "md", "mt-3")}>
        <Icon name="add_card" className="text-[18px]" />
        Place team order ({selected.size})
      </button>
      {msg && <p className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-emerald-600"><Icon name="check_circle" className="text-[16px]" />{msg}</p>}
      {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
    </Card>
  );
}
