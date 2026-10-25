export type TagChipClick =
  | { type: "ignore" }
  | { type: "navigate"; tag: string; pendingChipSlug: string };

/**
 * One in-flight tag navigation at a time.
 * Repeat clicks on the chip that started it are ignored so a slow server
 * render cannot be toggled on and off by extra taps. A different chip replaces
 * the in-flight choice.
 */
export function tagChipClick(
  pendingChipSlug: string | null,
  activeTag: string,
  clickedSlug: string,
): TagChipClick {
  if (pendingChipSlug === clickedSlug) return { type: "ignore" };
  const tag = activeTag === clickedSlug ? "" : clickedSlug;
  return { type: "navigate", tag, pendingChipSlug: clickedSlug };
}

export function serverFilterKey(filters: {
  personSlug: string;
  tagSlug: string;
  search: string;
}): string {
  return JSON.stringify([filters.personSlug, filters.tagSlug, filters.search]);
}

/** Drop the chip lock once the server-rendered filters have changed. */
export function pendingTagAfterServerFilters(
  pendingChipSlug: string | null,
  previousKey: string,
  nextKey: string,
): string | null {
  if (previousKey !== nextKey) return null;
  return pendingChipSlug;
}
