export type ContentOpenTarget =
  | { type: "external"; url: string }
  | { type: "modal"; videoId: string };

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
