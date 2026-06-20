import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Icon } from "@/components/Icon";
import { buttonClass } from "@/components/ui";

export default function CardNotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4">
      <div className="flex max-w-md flex-col items-center text-center">
        <Logo />
        <div className="mt-10 grid h-20 w-20 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Icon name="search_off" className="text-[40px]" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-extrabold text-ink">
          Card not found
        </h1>
        <p className="mt-3 text-muted">
          This Pixcard doesn&apos;t exist or has been unpublished.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/" className={buttonClass("outline", "lg")}>
            <Icon name="home" className="text-[20px]" />
            Back to home
          </Link>
          <Link href="/register" className={buttonClass("primary", "lg")}>
            <Icon name="add_card" className="text-[20px]" />
            Create your card
          </Link>
        </div>
      </div>
    </main>
  );
}
