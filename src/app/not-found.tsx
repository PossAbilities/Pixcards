import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { StatusScreen } from "@/components/StatusScreen";
import { buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <StatusScreen
      icon="explore_off"
      title="Page not found"
      actions={
        <>
          <Link href="/" className={buttonClass("primary", "lg")}>
            <Icon name="home" className="text-[20px]" />
            Back to home
          </Link>
          <Link href="/support" className={buttonClass("outline", "lg")}>
            <Icon name="help" className="text-[20px]" />
            Get help
          </Link>
        </>
      }
    >
      <p>
        The page you&apos;re looking for doesn&apos;t exist or has moved. Check
        the address, or head back to the home page.
      </p>
    </StatusScreen>
  );
}
