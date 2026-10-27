/** Homepage Polecane. Newest `featured_at` stays; the oldest featured row drops off. */
export const HOME_FEATURED_LIMIT = 5;

export type FeaturedStamp = {
  id: number;
  featuredAt: string | null;
  publishedAt?: string | null;
};

function stampTime(value: string | null | undefined): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : Number.NEGATIVE_INFINITY;
}

/**
 * Rolling window for Polecane. Highest `featuredAt` first, then `publishedAt`,
 * then id. Does not mutate `items`.
 */
export function selectFeaturedWindow<T extends FeaturedStamp>(
  items: readonly T[],
  limit = HOME_FEATURED_LIMIT,
): T[] {
  const cap = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : HOME_FEATURED_LIMIT;
  return [...items]
    .sort((a, b) => {
      const featured = stampTime(b.featuredAt) - stampTime(a.featuredAt);
      if (featured !== 0) return featured;
      const published = stampTime(b.publishedAt) - stampTime(a.publishedAt);
      if (published !== 0) return published;
      return b.id - a.id;
    })
    .slice(0, cap);
}

/**
 * Ids to unfeature so `incoming` fits in the window.
 * The incoming row is kept when it is among the newest `limit` stamps.
 */
export function featuredIdsToClear(
  currentlyFeatured: readonly FeaturedStamp[],
  incoming: FeaturedStamp,
  limit = HOME_FEATURED_LIMIT,
): number[] {
  const next = [
    ...currentlyFeatured.filter((row) => row.id !== incoming.id),
    incoming,
  ];
  const kept = new Set(selectFeaturedWindow(next, limit).map((row) => row.id));
  return next.filter((row) => !kept.has(row.id)).map((row) => row.id);
}
