import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function source(path: string): string {
  return readFileSync(new URL("../" + path, import.meta.url), "utf8");
}

function between(text: string, start: string, end: string): string {
  const from = text.indexOf(start);
  assert.ok(from >= 0, start);
  const to = text.indexOf(end, from + start.length);
  return text.slice(from, to === -1 ? undefined : to);
}

test("category listings page through one catalog component and a server total", () => {
  for (const path of ["app/wywiady/page.tsx", "app/shorts/page.tsx", "app/kulisy/page.tsx", "app/roast/page.tsx"]) {
    const page = source(path);
    assert.match(page, /CategoryListing/);
    assert.doesNotMatch(page, /getItemsByCategorySlug\(/);
    assert.doesNotMatch(page, /999/);
  }

  const listing = source("app/components/CategoryListing.tsx");
  assert.match(listing, /getCategoryBrowse/);
  assert.doesNotMatch(listing, /getItemsByCategorySlugPage/);
  assert.match(listing, /PUBLIC_LISTING_PAGE_SIZE/);
  assert.match(listing, /parseCategoryBrowseSearchParams/);
  assert.match(listing, /listingClampHref/);
  assert.match(listing, /unknownFacetPersonHref/);
  assert.match(listing, /browsePageHref/);
  assert.match(listing, /serverFilters/);
  assert.match(listing, /catalogTotal=\{browse\.total\}/);
  assert.match(listing, /<Pager/);
  assert.match(listing, /if \(!category\) notFound\(\)/);
  assert.doesNotMatch(listing, /na tej stronie/);
});

test("format episodes page with the full total and clamp instead of a 999 cap", () => {
  const page = source("app/format/[slug]/page.tsx");
  assert.match(page, /getShowEpisodesPage/);
  assert.match(page, /clampListingPage/);
  assert.match(page, /episodes\.total/);
  assert.match(page, /<Pager/);
  assert.match(page, /if \(!show\) notFound\(\)/);
  assert.doesNotMatch(page, /getItemsByShowSlug/);
  assert.doesNotMatch(page, /999/);

  const data = source("lib/data.ts");
  const categoryPage = between(data, "export async function getItemsByCategorySlugPage", "\nexport async function ");
  assert.match(categoryPage, /count: "exact"/);
  assert.match(categoryPage, /PGRST103/);
  const showPage = between(data, "function episodeStampQuery", "\nexport type CategoryFacetPerson");
  assert.match(showPage, /neq\("content_type", "short"\)/);
  assert.match(showPage, /mergeShowEpisodes/);
  assert.match(showPage, /pageShowEpisodes/);
  assert.match(showPage, /total: window\.total/);
  assert.match(showPage, /export async function getShowEpisodesPage/);
});

test("standup, specjale, and trasy keep their filters and use the shared page size", () => {
  const standup = source("app/standup/page.tsx");
  assert.match(standup, /PUBLIC_LISTING_PAGE_SIZE/);
  assert.match(standup, /listingClampHref/);
  assert.match(standup, /parseCategoryBrowseSearchParams/);
  assert.match(standup, /serverFilters/);
  assert.match(standup, /catalogTotal=\{browse\.total\}/);
  assert.doesNotMatch(standup, /PAGE_SIZE = 100/);
  assert.doesNotMatch(standup, /999/);

  const specjale = source("app/specjale/page.tsx");
  assert.match(specjale, /PUBLIC_LISTING_PAGE_SIZE/);
  assert.match(specjale, /listingClampHref/);
  assert.match(specjale, /parseCategoryBrowseSearchParams/);
  assert.match(specjale, /getTagBrowse/);
  assert.match(specjale, /serverFilters/);
  assert.match(specjale, /catalogTotal=\{browse\.total\}/);
  assert.match(specjale, /few: "specjale"/);
  assert.match(specjale, /const DEFINING_TAG = "special"/);
  assert.match(specjale, /hiddenTagSlugs=\{\[DEFINING_TAG\]\}/);
  assert.match(specjale, /<Pager/);
  assert.doesNotMatch(specjale, /parseListingPage/);
  assert.doesNotMatch(specjale, /na tej stronie/);

  const browser = source("app/components/FilterableItemsBrowser.tsx");
  assert.match(browser, /PersonCombobox/);
  assert.match(browser, /inputId="listing-osoba"/);
  assert.match(browser, /listingCountLabel/);
  assert.doesNotMatch(browser, /<select/);

  const trasy = source("app/trasy/page.tsx");
  assert.match(trasy, /PUBLIC_LISTING_PAGE_SIZE/);
  assert.match(trasy, /clampListingPage/);
  assert.match(trasy, /trasyHref/);
  assert.match(trasy, /Brak terminów/);
  assert.match(trasy, /<Pager/);
  assert.doesNotMatch(trasy, /PAGE_SIZE = /);
});
