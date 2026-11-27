/**
 * Public path segment. Shared with person and show slugs in `lib/seo.ts`.
 * New content slugs also reject the reserved words below.
 */
export const PUBLIC_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Exact slugs that must not become `/specjale/{slug}`.
 * `dodaj` and `page` collide with actions and pagination; the rest are easy to confuse with site routes.
 */
export const RESERVED_CONTENT_SLUGS = [
  "2026",
  "admin",
  "api",
  "dodaj",
  "feed",
  "index",
  "najlepsze",
  "page",
  "robots",
  "rss",
  "sitemap",
  "za-darmo",
] as const;

const RESERVED = new Set<string>(RESERVED_CONTENT_SLUGS);

/** Manual duplicate of YouTube `22YkF1zr_nk`. The canonical row is 3102. Do not publish a page. */
export const EXCLUDED_SPECIAL_ITEM_ID = 47;

export function isExcludedSpecialItem(id: number): boolean {
  return id === EXCLUDED_SPECIAL_ITEM_ID;
}

/**
 * ASCII slug. `ł` / `Ł` become `l` before NFD, because `ł` does not decompose.
 * Empty input returns `""`. Callers decide whether that is usable.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** A slug that can be stored on `content_items` and published at `/specjale/{slug}`. */
export function isPublicContentSlug(slug: string): boolean {
  return PUBLIC_SLUG.test(slug) && !RESERVED.has(slug);
}

/**
 * Slug for one content row. Collision suffix is the canonical row id.
 * Reserved and empty bases fall through to `{base}-{id}` or `{id}`.
 * Returns null for the excluded duplicate row and when every candidate is taken.
 * Never pass a cleaned display title here — the raw `title` is the source.
 */
export function allocateContentSlug(
  title: string,
  id: number,
  taken: Iterable<string>,
): string | null {
  if (!Number.isSafeInteger(id) || id <= 0 || id === EXCLUDED_SPECIAL_ITEM_ID) return null;
  const used = new Set(taken);
  const base = slugify(title);
  if (isPublicContentSlug(base) && !used.has(base)) return base;
  const suffixed = isPublicContentSlug(base) ? `${base}-${id}` : "";
  if (suffixed && isPublicContentSlug(suffixed) && !used.has(suffixed)) return suffixed;
  const idSlug = String(id);
  if (isPublicContentSlug(idSlug) && !used.has(idSlug)) return idSlug;
  return null;
}
