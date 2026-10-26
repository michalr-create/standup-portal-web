export type ContentOpenTarget =
  | { type: "external"; url: string }
  | { type: "modal"; videoId: string };

/** Visible status on a paid thumb. "$" may sit in front; it is not the label. */
export const PAID_BADGE_LABEL = "Płatne";

/** Paid item whose url is missing or not http(s). */
export const PAID_UNAVAILABLE_LABEL = "Niedostępne";

/** Appended to the shop link's accessible name. */
export const PAID_SHOP_LINK_CUE = "Otwiera sklep w nowej karcie";

export type CardActionKind = "shop" | "unavailable" | "inapp";

/** Shop links only. Rejects empty values and non-http(s) URLs such as javascript:. */
export function paidExternalUrl(url: string | null): string | null {
  const trimmed = url?.trim() ?? "";
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return trimmed;
  } catch {
    return null;
  }
}

/**
 * Paid cards leave the site only when `url` is a real http(s) link.
 * Anything else paid is a non-action. Unpaid cards keep the in-app player.
 */
export function cardActionKind(isPaid: boolean, url: string | null): CardActionKind {
  if (!isPaid) return "inapp";
  return paidExternalUrl(url) ? "shop" : "unavailable";
}

/** A runtime on a paid thumb reads as "play this video". Paid cards are a shop. */
export function showThumbDuration(isPaid: boolean, seconds: number | null): boolean {
  return !isPaid && seconds != null;
}

/**
 * Paid items always leave the site, even when `url` is a YouTube link.
 * Unpaid YouTube links open the in-app player. Anything else opens externally.
 * Returns null when there is nowhere to send the click.
 */
export function resolveContentOpen(item: {
  is_paid: boolean;
  url: string | null;
}): ContentOpenTarget | null {
  if (item.is_paid) {
    const href = paidExternalUrl(item.url);
    return href ? { type: "external", url: href } : null;
  }
  const url = item.url?.trim() ?? "";
  if (!url) return null;
  const videoId = getYouTubeId(url);
  if (videoId) return { type: "modal", videoId };
  return { type: "external", url };
}

export function getYouTubeId(url: string): string | null {
  const patterns = [
    /[?&]v=([^&#]+)/,
    /youtu\.be\/([^?&#/]+)/,
    /youtube\.com\/shorts\/([^?&#/]+)/,
    /youtube\.com\/embed\/([^?&#/]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}
