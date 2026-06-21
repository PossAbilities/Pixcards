"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Icon } from "@/components/Icon";
import { buttonClass, inputClass, Label } from "@/components/ui";
import { deleteMyAccount, type DeleteState } from "@/lib/actions/account";

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={buttonClass("danger", "md")}
    >
      {pending ? (
        <>
          <Icon name="progress_activity" className="text-[18px] animate-spin" />
          Deleting…
        </>
      ) : (
        <>
          <Icon name="delete_forever" className="text-[18px]" />
          Permanently delete account
        </>
      )}
    </button>
  );
}

export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<DeleteState, FormData>(
    deleteMyAccount,
    undefined,
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ink">Delete account</p>
          <p className="mt-1 text-xs text-muted">
            Permanently erase your account, profile, orders and data. This cannot
            be undone.
          </p>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={buttonClass("outline", "md", "border-red-300 text-red-600 hover:bg-red-50")}
          >
            <Icon name="delete" className="text-[18px]" />
            Delete…
          </button>
        )}
      </div>

      {open && (
        <form
          action={formAction}
          className="mt-4 rounded-xl border border-red-200 bg-red-50/60 p-4"
        >
          <p className="text-sm font-medium text-red-800">
            This will immediately and permanently delete your account and all
            associated data. Enter your password to confirm.
          </p>
          <div className="mt-3">
            <Label htmlFor="del-password">Password</Label>
            <input
              id="del-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Your password"
              className={inputClass}
            />
          </div>
          {state?.error && (
            <p className="mt-2 text-sm font-medium text-red-600">{state.error}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <ConfirmButton />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={buttonClass("ghost", "md")}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
