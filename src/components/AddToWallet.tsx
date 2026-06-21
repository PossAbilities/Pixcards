import { FaApple } from "react-icons/fa6";
import { cn } from "@/lib/utils";

/**
 * "Add to Apple Wallet" button. Renders a download link to the per-profile
 * pass route. Show it only when wallet passes are configured (pass `enabled`).
 */
export function AddToWallet({
  username,
  className,
}: {
  username: string;
  className?: string;
}) {
  return (
    <a
      href={`/api/wallet/${username}`}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-white transition-transform hover:-translate-y-0.5 active:scale-[0.98]",
        className,
      )}
    >
      <FaApple className="text-[22px]" />
      <span className="flex flex-col items-start leading-none">
        <span className="text-[10px] font-medium opacity-80">Add to</span>
        <span className="text-base font-semibold -mt-0.5">Apple Wallet</span>
      </span>
    </a>
  );
}
