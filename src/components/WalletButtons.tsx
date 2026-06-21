import { AddToWallet } from "@/components/AddToWallet";
import { AddToGoogleWallet } from "@/components/AddToGoogleWallet";

/** Renders whichever wallet buttons are enabled, side by side. */
export function WalletButtons({
  username,
  apple,
  google,
}: {
  username: string;
  apple: boolean;
  google: boolean;
}) {
  if (!apple && !google) return null;
  return (
    <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
      {apple && <AddToWallet username={username} />}
      {google && <AddToGoogleWallet username={username} />}
    </div>
  );
}
