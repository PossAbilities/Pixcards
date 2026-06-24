import "server-only";
import { PKPass } from "passkit-generator";
import forge from "node-forge";
import { theme as getTheme } from "@/lib/constants";
import { ICON_PNG_BASE64, LOGO_PNG_BASE64 } from "./assets";
import { isWalletConfigured } from "./config";

export { isWalletConfigured };

function env(name: string): string {
  return process.env[name] || "";
}

/** Wrap base64-encoded DER certificate bytes into a PEM string. */
function derBase64ToPem(b64: string): string {
  const clean = b64.replace(/\s+/g, "");
  const lines = clean.match(/.{1,64}/g)?.join("\n") ?? clean;
  return `-----BEGIN CERTIFICATE-----\n${lines}\n-----END CERTIFICATE-----\n`;
}

/** Extract the signer cert + private key (as PEM) from a base64 .p12 bundle. */
function loadSignerFromP12(
  p12Base64: string,
  password: string,
): { cert: string; key: string } {
  const der = forge.util.decode64(p12Base64.replace(/\s+/g, ""));
  let p12;
  try {
    p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(der), password);
  } catch {
    throw new Error(
      "Could not open the Apple Wallet certificate — check APPLE_PASS_CERT_PASSWORD matches the .p12 password.",
    );
  }

  const keyBags =
    p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[
      forge.pki.oids.pkcs8ShroudedKeyBag
    ] ?? [];
  const certBags =
    p12.getBags({ bagType: forge.pki.oids.certBag })[
      forge.pki.oids.certBag
    ] ?? [];

  const keyObj = keyBags[0]?.key;
  // Prefer the leaf (non-CA) certificate if the bundle carries a chain.
  const certObj =
    certBags.find((b) => {
      const bc = b.cert?.getExtension("basicConstraints") as
        | { cA?: boolean }
        | undefined;
      return !bc?.cA;
    })?.cert ?? certBags[0]?.cert;

  if (!keyObj || !certObj) {
    throw new Error("Apple Wallet .p12 is missing a certificate or private key.");
  }
  return {
    cert: forge.pki.certificateToPem(certObj),
    key: forge.pki.privateKeyToPem(keyObj),
  };
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
    // Apple Wallet only accepts #hex or rgb() — rgba() fails validation.
    labelColor: "rgb(225, 225, 235)",
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

  const { cert, key } = loadSignerFromP12(
    env("APPLE_PASS_CERT_BASE64"),
    env("APPLE_PASS_CERT_PASSWORD"),
  );

  const pass = new PKPass(files, {
    wwdr: derBase64ToPem(env("APPLE_WWDR_BASE64")),
    signerCert: cert,
    signerKey: key,
  });

  return pass.getAsBuffer();
}
