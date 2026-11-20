/**
 * How "finished" someone's public profile is, as a short list of the things
 * people see when they tap a card. Used by the profile reminder email.
 */

export type ProfileStep = "photo" | "jobTitle" | "bio" | "contact";

export type ProfileForCompleteness = {
  avatarUrl: string | null;
  jobTitle: string;
  bio: string;
  phone: string;
  email: string;
  /** Count of active links on the profile. */
  activeLinks: number;
};

export type ProfileCompleteness = {
  /** 0–100, rounded. */
  percent: number;
  missing: ProfileStep[];
  complete: boolean;
};

export function profileCompleteness(p: ProfileForCompleteness): ProfileCompleteness {
  const checks: [ProfileStep, boolean][] = [
    ["photo", Boolean(p.avatarUrl)],
    ["jobTitle", p.jobTitle.trim().length > 0],
    ["bio", p.bio.trim().length > 0],
    ["contact", p.phone.trim().length > 0 || p.email.trim().length > 0 || p.activeLinks > 0],
  ];
  const missing = checks.filter(([, done]) => !done).map(([step]) => step);
  const percent = Math.round(((checks.length - missing.length) / checks.length) * 100);
  return { percent, missing, complete: missing.length === 0 };
}
