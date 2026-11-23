import { PUBLIC_LISTING_PAGE_SIZE, clampListingPage } from "./category-browse.ts";

/** How many favorite items the home row asks for. */
export const FAVORITE_FEED_DEFAULT = 12;
/** Home row and the account carousel. The full catalog is /ulubione/tresci. */
export const FAVORITE_FEED_MAX = 48;
/** Safety cap for one side of the /ulubione/tresci catalog scan. */
export const FAVORITE_CATALOG_CAP = 4000;
/** Page size of that scan. The public grid still pages at 24. */
export const FAVORITE_CATALOG_PAGE = 1000;
/** Nearest rows in "Grają wkrótce w moim mieście" before the link to /trasy. */
export const ACCOUNT_SECTION_PREVIEW = 5;
/** Home "Do obejrzenia" row. Same cap as the other saved home row. */
export const WATCH_LATER_HOME_LIMIT = FAVORITE_FEED_DEFAULT;

/**
 * Saved order is newest-first. Keep that order and stop at the home-row cap.
 * Invalid ids are dropped. Duplicates stay once, at the first occurrence.
 */
export function homeWatchLaterIds(ids: readonly unknown[], limit = WATCH_LATER_HOME_LIMIT): number[] {
  const cap = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : WATCH_LATER_HOME_LIMIT;
  const out: number[] = [];
  const seen = new Set<number>();
  for (const value of ids) {
    const id =
      typeof value === "number" && Number.isSafeInteger(value) && value > 0
        ? value
        : typeof value === "string" && /^[1-9]\d*$/.test(value)
          ? Number(value)
          : null;
    if (id == null || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= cap) break;
  }
  return out;
}

/** Cards still on the list, in the saved order. Ids missing from `ids` drop out. */
export function orderWatchLaterItems<T extends { id: number }>(
  items: readonly T[],
  ids: readonly number[],
): T[] {
  const order = new Map(ids.map((id, index) => [id, index]));
  return items
    .filter((item) => item != null && order.has(item.id))
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

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

/**
 * One page of every favorite person's and show's videos, newest publication first.
 * A video tagged to two favorites stays once. A page past the end clamps to the last page.
 */
export function pageFavoriteFeed<T extends DatedFeedItem>(
  groups: readonly (readonly T[])[],
  page: number,
  pageSize = PUBLIC_LISTING_PAGE_SIZE,
): { items: T[]; total: number; page: number } {
  const size = Number.isFinite(pageSize) && pageSize >= 1 ? Math.floor(pageSize) : PUBLIC_LISTING_PAGE_SIZE;
  const merged = mergeFavoriteFeed(groups, Number.MAX_SAFE_INTEGER);
  const clamped = clampListingPage(Number.isFinite(page) ? page : 1, merged.length, size);
  const start = (clamped.page - 1) * size;
  return { items: merged.slice(start, start + size), total: merged.length, page: clamped.page };
}
