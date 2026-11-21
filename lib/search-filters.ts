import { clampListingPage, parseBrowsePage } from "./category-browse.ts";

export const SEARCH_PATH = "/szukaj";

/**
 * Public specials are the `special` tag (/specjale), not a row in `categories`.
 * The chip slug matches the public URL, not the tag slug.
 */
export const SPECJALE_SEARCH_SLUG = "specjale";
export const SPECJALE_TAG_SLUG = "special";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type SearchFacet = {
  slug: string;
  name: string;
  count: number;
};

export type SearchCategoryCount = {
  slug: string;
  name: string;
  displayOrder: number;
  itemCount: number;
  showCount: number;
};

export type ParsedSearch = {
  q: string;
  kategoria: string;
  page: number;
  redirectHref: string | null;
};

export type SearchSections = {
  people: boolean;
  shows: boolean;
  items: boolean;
};

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function wynikLabel(n: number): string {
  if (n === 1) return "wynik";
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "wyniki";
  return "wyników";
}

/** `?q=&kategoria=&page=` with empty values and page 1 omitted. */
export function searchHref(filters: { q?: string; kategoria?: string; page?: number } = {}): string {
  const params = new URLSearchParams();
  const q = filters.q?.trim().replace(/\s+/g, " ") ?? "";
  const kategoria = filters.kategoria?.trim().toLowerCase() ?? "";
  const page = filters.page ?? 1;
  if (q) params.set("q", q);
  if (kategoria) params.set("kategoria", kategoria);
  if (Number.isFinite(page) && page > 1) params.set("page", String(Math.floor(page)));
  const qs = params.toString();
  return qs ? `${SEARCH_PATH}?${qs}` : SEARCH_PATH;
}

export function parseSearchParams(raw: {
  q?: string | string[];
  kategoria?: string | string[];
  page?: string | string[];
}): ParsedSearch {
  const qRaw = first(raw.q);
  const katRaw = first(raw.kategoria);
  const pageRaw = first(raw.page);

  const q = (qRaw ?? "").trim().replace(/\s+/g, " ");
  const katTrimmed = (katRaw ?? "").trim().toLowerCase();
  const kategoria = SLUG.test(katTrimmed) ? katTrimmed : "";
  const page = parseBrowsePage(pageRaw);
  const safePage = page != null && page > 1 ? page : 1;

  if (!q) {
    const dirty = qRaw != null || (katRaw != null && katRaw !== "") || (pageRaw != null && pageRaw !== "");
    return { q: "", kategoria: "", page: 1, redirectHref: dirty ? SEARCH_PATH : null };
  }

  const qChanged = qRaw !== q;
  const katChanged = (katRaw ?? "") !== kategoria;
  const pageNeedsRedirect = page == null || pageRaw === "" || (pageRaw != null && pageRaw !== "" && page === 1);
  const redirectHref = qChanged || katChanged || pageNeedsRedirect
    ? searchHref({ q, kategoria, page: safePage })
    : null;

  return { q, kategoria, page: safePage, redirectHref };
}

/** Drop a kategoria that is neither Specjale nor a public category slug. */
export function unknownSearchCategoryHref(
  query: { q: string; kategoria: string; page: number },
  categories: readonly { slug: string }[],
): string | null {
  if (!query.kategoria) return null;
  if (query.kategoria === SPECJALE_SEARCH_SLUG) return null;
  if (categories.some((category) => category.slug === query.kategoria)) return null;
  return searchHref({ q: query.q, page: query.page });
}

/** A page past the filtered item total lands on the last page, query and category kept. */
export function searchClampHref(
  query: { q: string; kategoria: string; page: number },
  itemTotal: number,
  pageSize: number,
): string | null {
  const clamped = clampListingPage(query.page, itemTotal, pageSize);
  if (clamped.page === query.page) return null;
  return searchHref({ q: query.q, kategoria: query.kategoria, page: clamped.page });
}

/**
 * People have no category, so they stay on Wszystko.
 * Shows stay when the filter is a real category (narrowed to that category) or Wszystko.
 * Specjale is a tag on videos, so only items remain.
 * Tours are not part of search results.
 */
export function searchResultSections(kategoria: string): SearchSections {
  if (!kategoria) return { people: true, shows: true, items: true };
  if (kategoria === SPECJALE_SEARCH_SLUG) return { people: false, shows: false, items: true };
  return { people: false, shows: true, items: true };
}

/** Directories repeat on every item page, so they stay on the first page only. */
export function searchDirectoriesOnPage(kategoria: string, page: number): { people: boolean; shows: boolean } {
  if (page !== 1) return { people: false, shows: false };
  const sections = searchResultSections(kategoria);
  return { people: sections.people, shows: sections.shows };
}

/**
 * Category chips follow `categories.display_order`. Specjale is inserted after
 * Standup unless a category with that slug already exists.
 * A category count is matching items plus matching shows in that category.
 * Wszystko is people + shows + items. Specjale is not added again there.
 */
export function buildSearchFacets(input: {
  categories: readonly SearchCategoryCount[];
  specjaleCount: number;
  peopleCount: number;
  showsCount: number;
  itemCount: number;
}): { wszystkoCount: number; facets: SearchFacet[] } {
  const sorted = [...input.categories].sort(
    (a, b) => a.displayOrder - b.displayOrder || a.slug.localeCompare(b.slug, "pl"),
  );
  const facets: SearchFacet[] = sorted.map((category) => ({
    slug: category.slug,
    name: category.name,
    count: category.itemCount + category.showCount,
  }));
  if (!facets.some((facet) => facet.slug === SPECJALE_SEARCH_SLUG)) {
    const specjale: SearchFacet = {
      slug: SPECJALE_SEARCH_SLUG,
      name: "Specjale",
      count: input.specjaleCount,
    };
    const standupAt = facets.findIndex((facet) => facet.slug === "standup");
    facets.splice(standupAt >= 0 ? standupAt + 1 : 0, 0, specjale);
  }
  return {
    wszystkoCount: input.peopleCount + input.showsCount + input.itemCount,
    facets,
  };
}

/** Zero-result chips stay visible but are not links. The active chip stays current. */
export function searchChipMode(count: number, active: boolean): "current" | "link" | "muted" {
  if (active) return "current";
  if (count <= 0) return "muted";
  return "link";
}
