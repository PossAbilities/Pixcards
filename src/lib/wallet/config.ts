import "server-only";

/**
 * True only when every Apple Wallet credential is present. Uses a single .p12
 * bundle (cert + private key) exported from Keychain, plus the WWDR cert. The
 * .p12 password is required too — without it the certificate can't be unlocked
 * and pass generation fails.
 */
export function isWalletConfigured(): boolean {
  return appleWalletMissing().length === 0;
}

/** Names of any missing Apple Wallet env vars (empty = fully configured). */
export function appleWalletMissing(): string[] {
  return [
    "APPLE_PASS_TYPE_ID",
    "APPLE_TEAM_ID",
    "APPLE_PASS_CERT_BASE64",
    "APPLE_PASS_CERT_PASSWORD",
    "APPLE_WWDR_BASE64",
  ].filter((k) => !process.env[k]?.trim());
}

/** True only when every Google Wallet credential is present. */
export function isGoogleWalletConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_WALLET_ISSUER_ID &&
      process.env.GOOGLE_WALLET_SA_EMAIL &&
      process.env.GOOGLE_WALLET_SA_KEY,
  );
}
