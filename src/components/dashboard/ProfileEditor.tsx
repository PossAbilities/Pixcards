"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Icon } from "@/components/Icon";
import {
  Card,
  Label,
  ProBadge,
  buttonClass,
  inputClass,
} from "@/components/ui";
import { type CardLink } from "@/components/DigitalCard";
import { PhonePreview } from "./PhonePreview";
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
import { cn, orderByTokens } from "@/lib/utils";
import {
  addLink,
  deleteLink,
  setTheme,
  setTemplate,
  setTileSize,
  setAvatarSize,
  setTileLayout,
  reorderTiles,
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
  tileSize?: string | null;
  avatarSize?: string | null;
  tileLayout?: string | null;
  tileOrder?: string[] | null;
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
      tileSize: form.tileSize,
      avatarSize: form.avatarSize,
      tileLayout: form.tileLayout,
      tileOrder: form.tileOrder,
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

  function chooseTileSize(size: string) {
    const prev = form.tileSize;
    set("tileSize", size);
    startTransition(async () => {
      const res = await setTileSize(size);
      if (!res.ok) {
        set("tileSize", prev);
        showToast(res.error ?? "Could not change icon size", "error");
      } else {
        showToast("Icon size updated", "success");
      }
    });
  }

  function chooseAvatarSize(size: string) {
    const prev = form.avatarSize;
    set("avatarSize", size);
    startTransition(async () => {
      const res = await setAvatarSize(size);
      if (!res.ok) {
        set("avatarSize", prev);
        showToast(res.error ?? "Could not change photo size", "error");
      } else {
        showToast("Photo size updated", "success");
      }
    });
  }

  function chooseTileLayout(layout: string) {
    const prev = form.tileLayout;
    set("tileLayout", layout);
    startTransition(async () => {
      const res = await setTileLayout(layout);
      if (!res.ok) {
        set("tileLayout", prev);
        showToast(res.error ?? "Could not change layout", "error");
      } else {
        showToast("Layout updated", "success");
      }
    });
  }

  function applyTileOrder(tokens: string[]) {
    set("tileOrder", tokens);
    startTransition(async () => {
      const res = await reorderTiles(tokens);
      if (!res.ok) showToast(res.error ?? "Could not save the new order", "error");
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Preview — the live page is the hero: first on mobile, right rail on desktop */}
      <div className="order-1 lg:order-2 lg:col-span-4">
        <div className="lg:sticky lg:top-8 flex flex-col items-center gap-4">
          <PhonePreview data={liveData} width={260} />
          <p className="text-center text-xs text-muted">
            Your live page — it updates as you edit below.
          </p>
          <PreviewActions shareUrl={shareUrl} accent={getTheme(form.theme).accent} />
        </div>
      </div>

      {/* -------------------- Options — compact sections -------------------- */}
      <div className="order-2 lg:order-1 lg:col-span-8 flex flex-col gap-4">
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
        <Section icon="person" title="Profile details" subtitle="Name, role, bio and contact info" defaultOpen>
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
        </Section>

        {/* Links */}
        <LinksCard
          links={links}
          setLinks={setLinks}
          isPro={isPro}
          startTransition={startTransition}
          isPending={isPending}
          showToast={showToast}
          allowedPlatforms={allowedPlatforms}
          email={form.email}
          phone={form.phone}
          accent={form.accentColor}
          tileOrder={form.tileOrder}
          onReorder={applyTileOrder}
        />

        {/* Layout, sizes & colours */}
        <Section icon="tune" title="Appearance & layout" subtitle="Layout, icon sizes and colours">
          <div className="grid grid-cols-3 gap-2">
            {CARD_TEMPLATES.map((tpl) => {
              const active = form.template === tpl.id;
              const locked = tpl.pro && !isPro;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => chooseTemplate(tpl.id, tpl.pro)}
                  className={cn(
                    "relative rounded-2xl border-2 p-2 text-left transition-all",
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
                  <p className="mt-0.5 hidden sm:block text-[11px] leading-snug text-muted">
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

          {/* Contact/social icon size (used by layouts with icon squares) */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-ink">Contact icon size</span>
            <div className="inline-flex rounded-lg border border-outline p-0.5">
              {([["sm", "Small"], ["md", "Medium"], ["lg", "Large"]] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => chooseTileSize(id)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-semibold transition",
                    (form.tileSize ?? "md") === id ? "bg-primary text-white" : "text-muted hover:text-ink",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Contact icon layout — columns across, or a full-width list */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-ink">Contact layout</span>
            <div className="inline-flex flex-wrap rounded-lg border border-outline p-0.5">
              {([["auto", "Auto"], ["2", "2"], ["3", "3"], ["4", "4"], ["list", "Full width"]] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => chooseTileLayout(id)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-semibold transition",
                    (form.tileLayout ?? "auto") === id ? "bg-primary text-white" : "text-muted hover:text-ink",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Profile photo size on the public page */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-ink">Profile photo size</span>
            <div className="inline-flex rounded-lg border border-outline p-0.5">
              {([["sm", "Small"], ["md", "Medium"], ["lg", "Large"]] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => chooseAvatarSize(id)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-semibold transition",
                    (form.avatarSize ?? "md") === id ? "bg-primary text-white" : "text-muted hover:text-ink",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {/* Colour theme — hidden while the Brand layout drives the colours */}
          {form.template === "brand" ? (
            <p className="mt-5 rounded-xl border border-dashed border-outline bg-surface-low p-3 text-xs text-muted">
              Colours come from your card branding while the Brand layout is on.
            </p>
          ) : (
            <div className="mt-5">
              <p className="mb-2 text-sm font-semibold text-ink">Colour theme</p>
              <div className="flex flex-wrap gap-3">
                {THEMES.map((t) => {
                  const active = form.theme === t.id;
                  const locked = t.pro && !isPro;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => chooseTheme(t.id, t.pro)}
                      title={t.name}
                      className="flex w-14 flex-col items-center gap-1.5"
                    >
                      <span
                        className={cn(
                          "relative grid h-11 w-11 place-items-center rounded-full transition",
                          active ? "ring-2 ring-primary ring-offset-2" : "ring-1 ring-black/10",
                        )}
                        style={{ background: t.header }}
                      >
                        {active && <Icon name="check" className="text-[18px] text-white drop-shadow" />}
                        {locked && (
                          <span className="absolute -bottom-1 -right-1 grid h-[18px] w-[18px] place-items-center rounded-full bg-ink text-white">
                            <Icon name="lock" className="text-[10px]" />
                          </span>
                        )}
                      </span>
                      <span className="w-full truncate text-center text-[10px] font-medium text-muted">{t.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Section>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

/* ----------------------------- Sub-components ---------------------------- */

/** One draggable square in the links grid (dnd-kit sortable). */
function SortableTile({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        touchAction: "manipulation",
        zIndex: isDragging ? 20 : undefined,
        opacity: isDragging ? 0.85 : 1,
      }}
      className="flex w-16 cursor-grab flex-col items-center gap-1 active:cursor-grabbing"
    >
      {children}
      <span className="w-full truncate text-center text-[10px] font-medium text-muted">{label}</span>
    </div>
  );
}

/** Collapsible option group — keeps the editor compact (preview-first). */
function Section({
  icon,
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="overflow-hidden p-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft/60 text-primary">
          <Icon name={icon} className="text-[20px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-ink">{title}</span>
          {subtitle && <span className="block truncate text-xs text-muted">{subtitle}</span>}
        </span>
        <Icon name={open ? "expand_less" : "expand_more"} className="text-[22px] text-muted" />
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </Card>
  );
}

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
    <Section icon="image" title="Photos" subtitle="Header image and profile photo">
      {/* Header banner */}
      <div className="relative h-24 rounded-xl overflow-hidden">
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
            className="w-16 h-16 rounded-full overflow-hidden grid place-items-center text-white font-bold text-xl shadow"
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
    </Section>
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
  email,
  phone,
  accent,
  tileOrder,
  onReorder,
}: {
  links: EditorLink[];
  setLinks: React.Dispatch<React.SetStateAction<EditorLink[]>>;
  isPro: boolean;
  startTransition: React.TransitionStartFunction;
  isPending: boolean;
  showToast: (m: string, k: "success" | "error") => void;
  allowedPlatforms?: string[];
  email?: string;
  phone?: string;
  accent?: string | null;
  tileOrder?: string[] | null;
  onReorder: (tokens: string[]) => void;
}) {
  // Hold-and-drag reordering: a small movement threshold on mouse keeps
  // plain clicks working; touch requires a hold so scrolling isn't hijacked.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );
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

  const editing = links.find((l) => l.id === editingId) ?? null;

  return (
    <Section icon="link" title="Links" subtitle={links.length ? `${links.length} on your page — tap to edit, hold & drag to reorder` : "Add your website and socials"}>
      {adding && (
        <LinkForm
          onSubmit={submitAdd}
          onCancel={() => setAdding(false)}
          disabled={isPending}
          allowedPlatforms={allowedPlatforms}
        />
      )}
      {editing && !editing.orgLocked && (
        <LinkForm
          key={editing.id}
          initial={{ platform: editing.platform, label: editing.label, url: editing.url }}
          onSubmit={(d) => submitEdit(editing.id, d)}
          onCancel={() => setEditingId(null)}
          onDelete={() => {
            remove(editing.id);
            setEditingId(null);
          }}
          disabled={isPending}
          allowedPlatforms={allowedPlatforms}
        />
      )}

      {/* App-icon tiles — tap the pencil to edit, hold & drag to reorder.
          Email and phone are part of the same order. */}
      {(() => {
        const tiles: { key: string; label: string; node: React.ReactNode }[] = [
          ...(email
            ? [{
                key: "email",
                label: "Email",
                node: (
                  <span
                    className="grid h-14 w-14 place-items-center rounded-2xl text-white shadow"
                    style={{ background: accent || "#4f46e5" }}
                  >
                    <Icon name="mail" className="text-[26px]" />
                  </span>
                ),
              }]
            : []),
          ...(phone
            ? [{
                key: "phone",
                label: "Phone",
                node: (
                  <span
                    className="grid h-14 w-14 place-items-center rounded-2xl text-white shadow"
                    style={{ background: accent || "#4f46e5" }}
                  >
                    <Icon name="call" className="text-[26px]" />
                  </span>
                ),
              }]
            : []),
          ...links.map((link) => ({
            key: link.id,
            label: link.label,
            node: (
              <button
                type="button"
                onClick={() => {
                  if (link.orgLocked) return;
                  setEditingId(editingId === link.id ? null : link.id);
                  setAdding(false);
                }}
                className="relative transition active:scale-95"
                aria-label={`Edit ${link.label}`}
              >
                <BrandTile platform={link.platform} size={56} radius={16} />
                {link.orgLocked ? (
                  <span className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-ink text-white shadow">
                    <Icon name="lock" className="text-[12px]" />
                  </span>
                ) : (
                  <span
                    className={cn(
                      "absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-surface text-ink shadow ring-1 ring-black/10",
                      editingId === link.id && "bg-primary text-white ring-primary",
                    )}
                  >
                    <Icon name="edit" className="text-[13px]" />
                  </span>
                )}
              </button>
            ),
          })),
        ];
        const ordered = orderByTokens(tiles, (t) => t.key, tileOrder);
        const tokens = ordered.map((t) => t.key);
        function onDragEnd(e: DragEndEvent) {
          const { active, over } = e;
          if (!over || active.id === over.id) return;
          const next = arrayMove(tokens, tokens.indexOf(String(active.id)), tokens.indexOf(String(over.id)));
          const idOrder = next.filter((k) => k !== "email" && k !== "phone");
          setLinks((ls) => [...ls].sort((a, b) => idOrder.indexOf(a.id) - idOrder.indexOf(b.id)));
          onReorder(next);
        }
        return (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={tokens} strategy={rectSortingStrategy}>
              <div className="flex flex-wrap gap-x-3 gap-y-4">
                {ordered.map((t) => (
                  <SortableTile key={t.key} id={t.key} label={t.label}>
                    {t.node}
                  </SortableTile>
                ))}
                {!atLimit && (
                  <div className="flex w-16 flex-col items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAdding((v) => !v);
                        setEditingId(null);
                      }}
                      aria-label="Add link"
                      className="grid h-14 w-14 place-items-center rounded-2xl border-2 border-dashed border-outline text-muted transition hover:border-primary hover:text-primary active:scale-95"
                    >
                      <Icon name="add" className="text-[26px]" />
                    </button>
                    <span className="text-[10px] font-medium text-muted">Add</span>
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>
        );
      })()}

      {links.length === 0 && !adding && (
        <p className="mt-3 text-sm text-muted">No links yet — tap + to add your first.</p>
      )}
      {atLimit && (
        <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
          <Icon name="info" className="text-[14px]" />
          Free plan allows up to {FREE_LINK_LIMIT} links.{" "}
          <a href="/pricing" className="font-semibold text-primary hover:underline">
            Upgrade
          </a>
        </p>
      )}
    </Section>
  );
}

function LinkForm({
  initial,
  onSubmit,
  onCancel,
  onDelete,
  disabled,
  allowedPlatforms,
}: {
  initial?: LinkDraft;
  onSubmit: (draft: LinkDraft) => void;
  onCancel: () => void;
  onDelete?: () => void;
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
      <div className="flex items-center justify-end gap-2">
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={disabled}
            className="mr-auto inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline"
          >
            <Icon name="delete" className="text-[15px]" />
            Remove link
          </button>
        )}
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
