"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import {
  Card,
  Label,
  ProBadge,
  SectionHeading,
  buttonClass,
  inputClass,
} from "@/components/ui";
import { DigitalCard, type CardLink } from "@/components/DigitalCard";
import { BrandTile } from "@/components/BrandIcon";
import { ImageCropperModal } from "./ImageCropperModal";
import { Toast, type ToastState } from "@/components/dashboard/Toast";
import {
  PLATFORMS,
  THEMES,
  CARD_TEMPLATES,
  platform,
  theme as getTheme,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  addLink,
  deleteLink,
  setTheme,
  setTemplate,
  updateImages,
  updateLink,
  updateProfile,
  type ActionResult,
} from "@/lib/actions/profile";
import type { Plan } from "@prisma/client";

const FREE_LINK_LIMIT = 5;

type ProfileState = {
  name: string;
  username: string;
  jobTitle: string;
  company: string;
  bio: string;
  location: string;
  phone: string;
  email: string;
  avatarUrl: string | null;
  headerUrl: string | null;
  theme: string;
  template: string;
  accentColor?: string | null;
  brandHeader?: string | null;
  panelColor?: string | null;
};

type LinkDraft = { platform: string; label: string; url: string };
export type EditorLink = CardLink & { orgLocked?: boolean };

export function ProfileEditor({
  plan,
  shareUrl,
  profile,
  links: initialLinks,
  allowedPlatforms,
}: {
  plan: Plan;
  shareUrl: string;
  profile: ProfileState;
  links: EditorLink[];
  /** When set, members may only add these link types (org restriction). */
  allowedPlatforms?: string[];
}) {
  const isPro = plan === "PRO";

  const [form, setForm] = useState<ProfileState>(profile);
  const [links, setLinks] = useState<EditorLink[]>(initialLinks);
  const [toast, setToast] = useState<ToastState>(null);
  const [isPending, startTransition] = useTransition();

  const showToast = useCallback((message: string, kind: "success" | "error") => {
    setToast({ message, kind });
  }, []);

  function handleResult(res: ActionResult, success: string) {
    if (res.ok) showToast(success, "success");
    else showToast(res.error ?? "Something went wrong", "error");
  }

  /* ----------------------------- Live preview ---------------------------- */
  const liveData = useMemo(
    () => ({
      name: form.name,
      jobTitle: form.jobTitle,
      company: form.company,
      bio: form.bio,
      location: form.location,
      phone: form.phone,
      email: form.email,
      avatarUrl: form.avatarUrl,
      headerUrl: form.headerUrl,
      themeId: form.theme,
      templateId: form.template,
      brandHeader: form.brandHeader,
      accent: form.accentColor,
      panelColor: form.panelColor,
      links,
    }),
    [form, links],
  );

  /* ------------------------------- Details ------------------------------- */
  function set<K extends keyof ProfileState>(key: K, value: ProfileState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function saveDetails() {
    const fd = new FormData();
    fd.set("name", form.name);
    fd.set("jobTitle", form.jobTitle);
    fd.set("company", form.company);
    fd.set("bio", form.bio);
    fd.set("location", form.location);
    fd.set("phone", form.phone);
    fd.set("email", form.email);
    fd.set("username", form.username);
    startTransition(async () => {
      handleResult(await updateProfile(fd), "Profile saved");
    });
  }

  /* ------------------------------- Theme --------------------------------- */
  function chooseTheme(themeId: string, pro: boolean) {
    if (pro && !isPro) {
      showToast("Pro feature — upgrade to unlock this theme", "error");
      return;
    }
    const prev = form.theme;
    set("theme", themeId);
    startTransition(async () => {
      const res = await setTheme(themeId);
      if (!res.ok) {
        set("theme", prev);
        showToast(res.error ?? "Could not change theme", "error");
      } else {
        showToast("Theme updated", "success");
      }
    });
  }

  /* ------------------------------ Template ------------------------------- */
  function chooseTemplate(templateId: string, pro: boolean) {
    if (pro && !isPro) {
      showToast("Pro feature — upgrade to unlock this template", "error");
      return;
    }
    const prev = form.template;
    set("template", templateId);
    startTransition(async () => {
      const res = await setTemplate(templateId);
      if (!res.ok) {
        set("template", prev);
        showToast(res.error ?? "Could not change template", "error");
      } else {
        showToast("Template updated", "success");
      }
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* ------------------------------ LEFT ------------------------------- */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        <ImagesCard
          headerUrl={form.headerUrl}
          avatarUrl={form.avatarUrl}
          name={form.name}
          themeId={form.theme}
          onUploaded={(field, url) => {
            set(field, url);
            startTransition(async () => {
              handleResult(
                await updateImages({ [field]: url }),
                field === "avatarUrl" ? "Avatar updated" : "Header updated",
              );
            });
          }}
          onError={(m) => showToast(m, "error")}
        />

        {/* Personal details */}
        <Card className="p-6">
          <SectionHeading icon="person" title="Personal Details" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name">
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Jane Doe"
              />
            </Field>
            <Field label="Job Title">
              <input
                className={inputClass}
                value={form.jobTitle}
                onChange={(e) => set("jobTitle", e.target.value)}
                placeholder="Product Designer"
              />
            </Field>
            <Field label="Company">
              <input
                className={inputClass}
                value={form.company}
                onChange={(e) => set("company", e.target.value)}
                placeholder="Acme Inc."
              />
            </Field>
            <Field label="Location">
              <input
                className={inputClass}
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="London, UK"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Bio">
                <textarea
                  className={cn(inputClass, "min-h-24 resize-y")}
                  value={form.bio}
                  onChange={(e) => set("bio", e.target.value)}
                  maxLength={300}
                  placeholder="A short introduction about yourself."
                />
              </Field>
            </div>
            <Field label="Public Email">
              <input
                className={inputClass}
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="you@email.com"
              />
            </Field>
            <Field label="Phone">
              <input
                className={inputClass}
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+44 1234 567890"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Username">
                <div className="flex items-stretch rounded-lg border border-outline overflow-hidden focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary">
                  <span className="grid place-items-center px-3 bg-surface-low text-xs font-semibold text-muted border-r border-outline whitespace-nowrap">
                    pixcards.app/u/
                  </span>
                  <input
                    className="flex-1 px-3 py-2.5 bg-surface text-ink outline-none min-w-0"
                    value={form.username}
                    onChange={(e) => set("username", e.target.value)}
                    placeholder="janedoe"
                  />
                </div>
              </Field>
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={saveDetails}
              disabled={isPending}
              className={buttonClass("primary", "md")}
            >
              <Icon name="save" className="text-[18px]" />
              Save Changes
            </button>
          </div>
        </Card>

        {/* Links */}
        <LinksCard
          links={links}
          setLinks={setLinks}
          isPro={isPro}
          startTransition={startTransition}
          isPending={isPending}
          showToast={showToast}
          allowedPlatforms={allowedPlatforms}
        />

        {/* Layout template */}
        <Card className="p-6">
          <SectionHeading icon="dashboard_customize" title="Card layout" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {CARD_TEMPLATES.map((tpl) => {
              const active = form.template === tpl.id;
              const locked = tpl.pro && !isPro;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => chooseTemplate(tpl.id, tpl.pro)}
                  className={cn(
                    "relative rounded-2xl border-2 p-3 text-left transition-all",
                    active
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-black/5 hover:border-primary/40",
                  )}
                >
                  <div className="mb-2 aspect-[3/4] overflow-hidden rounded-xl ring-1 ring-black/5">
                    <TemplateThumb id={tpl.id} accent={getTheme(form.theme).accent} />
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-semibold text-ink">
                      {tpl.name}
                    </span>
                    {active && (
                      <Icon
                        name="check_circle"
                        fill
                        className="text-primary text-[18px]"
                      />
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted">
                    {tpl.description}
                  </p>
                  {tpl.pro && (
                    <span className="absolute top-2 right-2">
                      <ProBadge />
                    </span>
                  )}
                  {locked && (
                    <span className="absolute top-2 left-2 grid h-6 w-6 place-items-center rounded-full bg-black/40 text-white">
                      <Icon name="lock" className="text-[14px]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Appearance */}
        <Card className="p-6">
          <SectionHeading icon="palette" title="Custom Appearance" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {THEMES.map((t) => {
              const active = form.theme === t.id;
              const locked = t.pro && !isPro;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => chooseTheme(t.id, t.pro)}
                  className={cn(
                    "relative rounded-2xl overflow-hidden border-2 text-left transition-all",
                    active
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-black/5 hover:border-primary/40",
                  )}
                >
                  <div className="h-16" style={{ background: t.header }} />
                  <div className="flex items-center justify-between px-3 py-2 bg-surface">
                    <span className="text-xs font-semibold text-ink truncate">
                      {t.name}
                    </span>
                    {active && (
                      <Icon
                        name="check_circle"
                        fill
                        className="text-primary text-[18px]"
                      />
                    )}
                  </div>
                  {t.pro && (
                    <span className="absolute top-2 right-2">
                      <ProBadge />
                    </span>
                  )}
                  {locked && (
                    <span className="absolute top-2 left-2 grid place-items-center w-6 h-6 rounded-full bg-black/40 text-white">
                      <Icon name="lock" className="text-[14px]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ------------------------------ RIGHT ------------------------------ */}
      <div className="lg:col-span-4">
        <div className="lg:sticky lg:top-8 flex flex-col items-center gap-5">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted">
            Live Preview
          </span>
          <div className="w-[280px] max-w-full border-8 border-ink rounded-[32px] overflow-hidden shadow-xl bg-surface">
            <div className="h-[560px] overflow-y-auto">
              <DigitalCard data={liveData} />
            </div>
          </div>
          <PreviewActions shareUrl={shareUrl} accent={getTheme(form.theme).accent} />
        </div>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

/* ----------------------------- Sub-components ---------------------------- */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.set("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const json = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !json.url) {
    throw new Error(json.error ?? "Upload failed");
  }
  return json.url;
}

function ImagesCard({
  headerUrl,
  avatarUrl,
  name,
  themeId,
  onUploaded,
  onError,
}: {
  headerUrl: string | null;
  avatarUrl: string | null;
  name: string;
  themeId: string;
  onUploaded: (field: "avatarUrl" | "headerUrl", url: string) => void;
  onError: (msg: string) => void;
}) {
  const t = getTheme(themeId);
  const [busy, setBusy] = useState<"avatarUrl" | "headerUrl" | null>(null);
  const [cropState, setCropState] = useState<{
    src: string;
    field: "avatarUrl" | "headerUrl";
  } | null>(null);
  const headerInput = useRef<HTMLInputElement>(null);
  const avatarInput = useRef<HTMLInputElement>(null);

  // Open the cropper with the chosen file (read as a data URL — avoids CORS).
  function handle(field: "avatarUrl" | "headerUrl", file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      setCropState({ src: reader.result as string, field });
    reader.readAsDataURL(file);
  }

  // Upload the cropped result.
  async function uploadCropped(blob: Blob) {
    if (!cropState) return;
    const field = cropState.field;
    setCropState(null);
    setBusy(field);
    try {
      const file = new File([blob], `${field}.jpg`, { type: "image/jpeg" });
      const url = await uploadFile(file);
      onUploaded(field, url);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="p-6">
      <SectionHeading icon="image" title="Images" />

      {/* Header banner */}
      <div className="relative h-32 rounded-xl overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: headerUrl
              ? `center/cover no-repeat url(${headerUrl})`
              : t.header,
          }}
        />
        <button
          type="button"
          onClick={() => headerInput.current?.click()}
          className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-lg bg-black/50 text-white px-3 py-1.5 text-xs font-semibold backdrop-blur hover:bg-black/60"
        >
          {busy === "headerUrl" ? (
            <Icon name="progress_activity" className="text-[16px] animate-spin" />
          ) : (
            <Icon name="upload" className="text-[16px]" />
          )}
          Upload header
        </button>
        <input
          ref={headerInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            handle("headerUrl", e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      {/* Avatar */}
      <div className="mt-4 flex items-center gap-4">
        <div className="relative">
          <div
            className="w-20 h-20 rounded-full overflow-hidden grid place-items-center text-white font-bold text-xl shadow"
            style={{ background: t.accent }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{(name || "P").slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          {busy === "avatarUrl" && (
            <div className="absolute inset-0 grid place-items-center rounded-full bg-black/40 text-white">
              <Icon name="progress_activity" className="animate-spin text-[20px]" />
            </div>
          )}
        </div>
        <div>
          <button
            type="button"
            onClick={() => avatarInput.current?.click()}
            className={buttonClass("outline", "sm")}
          >
            <Icon name="add_a_photo" className="text-[16px]" />
            Upload avatar
          </button>
          <p className="text-xs text-faint mt-1.5">JPG, PNG or WEBP. Max 5MB.</p>
          <input
            ref={avatarInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              handle("avatarUrl", e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {cropState && (
        <ImageCropperModal
          src={cropState.src}
          title={
            cropState.field === "avatarUrl"
              ? "Adjust your profile photo"
              : "Adjust your header image"
          }
          aspect={cropState.field === "avatarUrl" ? 1 : 3}
          round={cropState.field === "avatarUrl"}
          onCancel={() => setCropState(null)}
          onSave={uploadCropped}
        />
      )}
    </Card>
  );
}

function LinksCard({
  links,
  setLinks,
  isPro,
  startTransition,
  isPending,
  showToast,
  allowedPlatforms,
}: {
  links: EditorLink[];
  setLinks: React.Dispatch<React.SetStateAction<EditorLink[]>>;
  isPro: boolean;
  startTransition: React.TransitionStartFunction;
  isPending: boolean;
  showToast: (m: string, k: "success" | "error") => void;
  allowedPlatforms?: string[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const atLimit = !isPro && links.length >= FREE_LINK_LIMIT;

  function reload() {
    // Server actions revalidate; we keep local state optimistic via re-fetch
    // by simply trusting the action result. Router refresh keeps SSR in sync.
    window.location.reload();
  }

  function submitAdd(draft: LinkDraft) {
    const fd = new FormData();
    fd.set("platform", draft.platform);
    fd.set("label", draft.label);
    fd.set("url", draft.url);
    startTransition(async () => {
      const res = await addLink(fd);
      if (res.ok) {
        showToast("Link added", "success");
        setAdding(false);
        reload();
      } else {
        showToast(res.error ?? "Could not add link", "error");
      }
    });
  }

  function submitEdit(id: string, draft: LinkDraft) {
    const fd = new FormData();
    fd.set("platform", draft.platform);
    fd.set("label", draft.label);
    fd.set("url", draft.url);
    startTransition(async () => {
      const res = await updateLink(id, fd);
      if (res.ok) {
        showToast("Link updated", "success");
        setEditingId(null);
        setLinks((ls) =>
          ls.map((l) =>
            l.id === id
              ? {
                  ...l,
                  platform: draft.platform,
                  label: draft.label,
                  url: draft.url,
                  icon: platform(draft.platform).icon,
                }
              : l,
          ),
        );
      } else {
        showToast(res.error ?? "Could not update link", "error");
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await deleteLink(id);
      if (res.ok) {
        setLinks((ls) => ls.filter((l) => l.id !== id));
        showToast("Link removed", "success");
      } else {
        showToast(res.error ?? "Could not delete link", "error");
      }
    });
  }

  return (
    <Card className="p-6">
      <SectionHeading
        icon="link"
        title="Active Links"
        action={
          atLimit ? (
            <a
              href="/pricing"
              className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
            >
              <Icon name="lock" className="text-[14px]" />
              Upgrade for unlimited
            </a>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAdding((v) => !v);
                setEditingId(null);
              }}
              className={buttonClass("secondary", "sm")}
            >
              <Icon name="add" className="text-[18px]" />
              Add New Link
            </button>
          )
        }
      />

      {adding && (
        <LinkForm
          onSubmit={submitAdd}
          onCancel={() => setAdding(false)}
          disabled={isPending}
          allowedPlatforms={allowedPlatforms}
        />
      )}

      <div className="flex flex-col gap-2 mt-1">
        {links.length === 0 && !adding && (
          <p className="text-sm text-muted py-4 text-center">
            No links yet. Add your first one above.
          </p>
        )}
        {links.map((link) =>
          editingId === link.id && !link.orgLocked ? (
            <LinkForm
              key={link.id}
              initial={{
                platform: link.platform,
                label: link.label,
                url: link.url,
              }}
              onSubmit={(d) => submitEdit(link.id, d)}
              onCancel={() => setEditingId(null)}
              disabled={isPending}
              allowedPlatforms={allowedPlatforms}
            />
          ) : (
            <div
              key={link.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-black/5 bg-surface-low"
            >
              <BrandTile platform={link.platform} size={36} radius={10} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink truncate">
                  {link.label}
                </p>
                <p className="text-xs text-faint truncate">{link.url}</p>
              </div>
              {link.orgLocked ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-high px-2.5 py-1 text-[11px] font-medium text-muted">
                  <Icon name="lock" className="text-[14px]" />
                  Team link
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    aria-label="Edit link"
                    onClick={() => {
                      setEditingId(link.id);
                      setAdding(false);
                    }}
                    className="grid place-items-center w-8 h-8 rounded-lg text-muted hover:bg-surface-high hover:text-ink"
                  >
                    <Icon name="edit" className="text-[18px]" />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete link"
                    onClick={() => remove(link.id)}
                    disabled={isPending}
                    className="grid place-items-center w-8 h-8 rounded-lg text-muted hover:bg-red-50 hover:text-red-600"
                  >
                    <Icon name="delete" className="text-[18px]" />
                  </button>
                </>
              )}
            </div>
          ),
        )}
      </div>

      {atLimit && (
        <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
          <Icon name="info" className="text-[14px]" />
          Free plan allows up to {FREE_LINK_LIMIT} links.
        </p>
      )}
    </Card>
  );
}

function LinkForm({
  initial,
  onSubmit,
  onCancel,
  disabled,
  allowedPlatforms,
}: {
  initial?: LinkDraft;
  onSubmit: (draft: LinkDraft) => void;
  onCancel: () => void;
  disabled?: boolean;
  allowedPlatforms?: string[];
}) {
  // Restrict to the org's allowed types when set (always keep the current one).
  const palette =
    allowedPlatforms && allowedPlatforms.length > 0
      ? PLATFORMS.filter((pl) => allowedPlatforms.includes(pl.id))
      : PLATFORMS;
  const [draft, setDraft] = useState<LinkDraft>(
    initial ?? { platform: palette[0]?.id ?? "website", label: palette[0]?.label ?? "Website", url: "" },
  );
  const p = platform(draft.platform);

  function pickPlatform(id: string) {
    const meta = platform(id);
    setDraft((d) => ({
      platform: id,
      // auto-fill label if empty or matched previous platform label
      label: d.label && d.label !== platform(d.platform).label ? d.label : meta.label,
      url: d.url,
    }));
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-primary-soft/30 p-4 mb-2 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <BrandTile platform={draft.platform} size={44} />
        <p className="text-xs text-muted">
          The <span className="font-semibold text-ink">{p.label}</span> icon will
          appear on your card — it updates automatically when you pick a platform.
        </p>
      </div>
      <div>
        <Label>Platform</Label>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-1">
          {palette.map((pl) => {
            const active = pl.id === draft.platform;
            return (
              <button
                key={pl.id}
                type="button"
                onClick={() => pickPlatform(pl.id)}
                aria-pressed={active}
                title={pl.label}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border p-2 transition",
                  active
                    ? "border-primary bg-primary-soft/50 ring-2 ring-primary/30"
                    : "border-black/5 bg-surface-low hover:bg-surface-high",
                )}
              >
                <BrandTile platform={pl.id} size={32} radius={9} />
                <span className="text-[10px] font-medium text-muted text-center leading-tight w-full truncate">
                  {pl.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <Label>Label</Label>
        <input
          className={inputClass}
          value={draft.label}
          onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
          placeholder={p.label}
        />
      </div>
      <div>
        <Label>URL</Label>
        <input
          className={inputClass}
          value={draft.url}
          onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
          placeholder={p.placeholder}
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className={buttonClass("ghost", "sm")}
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={disabled || !draft.label.trim() || !draft.url.trim()}
          onClick={() => onSubmit(draft)}
          className={buttonClass("primary", "sm")}
        >
          <Icon name="check" className="text-[16px]" />
          Save
        </button>
      </div>
    </div>
  );
}

function PreviewActions({
  shareUrl,
  accent,
}: {
  shareUrl: string;
  accent: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  async function downloadQr() {
    const url = `/api/qr?data=${encodeURIComponent(shareUrl)}&color=${encodeURIComponent(accent)}`;
    try {
      const res = await fetch(url);
      const svg = await res.text();
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = "pixcards-qr.svg";
      a.click();
      URL.revokeObjectURL(href);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="w-full flex flex-col gap-2">
      <button
        type="button"
        onClick={downloadQr}
        className={buttonClass("dark", "md", "w-full")}
      >
        <Icon name="qr_code_2" className="text-[18px]" />
        Download QR Code
      </button>
      <button
        type="button"
        onClick={copy}
        className={buttonClass("outline", "md", "w-full")}
      >
        <Icon name={copied ? "check" : "content_copy"} className="text-[18px]" />
        {copied ? "Copied!" : "Copy Profile Link"}
      </button>
    </div>
  );
}

/** Small schematic preview of a card layout for the template picker. */
function TemplateThumb({ id, accent }: { id: string; accent: string }) {
  if (id === "spotlight") {
    return (
      <div
        className="relative h-full w-full"
        style={{ background: `linear-gradient(160deg, ${accent}, ${accent}aa)` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
        <div className="absolute bottom-2 left-2 right-2 flex flex-col gap-1">
          <div className="h-2 w-2/3 rounded bg-white/90" />
          <div className="h-1.5 w-1/2 rounded bg-white/60" />
        </div>
      </div>
    );
  }
  if (id === "grid") {
    return (
      <div className="flex h-full w-full flex-col bg-white">
        <div className="h-6" style={{ background: accent }} />
        <div
          className="-mt-3 mx-auto h-6 w-6 rounded-full border-2 border-white"
          style={{ background: accent }}
        />
        <div className="mt-1 grid grid-cols-3 gap-1 p-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-md bg-black/10" />
          ))}
        </div>
      </div>
    );
  }
  if (id === "minimal") {
    return (
      <div className="flex h-full w-full flex-col items-center bg-white pt-3">
        <div
          className="h-7 w-7 rounded-full"
          style={{ background: accent }}
        />
        <div className="mt-1 h-1.5 w-1/2 rounded-full bg-black/20" />
        <div className="mt-3 flex w-full flex-col gap-1.5 px-2">
          <div className="h-1.5 w-4/5 rounded-full bg-black/10" />
          <div className="h-1.5 w-11/12 rounded-full bg-black/10" />
          <div className="h-1.5 w-3/4 rounded-full bg-black/10" />
        </div>
      </div>
    );
  }
  // classic
  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="h-7" style={{ background: accent }} />
      <div
        className="-mt-4 mx-auto h-7 w-7 rounded-full border-2 border-white"
        style={{ background: accent }}
      />
      <div className="mt-1 flex flex-col gap-1.5 p-2">
        <div className="h-1.5 w-4/5 rounded-full bg-black/10" />
        <div className="h-1.5 w-11/12 rounded-full bg-black/10" />
        <div className="h-1.5 w-3/4 rounded-full bg-black/10" />
      </div>
    </div>
  );
}
