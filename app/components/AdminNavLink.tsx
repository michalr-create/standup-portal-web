"use client";

import Link from "next/link";
import { ADMIN_NAV_LABEL, showAdminNav } from "@/lib/admin-surface";
import { useAdminMode } from "./AdminMode";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]";

export default function AdminNavLink({
  variant = "nav",
  onNavigate,
}: {
  variant?: "nav" | "drawer";
  onNavigate?: () => void;
}) {
  const { isAdmin } = useAdminMode();
  if (!showAdminNav(isAdmin)) return null;

  if (variant === "drawer") {
    return (
      <Link
        href="/admin"
        data-admin-nav=""
        onClick={onNavigate}
        className={`flex min-h-11 items-center rounded-lg px-3 py-3 text-sm font-semibold hover:bg-[var(--ink-3)] ${focusRing}`}
        style={{ color: "var(--coral)" }}
      >
        {ADMIN_NAV_LABEL}
      </Link>
    );
  }

  return (
    <Link
      href="/admin"
      data-admin-nav=""
      className={`hidden lg:inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm font-semibold hover:bg-[var(--ink-3)] ${focusRing}`}
      style={{ color: "var(--coral)" }}
    >
      {ADMIN_NAV_LABEL}
    </Link>
  );
}
