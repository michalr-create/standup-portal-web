"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import type { ReactNode } from "react";

function PendingMark() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span data-link-pending="true" className="ml-auto inline-flex shrink-0 items-center gap-2">
      <span className="sr-only">{"\u0141adowanie"}</span>
      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
    </span>
  );
}

/** Link that prefetches and paints a spinner while the navigation is pending. The marker must stay inside the link so useLinkStatus can see it. */
export default function PendingLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} prefetch={true} className={className}>
      {children}
      <PendingMark />
    </Link>
  );
}
