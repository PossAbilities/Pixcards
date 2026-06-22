"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { normaliseCardCode } from "@/lib/cards";
import { recordEvent } from "@/lib/events";

export type CardResult = { ok: boolean; error?: string; code?: string };

/**
 * Claim an unclaimed card and link it to the current user. Used by both the
 * tap/activation page (/c/<code>) and the "Activate a card" box in the
 * dashboard.
 */
export async function claimCard(rawCode: string): Promise<CardResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please log in to activate a card." };

  const code = normaliseCardCode(rawCode);
  if (!code) return { ok: false, error: "Enter the code from your card." };

  const card = await prisma.card.findUnique({ where: { code } });
  if (!card) {
    return { ok: false, error: "We don't recognise that card code." };
  }
  if (card.userId && card.userId !== user.id) {
    return {
      ok: false,
      error: "That card is already activated to another account.",
    };
  }

  if (!card.userId) {
    await prisma.card.update({
      where: { id: card.id },
      data: { userId: user.id, active: true, claimedAt: new Date() },
    });
    await recordEvent({
      type: "CARD_ACTIVATED",
      title: `${user.name} activated a card`,
      message: code,
      meta: { cardId: card.id, code, userId: user.id },
    });
  }

  revalidatePath("/dashboard/cards");
  return { ok: true, code };
}

export async function renameCard(
  cardId: string,
  label: string,
): Promise<CardResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card || card.userId !== user.id) {
    return { ok: false, error: "Card not found." };
  }
  await prisma.card.update({
    where: { id: cardId },
    data: { label: label.trim().slice(0, 40) },
  });
  revalidatePath("/dashboard/cards");
  return { ok: true };
}

export async function setCardActive(
  cardId: string,
  active: boolean,
): Promise<CardResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card || card.userId !== user.id) {
    return { ok: false, error: "Card not found." };
  }
  await prisma.card.update({ where: { id: cardId }, data: { active } });
  revalidatePath("/dashboard/cards");
  return { ok: true };
}

/** Unlink a card from the current user so it can be re-activated elsewhere. */
export async function releaseCard(cardId: string): Promise<CardResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card || card.userId !== user.id) {
    return { ok: false, error: "Card not found." };
  }
  await prisma.card.update({
    where: { id: cardId },
    data: { userId: null, claimedAt: null, label: "" },
  });
  revalidatePath("/dashboard/cards");
  return { ok: true };
}
