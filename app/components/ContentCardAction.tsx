import type { ReactNode } from "react";
import { paidExternalUrl } from "@/lib/youtube";

const linkClass = "block text-left w-full";

/**
 * Unpaid cards stay a button (in-app player or the existing external fallback).
 * Paid cards are a real link: new tab, no player.
 */
export default function ContentCardAction({
  isPaid,
  url,
  onOpen,
  children,
}: {
  isPaid: boolean;
  url: string;
  onOpen: () => void;
  children: ReactNode;
}) {
  const href = isPaid ? paidExternalUrl(url) : null;
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
        {children}
      </a>
    );
  }

  return (
    <button type="button" onClick={onOpen} className={linkClass}>
      {children}
    </button>
  );
}
