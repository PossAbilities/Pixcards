import "server-only";
import { PKPass } from "passkit-generator";
import { theme as getTheme } from "@/lib/constants";
import { ICON_PNG_BASE64, LOGO_PNG_BASE64 } from "./assets";
import { isWalletConfigured } from "./config";

export { isWalletConfigured };

function env(name: string): string {
  return process.env[name] || "";
}

function b64Env(name: string): Buffer {
  return Buffer.from(env(name), "base64");
}

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

export type WalletPassInput = {
  serial: string;
  name: string;
  jobTitle?: string;
  company?: string;
  themeId: string;
  profileUrl: string;
  thumbnail?: Buffer | null;
};

/** Build a signed .pkpass buffer for a profile. Throws if not configured. */
export async function buildWalletPass(input: WalletPassInput): Promise<Buffer> {
  if (!isWalletConfigured()) {
    throw new Error("Apple Wallet is not configured.");
  }

  const t = getTheme(input.themeId);
  const icon = Buffer.from(ICON_PNG_BASE64, "base64");
  const logo = Buffer.from(LOGO_PNG_BASE64, "base64");

  const secondaryFields = [
    ...(input.jobTitle
      ? [{ key: "role", label: "ROLE", value: input.jobTitle }]
      : []),
    ...(input.company
      ? [{ key: "company", label: "COMPANY", value: input.company }]
      : []),
  ];

  const passJson = {
    formatVersion: 1,
    passTypeIdentifier: env("APPLE_PASS_TYPE_ID"),
    teamIdentifier: env("APPLE_TEAM_ID"),
    organizationName: "Pixcards",
    description: `${input.name} — Pixcards digital card`,
    serialNumber: input.serial,
    logoText: "Pixcards",
    foregroundColor: "rgb(255, 255, 255)",
    labelColor: "rgba(255, 255, 255, 0.75)",
    backgroundColor: hexToRgb(t.accent),
    barcodes: [
      {
        format: "PKBarcodeFormatQR",
        message: input.profileUrl,
        messageEncoding: "iso-8859-1",
        altText: input.profileUrl.replace(/^https?:\/\//, ""),
      },
    ],
    generic: {
      primaryFields: [{ key: "name", label: "", value: input.name }],
      secondaryFields,
      backFields: [
        {
          key: "profile",
          label: "Profile",
          value: input.profileUrl,
        },
        {
          key: "about",
          label: "About",
          value:
            "Tap the link or scan the QR code to view this Pixcards digital business card.",
        },
      ],
    },
  };

  const files: Record<string, Buffer> = {
    "pass.json": Buffer.from(JSON.stringify(passJson)),
    "icon.png": icon,
    "icon@2x.png": icon,
    "logo.png": logo,
    "logo@2x.png": logo,
  };
  if (input.thumbnail && input.thumbnail.length > 0) {
    files["thumbnail.png"] = input.thumbnail;
    files["thumbnail@2x.png"] = input.thumbnail;
  }

  const pass = new PKPass(files, {
    wwdr: b64Env("APPLE_WWDR_CERT"),
    signerCert: b64Env("APPLE_PASS_CERT"),
    signerKey: b64Env("APPLE_PASS_KEY"),
    signerKeyPassphrase: env("APPLE_PASS_KEY_PASSWORD") || undefined,
  });

  return pass.getAsBuffer();
}
