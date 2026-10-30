export type CategoryBrowseFilters = {
  osoba?: string;
  tag?: string;
  q?: string;
  page?: number;
};

export type CategoryBrowseSearch = {
  page?: string | string[];
  osoba?: string | string[];
  tag?: string | string[];
  q?: string | string[];
};

export type ParsedCategoryBrowse = {
  page: number;
  osoba: string;
  tag: string;
  q: string;
  redirectHref: string | null;
};

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_QUERY = 120;

/** One page size for public listings: standup, categories, format, specjale, trasy. */
export const PUBLIC_LISTING_PAGE_SIZE = 24;

function normalizePageSize(pageSize: number): number {
  if (!Number.isFinite(pageSize) || pageSize < 1) return PUBLIC_LISTING_PAGE_SIZE;
  return Math.floor(pageSize);
}

/** Empty catalogs still have a single page, so a high ?page= can clamp back to it. */
export function listingTotalPages(total: number, pageSize = PUBLIC_LISTING_PAGE_SIZE): number {
  const size = normalizePageSize(pageSize);
  if (!Number.isFinite(total) || total <= 0) return 1;
  return Math.ceil(total / size);
}

/**
 * Page to render or redirect to. A request past the end lands on the last
 * page (page 1 when nothing matches), matching /standup and /trasy.
 */
export function clampListingPage(
  page: number,
  total: number,
  pageSize = PUBLIC_LISTING_PAGE_SIZE,
): { page: number; totalPages: number } {
  const totalPages = listingTotalPages(total, pageSize);
  const requested = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
  return {
    page: requested > totalPages ? totalPages : requested,
    totalPages,
  };
}

export function listingPageHref(pathname: string, page: number): string {
  if (!Number.isFinite(page) || page <= 1) return pathname;
  return `${pathname}?page=${Math.floor(page)}`;
}

/** Canonical ?page= for listings that have no other query filters. */
export function parseListingPage(
  raw: string | string[] | undefined,
  pathname: string,
): { page: number; redirectHref: string | null } {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const page = parseBrowsePage(raw);
  if (page == null || (value != null && value !== "" && page === 1)) {
    return { page: 1, redirectHref: pathname };
  }
  return { page, redirectHref: null };
}

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function canonicalizeSlug(raw: string | undefined): { value: string; changed: boolean } {
  if (raw == null || raw === "") return { value: "", changed: false };
  const trimmed = raw.trim().toLowerCase();
  if (!SLUG.test(trimmed)) return { value: "", changed: true };
  return { value: trimmed, changed: trimmed !== raw };
}

function canonicalizeQuery(raw: string | undefined): { value: string; changed: boolean } {
  if (raw == null || raw === "") return { value: "", changed: false };
  const trimmed = raw.trim().replace(/\s+/g, " ").slice(0, MAX_QUERY);
  return { value: trimmed, changed: trimmed !== raw };
}

export function categoryBrowseHref(pathname: string, filters: CategoryBrowseFilters = {}): string {
  const params = new URLSearchParams();
  const osoba = filters.osoba?.trim() ?? "";
  const tag = filters.tag?.trim() ?? "";
  const q = filters.q?.trim() ?? "";
  const page = filters.page ?? 1;
  if (osoba) params.set("osoba", osoba);
  if (tag) params.set("tag", tag);
  if (q) params.set("q", q);
  if (Number.isFinite(page) && page > 1) params.set("page", String(Math.floor(page)));
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function parseBrowsePage(raw: string | string[] | undefined): number | null {
  const value = first(raw);
  if (value == null || value === "") return 1;
  if (!/^[1-9]\d{0,4}$/.test(value)) return null;
  return Number(value);
}

export function parseCategoryBrowseSearchParams(
  raw: CategoryBrowseSearch,
  pathname: string,
): ParsedCategoryBrowse {
  const pageRaw = first(raw.page);
  const page = parseBrowsePage(pageRaw);
  const osoba = canonicalizeSlug(first(raw.osoba));
  const tag = canonicalizeSlug(first(raw.tag));
  const q = canonicalizeQuery(first(raw.q));

  const pageNeedsRedirect = page == null || (pageRaw != null && pageRaw !== "" && page === 1);
  const safePage = page != null && page > 1 ? page : 1;
  const filters = {
    osoba: osoba.value,
    tag: tag.value,
    q: q.value,
    page: safePage,
  };

  const redirectHref =
    pageNeedsRedirect || osoba.changed || tag.changed || q.changed
      ? categoryBrowseHref(pathname, filters)
      : null;

  return {
    page: safePage,
    osoba: osoba.value,
    tag: tag.value,
    q: q.value,
    redirectHref,
  };
}
