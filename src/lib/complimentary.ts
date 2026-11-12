import "server-only";
import { prisma } from "@/lib/db";

/**
 * Email domains whose people get their physical card free (staff cards).
 * Only applies once the person has confirmed their inbox, so nobody can sign
 * up with a made-up address on one of these domains and order for free.
 */
export const FREE_CARD_DOMAINS = ["possabilities.org.uk"] as const;

/** Free staff orders are for one card at a time. */
export const FREE_CARD_MAX_QUANTITY = 1;

export function isFreeCardDomain(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  return (FREE_CARD_DOMAINS as readonly string[]).includes(domain);
}

export type FreeCardStatus = {
  /** On a free-card domain at all. */
  eligible: boolean;
  /** Eligible and inbox confirmed — orders are free. */
  free: boolean;
  /** Eligible but still needs to confirm their email. */
  needsVerify: boolean;
};

export async function freeCardStatus(userId: string): Promise<FreeCardStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, emailVerifiedAt: true },
  });
  const eligible = !!user && isFreeCardDomain(user.email);
  const free = eligible && !!user?.emailVerifiedAt;
  return { eligible, free, needsVerify: eligible && !free };
}
