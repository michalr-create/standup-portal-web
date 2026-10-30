export type EpisodeStamp = {
  id: number;
  published_at: string | null;
};

/** Newest published_at first. Missing dates go last. Same timestamp: higher id first. */
export function compareEpisodesDesc(a: EpisodeStamp, b: EpisodeStamp): number {
  const byDate = (b.published_at ?? "").localeCompare(a.published_at ?? "");
  if (byDate !== 0) return byDate;
  return b.id - a.id;
}

/** Union of show_id rows and source rows. One card per content item. */
export function mergeShowEpisodes<T extends EpisodeStamp>(...groups: readonly (readonly T[])[]): T[] {
  const seen = new Set<number>();
  const merged: T[] = [];
  for (const group of groups) {
    for (const item of group) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
    }
  }
  merged.sort(compareEpisodesDesc);
  return merged;
}

/**
 * Window of an already merged, newest-first episode list.
 * `total` is the full show, including rows outside this window.
 */
export function pageShowEpisodes<T>(
  episodes: readonly T[],
  offset: number,
  limit: number,
): { episodes: T[]; total: number } {
  const total = episodes.length;
  const start = Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0;
  const size = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 1;
  return { episodes: episodes.slice(start, start + size), total };
}
