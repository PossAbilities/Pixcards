// Helpers for NFC card codes + tap URLs.
import { appUrl } from "./constants";

// Unambiguous alphabet — no 0/O/1/I/L so codes are easy to read off a card.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

/** Generate a random card code like "K7QP4M2T". */
export function generateCardCode(): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

/** Normalise a user-typed code (uppercase, strip spaces/hyphens). */
export function normaliseCardCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** The URL written onto the NFC chip / encoded in the QR fallback. */
export function cardTapUrl(code: string): string {
  return `${appUrl()}/c/${code}`;
}
