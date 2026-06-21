import "server-only";

/**
 * True only when every Apple Wallet credential is present. Uses a single .p12
 * bundle (cert + private key) exported from Keychain, plus the WWDR cert.
 */
export function isWalletConfigured(): boolean {
  return Boolean(
    process.env.APPLE_PASS_TYPE_ID &&
      process.env.APPLE_TEAM_ID &&
      process.env.APPLE_PASS_CERT_BASE64 &&
      process.env.APPLE_WWDR_BASE64,
  );
}

/** True only when every Google Wallet credential is present. */
export function isGoogleWalletConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_WALLET_ISSUER_ID &&
      process.env.GOOGLE_WALLET_SA_EMAIL &&
      process.env.GOOGLE_WALLET_SA_KEY,
  );
}
