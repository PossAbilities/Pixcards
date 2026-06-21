import "server-only";
import { SignJWT, importPKCS8 } from "jose";
import { theme as getTheme } from "@/lib/constants";
import { isGoogleWalletConfigured } from "./config";

export { isGoogleWalletConfigured };

function env(name: string): string {
  return process.env[name] || "";
}

/**
 * The service-account private key. We accept either a raw PEM (with real
 * newlines or escaped \n) or a base64-encoded PEM — whichever is easiest to
 * paste into the host's env UI.
 */
function privateKeyPem(): string {
  const raw = env("GOOGLE_WALLET_SA_KEY");
  if (raw.includes("BEGIN")) return raw.replace(/\\n/g, "\n");
  try {
    return Buffer.from(raw, "base64").toString("utf8");
  } catch {
    return raw;
  }
}

export type GoogleWalletInput = {
  serial: string; // unique per profile (cuid)
  name: string;
  jobTitle?: string;
  company?: string;
  themeId: string;
  profileUrl: string;
  logoUrl: string; // publicly fetchable PNG
  origin: string; // site origin for the JWT
};

/**
 * Build the "Add to Google Wallet" save link. The class + object are defined
 * inline in the signed JWT, so no Wallet API pre-provisioning is needed.
 */
export async function buildGoogleSaveUrl(
  input: GoogleWalletInput,
): Promise<string> {
  if (!isGoogleWalletConfigured()) {
    throw new Error("Google Wallet is not configured.");
  }

  const issuerId = env("GOOGLE_WALLET_ISSUER_ID");
  const saEmail = env("GOOGLE_WALLET_SA_EMAIL");
  const classId = `${issuerId}.pixcards_card`;
  const objectId = `${issuerId}.${input.serial}`;
  const t = getTheme(input.themeId);

  const textModules = [
    ...(input.jobTitle
      ? [{ id: "role", header: "Role", body: input.jobTitle }]
      : []),
    ...(input.company
      ? [{ id: "company", header: "Company", body: input.company }]
      : []),
  ];

  const genericClass = { id: classId };

  const genericObject = {
    id: objectId,
    classId,
    state: "ACTIVE",
    cardTitle: {
      defaultValue: { language: "en", value: "Pixcards" },
    },
    header: {
      defaultValue: { language: "en", value: input.name },
    },
    hexBackgroundColor: t.accent,
    logo: {
      sourceUri: { uri: input.logoUrl },
      contentDescription: {
        defaultValue: { language: "en", value: "Pixcards" },
      },
    },
    textModulesData: textModules,
    barcode: {
      type: "QR_CODE",
      value: input.profileUrl,
      alternateText: input.profileUrl.replace(/^https?:\/\//, ""),
    },
    linksModuleData: {
      uris: [{ uri: input.profileUrl, description: "View my Pixcards profile" }],
    },
  };

  const claims = {
    iss: saEmail,
    aud: "google",
    typ: "savetowallet",
    origins: [input.origin],
    payload: {
      genericClasses: [genericClass],
      genericObjects: [genericObject],
    },
  };

  const key = await importPKCS8(privateKeyPem(), "RS256");
  const jwt = await new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuedAt()
    .sign(key);

  return `https://pay.google.com/gp/v/save/${jwt}`;
}
