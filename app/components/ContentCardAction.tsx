import type { MouseEvent, ReactNode } from "react";
import { isPublicContentSlug } from "@/lib/slugify";
import {
  cardActionKind,
  isPlainLeftClick,
  PAID_SHOP_LINK_CUE,
  PAID_UNAVAILABLE_LABEL,
  paidExternalUrl,
} from "@/lib/youtube";

const linkClass = "block text-left w-full";

/**
 * Unpaid cards without a special slug stay a button (in-app player).
 * A free special is a real link to `/specjale/{slug}`: left click still opens the modal,
 * and middle-click, new tab, and Googlebot follow the href.
 * Paid cards with an http(s) url stay a shop link. Paid cards without one are disabled.
 */
export default function ContentCardAction({
  isPaid,
  url,
  slug,
  onOpen,
  children,
}: {
  isPaid: boolean;
  url: string | null;
  slug?: string | null;
  onOpen: () => void;
  children: ReactNode;
}) {
  const kind = cardActionKind(isPaid, url);
  const href = kind === "shop" ? paidExternalUrl(url) : null;
  const pageHref = slug && isPublicContentSlug(slug) ? `/specjale/${slug}` : null;

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

  if (pageHref) {
    const openModal = (event: MouseEvent<HTMLAnchorElement>) => {
      if (!isPlainLeftClick(event)) return;
      event.preventDefault();
      onOpen();
    };
    return (
      <a href={pageHref} className={linkClass} onClick={openModal}>
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
