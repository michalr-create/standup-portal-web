import type { ReactNode } from "react";
import {
  cardActionKind,
  PAID_SHOP_LINK_CUE,
  PAID_UNAVAILABLE_LABEL,
  paidExternalUrl,
} from "@/lib/youtube";

const linkClass = "block text-left w-full";

/**
 * Unpaid cards stay a button (in-app player or the existing external fallback).
 * Paid cards with an http(s) url are a real link: new tab, no player.
 * Paid cards without one are disabled — no click that goes nowhere.
 */
export default function ContentCardAction({
  isPaid,
  url,
  onOpen,
  children,
}: {
  isPaid: boolean;
  url: string | null;
  onOpen: () => void;
  children: ReactNode;
}) {
  const kind = cardActionKind(isPaid, url);
  const href = kind === "shop" ? paidExternalUrl(url) : null;

  if (kind === "shop" && href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
        title={PAID_SHOP_LINK_CUE}
      >
        {children}
        <span className="sr-only">{PAID_SHOP_LINK_CUE}</span>
      </a>
    );
  }

  if (kind !== "inapp") {
    return (
      <button
        type="button"
        disabled
        className={`${linkClass} cursor-default disabled:opacity-100`}
        title={PAID_UNAVAILABLE_LABEL}
      >
        {children}
      </button>
    );
  }

  return (
    <button type="button" onClick={onOpen} className={linkClass}>
      {children}
    </button>
  );
}
