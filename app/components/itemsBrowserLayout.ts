export type ItemsBrowserVariant = "default" | "shorts";

export const DEFAULT_THUMB_ASPECT = "16/10";
export const SHORTS_THUMB_ASPECT = "9/16";

export const DEFAULT_GRID_CLASS =
  "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5";

/** Phones get two portrait columns; sm and up match the default listing. */
export const SHORTS_GRID_CLASS =
  "grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5";

type Slugged = { categorySlug: string | null };

/**
 * Shorts listings use a portrait grid. An explicit variant wins; otherwise
 * the grid switches only when every item is in the shorts category, so mixed
 * pages (standup, roast, search) keep the landscape layout.
 */
export function resolveItemsBrowserVariant(
  items: Slugged[],
  variant?: ItemsBrowserVariant,
): ItemsBrowserVariant {
  if (variant === "shorts" || variant === "default") return variant;
  if (items.length > 0 && items.every((item) => item.categorySlug === "shorts")) {
    return "shorts";
  }
  return "default";
}
