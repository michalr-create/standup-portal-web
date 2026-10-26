/** Shorts category in this database (categories.slug = "shorts"). */
export const HOME_NOWE_SHORTS_CATEGORY_ID = 4;

/** Substring of a YouTube Shorts URL. Matched case-insensitively. */
export const HOME_NOWE_SHORTS_URL_MATCH = "/shorts/";

/**
 * Homepage „Nowe” hides the Shorts category and any YouTube Shorts link,
 * including clips that were filed under another category (for example Roast).
 */
export function isExcludedFromHomeNowe(item: {
  category_id: number | null;
  url: string | null;
}): boolean {
  if (item.category_id === HOME_NOWE_SHORTS_CATEGORY_ID) return true;
  return (item.url ?? "").toLowerCase().includes(HOME_NOWE_SHORTS_URL_MATCH);
}
