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

export type WalletStrip = { x1: Buffer; x2: Buffer; x3: Buffer };

export type WalletPassInput = {
  serial: string;
  name: string;
  jobTitle?: string;
  company?: string;
  themeId: string;
  profileUrl: string;
  email?: string;
  phone?: string;
  thumbnail?: Buffer | null;
  /** Card-front artwork as a Wallet strip — turns the pass into a branded
   *  storeCard that mirrors the printed card. */
  strip?: WalletStrip | null;
  /** Brand background colour (hex) — the card's, when a strip is supplied. */
  backgroundHex?: string | null;
  /** The user's own logo (paid white-label) — replaces the Pixcards logo. */
  brandLogo?: Buffer | null;
  /** Paid AND has a logo → drop the "Pixcards" wordmark for a white-label pass. */
  whiteLabel?: boolean;
};

/** Build a signed .pkpass buffer for a profile. Throws if not configured. */
export async function buildWalletPass(input: WalletPassInput): Promise<Buffer> {
  if (!isWalletConfigured()) {
    throw new Error("Apple Wallet is not configured.");
  }

  const t = getTheme(input.themeId);
  const icon = Buffer.from(ICON_PNG_BASE64, "base64");
  const logo = Buffer.from(LOGO_PNG_BASE64, "base64");

  // Front is deliberately minimal — brand banner + name only. Role, company
  // and the scannable QR were removed for a slicker card; contact details live
  // on the back of the pass.
  const nameFields = [{ key: "name", label: "", value: input.name }];

  const backFields = [
    { key: "profile", label: "Profile", value: input.profileUrl },
    ...(input.email
      ? [{ key: "email", label: "Email", value: input.email }]
      : []),
    ...(input.phone
      ? [{ key: "phone", label: "Phone", value: input.phone }]
      : []),
    {
      key: "about",
      label: "About",
      value:
        "Tap the link or scan the QR code to view this Pixcards digital business card.",
    },
  ];

  const useStrip = Boolean(input.strip);
  const bg = input.backgroundHex && /^#[0-9a-fA-F]{6}$/.test(input.backgroundHex)
    ? hexToRgb(input.backgroundHex)
    : hexToRgb(t.accent);

  // The name sits below the brand banner (storeCard) or as the headline of the
  // plain pass (generic). No secondary fields — kept clean.
  // storeCard draws primaryFields OVER the strip image, so the name must NOT be
  // a primary field (it would overlay the brand banner). Put it below the strip
  // as a secondary field. The plain generic pass has no strip, so name stays
  // the headline there.
  const style = useStrip
    ? {
        storeCard: {
          headerFields: [],
          primaryFields: [],
          secondaryFields: nameFields,
          backFields,
        },
      }
    : {
        generic: {
          primaryFields: nameFields,
          secondaryFields: [],
          backFields,
        },
      };

  const passJson = {
    formatVersion: 1,
    passTypeIdentifier: env("APPLE_PASS_TYPE_ID"),
    teamIdentifier: env("APPLE_TEAM_ID"),
    // Paid + logo → white-label: drop the "Pixcards" org/logo text.
    organizationName: input.whiteLabel && input.company ? input.company : "Pixcards",
    description: `${input.name} — digital business card`,
    serialNumber: input.serial,
    ...(input.whiteLabel ? {} : { logoText: "Pixcards" }),
    foregroundColor: "rgb(255, 255, 255)",
    // Apple Wallet only accepts #hex or rgb() — rgba() fails validation.
    labelColor: "rgb(225, 225, 235)",
    backgroundColor: bg,
    // Scannable QR to the profile. Apple renders this in its own white panel
    // (its colour can't be changed). No altText → no URL caption under it, for
    // a slightly cleaner look.
    barcodes: [
      {
        format: "PKBarcodeFormatQR",
        message: input.profileUrl,
        messageEncoding: "iso-8859-1",
      },
    ],
    ...style,
  };

  const files: Record<string, Buffer> = {
    "pass.json": Buffer.from(JSON.stringify(passJson)),
    "icon.png": icon,
    "icon@2x.png": icon,
  };
  // Logo: the user's own logo when supplied (white-label); otherwise the
  // Pixcards wordmark — unless white-label with no logo, in which case no logo.
  const ownLogo =
    input.brandLogo && input.brandLogo.length > 0 ? input.brandLogo : null;
  if (ownLogo) {
    files["logo.png"] = ownLogo;
    files["logo@2x.png"] = ownLogo;
  } else if (!input.whiteLabel) {
    files["logo.png"] = logo;
    files["logo@2x.png"] = logo;
  }
  if (input.strip) {
    files["strip.png"] = input.strip.x1;
    files["strip@2x.png"] = input.strip.x2;
    files["strip@3x.png"] = input.strip.x3;
  } else if (input.thumbnail && input.thumbnail.length > 0) {
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
