"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { buttonClass } from "@/components/ui";
import {
  AdminNewOrderPanel,
  type MaterialOption,
  type OrderableUser,
} from "@/components/admin/AdminNewOrderPanel";

/** "New card order" button + panel for the admin Cards page. */
export function NewOrderLauncher({
  users,
  materials,
  initialUserId,
}: {
  users: OrderableUser[];
  materials: MaterialOption[];
  initialUserId?: string;
}) {
  const [open, setOpen] = useState(Boolean(initialUserId));
  return (
    <>
      {!open && (
        <button type="button" onClick={() => setOpen(true)} className={buttonClass("primary", "md", "mb-6")}>
          <Icon name="add_card" className="text-[18px]" />
          New card order
        </button>
      )}
      {open && (
        <AdminNewOrderPanel
          users={users}
          materials={materials}
          initialUserId={initialUserId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
