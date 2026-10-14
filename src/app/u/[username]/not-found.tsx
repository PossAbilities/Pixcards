import Link from "next/link";
import { Icon } from "@/components/Icon";
import { StatusScreen } from "@/components/StatusScreen";
import { buttonClass } from "@/components/ui";

export default function CardNotFound() {
  return (
    <StatusScreen
      icon="search_off"
      title="Card not found"
      actions={
        <>
          <Link href="/" className={buttonClass("outline", "lg")}>
            <Icon name="home" className="text-[20px]" />
            Back to home
          </Link>
          <Link href="/register" className={buttonClass("primary", "lg")}>
            <Icon name="add_card" className="text-[20px]" />
            Create your own card
          </Link>
        </>
      }
    >
      <p>This card doesn&apos;t exist, or its owner has unpublished it.</p>
    </StatusScreen>
  );
}
