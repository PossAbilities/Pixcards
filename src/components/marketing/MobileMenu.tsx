"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { buttonClass } from "@/components/ui";

const NAV = [
  { href: "/#features", label: "Features" },
  { href: "/#how", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
];

export function MobileMenu({
  authed,
  dashboardHref,
}: {
  authed: boolean;
  dashboardHref: string;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Escape closes the menu and puts focus back on the toggle.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((v) => !v)}
        className="grid place-items-center w-11 h-11 rounded-lg text-ink hover:bg-surface-high/60 transition-colors"
      >
        <Icon name={open ? "close" : "menu"} className="text-[26px]" />
      </button>

      {open && (
        <>
          <div
            aria-hidden="true"
            className="fixed inset-0 top-20 bg-black/20 z-40"
            onClick={() => setOpen(false)}
          />
          <nav
            id="mobile-menu"
            aria-label="Main"
            className="absolute left-0 right-0 top-20 z-50 bg-surface border-b border-black/5 shadow-lg p-4 flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="px-3 py-3 rounded-lg text-base font-semibold text-ink hover:bg-surface-high/60 transition-colors"
              >
                {item.label}
              </Link>
            ))}
            <div className="h-px bg-black/5 my-2" />
            {authed ? (
              <Link
                href={dashboardHref}
                onClick={() => setOpen(false)}
                className={buttonClass("primary", "lg", "w-full")}
              >
                Go to dashboard
              </Link>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className={buttonClass("outline", "lg", "w-full")}
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setOpen(false)}
                  className={buttonClass("primary", "lg", "w-full")}
                >
                  Create an account
                </Link>
              </div>
            )}
          </nav>
        </>
      )}
    </div>
  );
}
