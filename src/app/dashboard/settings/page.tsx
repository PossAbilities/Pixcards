import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { appUrl } from "@/lib/constants";
import { Card, ProBadge, SectionHeading, buttonClass, inputClass, Label } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { PublishToggle } from "@/components/dashboard/PublishToggle";
import { updateProfile } from "@/lib/actions/profile";
import { logoutAction } from "@/app/(auth)/actions";
import { formatDate } from "@/lib/utils";

async function saveProfileAction(formData: FormData): Promise<void> {
  "use server";
  await updateProfile(formData);
}

export default async function SettingsPage() {
  const user = await requireUser();
  const data = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      email: true,
      name: true,
      plan: true,
      proSince: true,
      profile: {
        select: {
          username: true,
          jobTitle: true,
          company: true,
          bio: true,
          location: true,
          phone: true,
          email: true,
          published: true,
        },
      },
    },
  });
  if (!data || !data.profile) redirect("/login");

  const p = data.profile;
  const isPro = data.plan === "PRO";

  // Hidden fields keep updateProfile's schema satisfied while editing one field.
  function hidden() {
    return (
      <>
        <input type="hidden" name="jobTitle" value={p.jobTitle} />
        <input type="hidden" name="company" value={p.company} />
        <input type="hidden" name="bio" value={p.bio} />
        <input type="hidden" name="location" value={p.location} />
        <input type="hidden" name="phone" value={p.phone} />
        <input type="hidden" name="email" value={p.email} />
      </>
    );
  }

  return (
    <div className="max-w-3xl">
      <header className="mb-6 md:mb-8">
        <h1 className="font-display text-3xl font-bold text-ink">Settings</h1>
        <p className="text-muted mt-1">
          Manage your account, public profile and plan.
        </p>
      </header>

      <div className="flex flex-col gap-6">
        {/* Account */}
        <Card className="p-6">
          <SectionHeading icon="account_circle" title="Account" />
          <form action={saveProfileAction} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="email-ro">Email</Label>
              <input
                id="email-ro"
                className={`${inputClass} opacity-70 cursor-not-allowed`}
                value={data.email}
                readOnly
              />
              <p className="text-xs text-faint mt-1">
                Your login email cannot be changed here.
              </p>
            </div>
            <div>
              <Label htmlFor="name">Full Name</Label>
              <input id="name" name="name" className={inputClass} defaultValue={data.name} />
            </div>
            <input type="hidden" name="username" value={p.username} />
            {hidden()}
            <div className="flex justify-end">
              <button type="submit" className={buttonClass("primary", "md")}>
                <Icon name="save" className="text-[18px]" />
                Save Account
              </button>
            </div>
          </form>
        </Card>

        {/* Public profile */}
        <Card className="p-6">
          <SectionHeading icon="public" title="Public Profile" />
          <form action={saveProfileAction} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <div className="flex items-stretch rounded-lg border border-outline overflow-hidden focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary">
                <span className="grid place-items-center px-3 bg-surface-low text-xs font-semibold text-muted border-r border-outline whitespace-nowrap">
                  pixcards.app/u/
                </span>
                <input
                  id="username"
                  name="username"
                  className="flex-1 px-3 py-2.5 bg-surface text-ink outline-none min-w-0"
                  defaultValue={p.username}
                />
              </div>
              <p className="text-xs text-faint mt-1">
                Public link:{" "}
                <Link
                  href={`/u/${p.username}`}
                  className="text-primary hover:underline"
                >
                  {appUrl()}/u/{p.username}
                </Link>
              </p>
            </div>
            <input type="hidden" name="name" value={data.name} />
            {hidden()}
            <div className="flex justify-end">
              <button type="submit" className={buttonClass("primary", "md")}>
                <Icon name="save" className="text-[18px]" />
                Save Username
              </button>
            </div>
          </form>

          <div className="mt-5 pt-5 border-t border-black/5">
            <PublishToggle initial={p.published} />
          </div>
        </Card>

        {/* Plan */}
        <Card className="p-6">
          <SectionHeading icon="workspace_premium" title="Plan" />
          {isPro ? (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-ink flex items-center gap-2">
                  You&apos;re on Pro <span aria-hidden>🎉</span> <ProBadge />
                </p>
                <p className="text-xs text-muted mt-1">
                  {data.proSince
                    ? `Member since ${formatDate(data.proSince)}.`
                    : "Enjoy unlimited links, premium themes & advanced analytics."}
                </p>
              </div>
              <Icon name="verified" fill className="text-primary text-[28px]" />
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-ink">Free plan</p>
                <p className="text-xs text-muted mt-1">
                  Up to 5 links and the default theme. Upgrade for more.
                </p>
              </div>
              <Link href="/pricing" className={buttonClass("primary", "md")}>
                <Icon name="bolt" fill className="text-[18px]" />
                Upgrade to Pro
              </Link>
            </div>
          )}
        </Card>

        {/* Danger zone */}
        <Card className="p-6 border-red-200">
          <SectionHeading icon="warning" title="Danger Zone" />
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-ink">Log out</p>
              <p className="text-xs text-muted mt-1">
                Sign out of your Pixcards account on this device.
              </p>
            </div>
            <form action={logoutAction}>
              <button type="submit" className={buttonClass("danger", "md")}>
                <Icon name="logout" className="text-[18px]" />
                Log out
              </button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
