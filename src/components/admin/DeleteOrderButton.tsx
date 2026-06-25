"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { buttonClass } from "@/components/ui";
import { deleteOrder } from "@/lib/actions/admin";

export function DeleteOrderButton({
  orderId,
  shortId,
}: {
  orderId: string;
  shortId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function remove() {
    if (
      !confirm(
        `Delete order #${shortId}? This removes the order and its un-encoded cards. This can't be undone.`,
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await deleteOrder(orderId);
      if (res.ok) router.push("/admin/orders");
      else setError(res.error ?? "Could not delete the order.");
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={remove}
        disabled={isPending}
        className={buttonClass("danger", "sm")}
      >
        <Icon name="delete" className="text-[16px]" />
        {isPending ? "Deleting…" : "Delete order"}
      </button>
      {error && <span className="text-sm font-medium text-red-600">{error}</span>}
    </div>
  );
}
