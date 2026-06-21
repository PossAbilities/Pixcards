import { FaGoogle } from "react-icons/fa6";
import { cn } from "@/lib/utils";

/**
 * "Add to Google Wallet" button. Links to the per-profile route which signs a
 * save JWT and redirects to pay.google.com. Show only when configured.
 */
export function AddToGoogleWallet({
  username,
  className,
}: {
  username: string;
  className?: string;
}) {
  return (
    <a
      href={`/api/wallet/google/${username}`}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-white transition-transform hover:-translate-y-0.5 active:scale-[0.98]",
        className,
      )}
    >
      <FaGoogle className="text-[20px]" />
      <span className="flex flex-col items-start leading-none">
        <span className="text-[10px] font-medium opacity-80">Add to</span>
        <span className="text-base font-semibold -mt-0.5">Google Wallet</span>
      </span>
    </a>
  );
}
