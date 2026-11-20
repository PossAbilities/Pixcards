import "server-only";
import { prisma } from "@/lib/db";
import { appUrl } from "@/lib/constants";
import { freeCardStatus } from "@/lib/complimentary";
import { createResetToken, INVITE_TTL_MS } from "@/lib/password-reset";
import { profileCompleteness } from "@/lib/profile-completeness";
import { unsubscribeUrl } from "@/lib/unsubscribe";
import { sendEmail, type SendResult } from "./send";
import { profileReminderEmail, type ReminderOffer } from "./profile-reminder";

/** Wait this long after sign-up / invite before the first nudge. */
const FIRST_AFTER_MS = 2 * 24 * 60 * 60 * 1000;
/** Gap between nudges. */
const GAP_MS = 7 * 24 * 60 * 60 * 1000;
/** Never send more than this many to one person. */
export const MAX_REMINDERS = 3;
/** Cap per sweep so a backlog can't flood the provider in one go. */
const SWEEP_BATCH = 200;

export type ReminderSendResult = SendResult & { skipped?: string };

/**
 * Build and send the reminder for one person. Picks the order prompt:
 * free for staff on a free-card domain (the card is part of their account),
 * a normal "order your card" prompt only for people who opted in to marketing
 * (PECR), and none otherwise.
 *
 * `testTo` sends a copy to another address (admin proofing) without counting
 * as a reminder for the user.
 */
export async function sendProfileReminder(
  userId: string,
  opts: { testTo?: string } = {},
): Promise<ReminderSendResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: { include: { _count: { select: { links: { where: { active: true } } } } } },
      orgMembership: { include: { org: { select: { name: true } } } },
    },
  });
  if (!user?.profile) return { ok: false, skipped: "no profile" };

  const p = user.profile;
  const status = profileCompleteness({
    avatarUrl: p.avatarUrl,
    jobTitle: p.jobTitle,
    bio: p.bio,
    phone: p.phone,
    email: p.email,
    activeLinks: p._count.links,
  });
  if (status.complete && !opts.testTo) return { ok: false, skipped: "profile complete" };

  const free = await freeCardStatus(user.id);
  let offer: ReminderOffer = "none";
  if (free.free) offer = "free";
  else if (free.needsVerify) offer = "free-verify";
  else if (user.marketingOptIn) offer = "paid";

  // Invited but never set a password: the profile link has to be a fresh
  // set-up link (it also confirms their inbox, which unlocks a free staff card).
  let editUrl = `${appUrl()}/dashboard/edit`;
  if (user.invitedAt && !user.inviteAcceptedAt && !opts.testTo) {
    const token = await createResetToken(user.id, INVITE_TTL_MS);
    editUrl = `${appUrl()}/reset-password?invite=1&token=${encodeURIComponent(token)}`;
  }

  const built = profileReminderEmail({
    name: user.name,
    percent: status.percent,
    missing: status.missing,
    jobTitle: p.jobTitle,
    editUrl,
    orderUrl: `${appUrl()}/dashboard/order`,
    offer,
    orgName: user.orgMembership?.org.name ?? null,
    unsubscribeUrl: offer === "paid" ? await unsubscribeUrl(user.id) : undefined,
  });

  if (opts.testTo) {
    return sendEmail({ to: opts.testTo, ...built, subject: `[Test] ${built.subject}`, type: "OTHER" });
  }
  return sendEmail({ to: user.email, ...built, type: "PROFILE_REMINDER", userId: user.id });
}

/**
 * Find everyone due a nudge and send it. Due means: has a profile that isn't
 * finished, signed up / was invited at least 2 days ago, has had fewer than
 * three reminders, and the last one was at least a week ago.
 */
export async function runProfileReminderSweep(opts: { dryRun?: boolean } = {}): Promise<{
  due: number;
  sent: number;
  failed: number;
}> {
  const now = Date.now();
  const firstBefore = new Date(now - FIRST_AFTER_MS);

  const candidates = await prisma.user.findMany({
    where: {
      profile: { isNot: null },
      OR: [{ invitedAt: { lte: firstBefore } }, { invitedAt: null, createdAt: { lte: firstBefore } }],
    },
    select: {
      id: true,
      profile: {
        select: {
          avatarUrl: true,
          jobTitle: true,
          bio: true,
          phone: true,
          email: true,
          _count: { select: { links: { where: { active: true } } } },
        },
      },
      emails: {
        where: { type: "PROFILE_REMINDER", status: { not: "failed" } },
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const due = candidates.filter((u) => {
    if (!u.profile) return false;
    const { complete } = profileCompleteness({
      ...u.profile,
      activeLinks: u.profile._count.links,
    });
    if (complete) return false;
    if (u.emails.length >= MAX_REMINDERS) return false;
    const last = u.emails[0]?.createdAt.getTime();
    return !last || now - last >= GAP_MS;
  });

  if (opts.dryRun) return { due: due.length, sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;
  for (const u of due.slice(0, SWEEP_BATCH)) {
    try {
      const res = await sendProfileReminder(u.id);
      if (res.ok) sent++;
      else if (!res.skipped) failed++;
    } catch (e) {
      failed++;
      console.error("[profile-reminder] send failed", u.id, e);
    }
  }
  return { due: due.length, sent, failed };
}

let started = false;

/**
 * Daily automatic sweep. Off unless PROFILE_REMINDERS_ENABLED=true, so a
 * deploy never emails people until you've chosen to switch it on.
 */
export function startProfileReminders(): void {
  if (started || process.env.PROFILE_REMINDERS_ENABLED !== "true") return;
  started = true;
  const run = () =>
    runProfileReminderSweep()
      .then((r) => console.info(`[profile-reminder] sweep: ${r.sent} sent, ${r.failed} failed, ${r.due} due`))
      .catch((e) => console.error("[profile-reminder] sweep failed", e));
  // First run 10 minutes after boot (not straight away, so a crash-looping
  // container can't re-send), then once a day.
  setTimeout(run, 10 * 60 * 1000);
  setInterval(run, 24 * 60 * 60 * 1000);
}
