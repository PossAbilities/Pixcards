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
import { THEMES, CARD_TEMPLATES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  createOrganisation,
  updateOrgBranding,
  addMemberDirect,
  inviteMember,
  removeMember,
  revokeInvite,
} from "@/lib/actions/org";

export type OrgData = {
  id: string;
  name: string;
  company: string;
  theme: string;
  template: string;
  accentColor: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  members: {
    id: string;
    name: string;
    email: string;
    username: string | null;
    role: "OWNER" | "ADMIN" | "MEMBER";
  }[];
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
      <BrandForm data={data} />
      <MembersCard data={data} />
    </div>
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
      const res = await updateOrgBranding({
        name,
        company,
        theme,
        template,
        accentColor: accent,
      });
      if (res.ok) setSaved(true);
      else setError(res.error ?? "Could not save.");
    });
  }

  return (
    <Card className="p-6">
      <SectionHeading icon="palette" title="Brand template" />
      <p className="-mt-1 mb-4 text-sm text-muted">
        This brand is applied to every member&apos;s card. Members can edit their
        own details but not the colours or layout.
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
          <button
            key={t.id}
            type="button"
            onClick={() => { setTheme(t.id); setAccent(t.accent); }}
            className={cn(
              "rounded-xl border-2 p-2 text-left text-xs font-semibold transition",
              theme === t.id ? "border-primary" : "border-outline hover:border-primary/40",
            )}
          >
            <span className="block h-6 rounded" style={{ background: t.header }} />
            <span className="mt-1 block text-ink">{t.name}</span>
          </button>
        ))}
      </div>

      <p className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-faint">Layout</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {CARD_TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => setTemplate(tpl.id)}
            className={cn(
              "rounded-xl border-2 p-2 text-xs font-semibold transition",
              template === tpl.id ? "border-primary bg-primary-soft/40" : "border-outline hover:border-primary/40",
            )}
          >
            {tpl.name}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Label htmlFor="o-accent" >Accent colour</Label>
        <input
          id="o-accent"
          type="color"
          value={accent}
          onChange={(e) => setAccent(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-outline bg-transparent p-0"
        />
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button type="button" onClick={save} disabled={isPending} className={buttonClass("primary", "md")}>
          <Icon name="save" className="text-[18px]" />
          Save brand
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

function MembersCard({ data }: { data: NonNullable<OrgData> }) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Add member
  const [mName, setMName] = useState("");
  const [mEmail, setMEmail] = useState("");
  const [mJob, setMJob] = useState("");
  // Invite
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
          <li key={m.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                {m.name}
                {m.role !== "MEMBER" && <Badge color="primary">{m.role}</Badge>}
              </p>
              <p className="truncate text-xs text-muted">{m.email}</p>
            </div>
            {m.role !== "OWNER" && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => act(() => removeMember(m.id), "Member removed.")}
                className={buttonClass("ghost", "sm", "text-red-600 hover:bg-red-50")}
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>

      {/* Pending invites */}
      {data.invites.length > 0 && (
        <div className="mt-4 rounded-xl border border-outline p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">Pending invites</p>
          <ul className="space-y-1.5">
            {data.invites.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted">{i.email}</span>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => act(() => revokeInvite(i.id), "Invite revoked.")}
                  className="text-xs font-semibold text-red-500 hover:underline"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Add member directly */}
      <div className="mt-6 border-t border-black/5 pt-5">
        <p className="mb-2 text-sm font-semibold text-ink">Add a member</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <input value={mName} onChange={(e) => setMName(e.target.value)} placeholder="Full name" className={inputClass} />
          <input value={mEmail} onChange={(e) => setMEmail(e.target.value)} placeholder="Email" className={inputClass} />
          <input value={mJob} onChange={(e) => setMJob(e.target.value)} placeholder="Job title (optional)" className={inputClass} />
        </div>
        <button
          type="button"
          disabled={isPending || !mName.trim() || !mEmail.trim()}
          onClick={() =>
            act(async () => {
              const res = await addMemberDirect({ name: mName, email: mEmail, jobTitle: mJob });
              if (res.ok) { setMName(""); setMEmail(""); setMJob(""); }
              return res;
            }, "Member added. They can set a password via 'forgot password'.")
          }
          className={buttonClass("secondary", "sm", "mt-2")}
        >
          <Icon name="person_add" className="text-[16px]" /> Create member
        </button>
      </div>

      {/* Invite member */}
      <div className="mt-5 border-t border-black/5 pt-5">
        <p className="mb-2 text-sm font-semibold text-ink">Invite by email</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input value={invEmail} onChange={(e) => setInvEmail(e.target.value)} placeholder="colleague@company.com" className={inputClass} />
          <button
            type="button"
            disabled={isPending || !invEmail.trim()}
            onClick={() =>
              act(async () => {
                const res = await inviteMember(invEmail);
                if (res.ok) setInvEmail("");
                return res;
              }, "Invite sent.")
            }
            className={buttonClass("outline", "md")}
          >
            <Icon name="mail" className="text-[16px]" /> Send invite
          </button>
        </div>
      </div>

      {msg && <p className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-emerald-600"><Icon name="check_circle" className="text-[16px]" />{msg}</p>}
      {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
    </Card>
  );
}
