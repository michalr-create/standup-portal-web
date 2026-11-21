/** How many favorite items the home row asks for. */
export const FAVORITE_FEED_DEFAULT = 12;
/** Account page "Pokaż wszystkie" cap. Each side is queried up to this, then merged. */
export const FAVORITE_FEED_MAX = 48;
/** Collapsed "Grają wkrótce" and "Najnowsze treści w Ulubione". */
export const ACCOUNT_SECTION_PREVIEW = 5;
/** Home "Do obejrzenia" row. The rest stays on the account. */
export const WATCH_LATER_HOME_LIMIT = 12;

export function clampFavoriteFeedLimit(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^[1-9]\d*$/.test(value.trim())
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(parsed) || parsed < 1) return FAVORITE_FEED_DEFAULT;
  return Math.min(FAVORITE_FEED_MAX, Math.floor(parsed));
}

export function accountPreview<T>(
  items: readonly T[],
  showAll: boolean,
  preview = ACCOUNT_SECTION_PREVIEW,
): readonly T[] {
  if (showAll) return items;
  const count = Number.isFinite(preview) ? Math.max(0, Math.floor(preview)) : ACCOUNT_SECTION_PREVIEW;
  return items.slice(0, count);
}

export type DatedFeedItem = {
  id: number;
  published_at: string | null;
};

function publishedTime(value: string | null): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
}

/**
 * One date order for every favorite person and every favorite show.
 * Duplicate ids (a video tagged with two favorites) stay once.
 * Null or broken dates sink to the end.
 */
export function mergeFavoriteFeed<T extends DatedFeedItem>(
  groups: readonly (readonly T[])[],
  limit: number,
): T[] {
  const cap = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0;
  const seen = new Set<number>();
  const merged: T[] = [];
  for (const group of groups) {
    for (const item of group) {
      if (item == null || typeof item.id !== "number" || seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
    }
  }
  merged.sort((a, b) => {
    const delta = publishedTime(b.published_at) - publishedTime(a.published_at);
    return delta !== 0 ? delta : b.id - a.id;
  });
  return merged.slice(0, cap);
}
