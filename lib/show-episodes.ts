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
export type EpisodeShowLink = {
  showId: number | null;
  sourceId: number | null;
};

export type EpisodeSourceShow = {
  id: number;
  showId: number | null;
};

/**
 * Slugs of shows that have at least one episode, in `shows` order.
 * An episode counts when its `show_id` is the show, or its source belongs to the show.
 * The caller already drops shorts, unapproved rows, and merges — same rules as the format page.
 */
export function showSlugsWithEpisodes(
  shows: readonly { id: number; slug: string }[],
  episodes: readonly EpisodeShowLink[],
  sources: readonly EpisodeSourceShow[],
): string[] {
  const sourceShow = new Map<number, number>();
  for (const source of sources) {
    if (source.showId != null) sourceShow.set(source.id, source.showId);
  }
  const withEpisodes = new Set<number>();
  for (const episode of episodes) {
    if (episode.showId != null) withEpisodes.add(episode.showId);
    if (episode.sourceId != null) {
      const viaSource = sourceShow.get(episode.sourceId);
      if (viaSource != null) withEpisodes.add(viaSource);
    }
  }
  const slugs: string[] = [];
  const seen = new Set<string>();
  for (const show of shows) {
    const slug = show.slug.trim();
    if (!slug || seen.has(slug) || !withEpisodes.has(show.id)) continue;
    seen.add(slug);
    slugs.push(slug);
  }
  return slugs;
}

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
