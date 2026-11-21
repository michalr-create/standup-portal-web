import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { SEARCH_RESULT_LIMIT } from "./search.ts";
import {
  SPECJALE_SEARCH_SLUG,
  buildSearchFacets,
  parseSearchParams,
  searchChipMode,
  searchClampHref,
  searchDirectoriesOnPage,
  searchHref,
  searchResultSections,
  unknownSearchCategoryHref,
  wynikLabel,
} from "./search-filters.ts";

function source(path: string): string {
  return readFileSync(new URL("../" + path, import.meta.url), "utf8");
}

function between(text: string, start: string, end: string): string {
  const from = text.indexOf(start);
  assert.ok(from >= 0, start);
  const to = text.indexOf(end, from + start.length);
  assert.ok(to > from, end);
  return text.slice(from, to);
}

const PUBLIC_CATEGORIES = [
  { slug: "standup", name: "Standup", displayOrder: 1, itemCount: 4, showCount: 0 },
  { slug: "formaty", name: "Formaty", displayOrder: 2, itemCount: 2, showCount: 3 },
  { slug: "wywiady", name: "Wywiady", displayOrder: 3, itemCount: 0, showCount: 0 },
  { slug: "shorts", name: "Shorts", displayOrder: 4, itemCount: 1, showCount: 0 },
  { slug: "kulisy", name: "Kulisy", displayOrder: 5, itemCount: 0, showCount: 1 },
  { slug: "roast", name: "Roast", displayOrder: 6, itemCount: 0, showCount: 0 },
];

test("search href keeps the query, category, and later pages", () => {
  assert.equal(searchHref({}), "/szukaj");
  assert.equal(searchHref({ q: "  wentyl  ", kategoria: "", page: 1 }), "/szukaj?q=wentyl");
  assert.equal(
    searchHref({ q: "wentyl", kategoria: "specjale" }),
    "/szukaj?q=wentyl&kategoria=specjale",
  );
  assert.equal(
    searchHref({ q: "wentyl", kategoria: "Shorts", page: 2 }),
    "/szukaj?q=wentyl&kategoria=shorts&page=2",
  );
});

test("parseSearchParams canonicalizes the query, category, and page", () => {
  const plain = parseSearchParams({ q: "wentyl" });
  assert.equal(plain.redirectHref, null);
  assert.equal(plain.q, "wentyl");
  assert.equal(plain.kategoria, "");
  assert.equal(plain.page, 1);

  const messy = parseSearchParams({ q: "  Ból   pleców ", kategoria: "Specjale", page: "3" });
  assert.equal(messy.q, "Ból pleców");
  assert.equal(messy.kategoria, "specjale");
  assert.equal(messy.page, 3);
  assert.equal(messy.redirectHref, "/szukaj?q=B%C3%B3l+plec%C3%B3w&kategoria=specjale&page=3");

  const explicitFirst = parseSearchParams({ q: "wentyl", kategoria: "roast", page: "1" });
  assert.equal(explicitFirst.redirectHref, "/szukaj?q=wentyl&kategoria=roast");
  assert.equal(explicitFirst.page, 1);

  const badPage = parseSearchParams({ q: "wentyl", page: "0" });
  assert.equal(badPage.redirectHref, "/szukaj?q=wentyl");
  assert.equal(badPage.page, 1);

  const badCategory = parseSearchParams({ q: "wentyl", kategoria: "nope!" });
  assert.equal(badCategory.kategoria, "");
  assert.equal(badCategory.redirectHref, "/szukaj?q=wentyl");

  assert.equal(parseSearchParams({}).redirectHref, null);
  assert.equal(parseSearchParams({ q: "   ", kategoria: "shorts" }).redirectHref, "/szukaj");
  assert.equal(parseSearchParams({ q: "" }).redirectHref, "/szukaj");
});

test("unknown category is dropped and a page past the end keeps the filter", () => {
  const categories = PUBLIC_CATEGORIES.map(({ slug }) => ({ slug }));
  assert.equal(
    unknownSearchCategoryHref({ q: "wentyl", kategoria: "specjale", page: 2 }, categories),
    null,
  );
  assert.equal(
    unknownSearchCategoryHref({ q: "wentyl", kategoria: "shorts", page: 2 }, categories),
    null,
  );
  assert.equal(
    unknownSearchCategoryHref({ q: "wentyl", kategoria: "open-mic", page: 2 }, categories),
    "/szukaj?q=wentyl&page=2",
  );

  assert.equal(
    searchClampHref({ q: "wentyl", kategoria: "shorts", page: 4 }, 30, SEARCH_RESULT_LIMIT),
    "/szukaj?q=wentyl&kategoria=shorts&page=2",
  );
  assert.equal(
    searchClampHref({ q: "wentyl", kategoria: "shorts", page: 1 }, 0, SEARCH_RESULT_LIMIT),
    null,
  );
});

test("facets follow public categories, insert Specjale, and count shows with Formaty", () => {
  const built = buildSearchFacets({
    categories: PUBLIC_CATEGORIES,
    specjaleCount: 5,
    peopleCount: 2,
    showsCount: 4,
    itemCount: 9,
  });
  assert.deepEqual(
    built.facets.map((facet) => facet.slug),
    ["standup", "specjale", "formaty", "wywiady", "shorts", "kulisy", "roast"],
  );
  assert.equal(built.facets.find((facet) => facet.slug === "formaty")?.count, 5);
  assert.equal(built.facets.find((facet) => facet.slug === "kulisy")?.count, 1);
  assert.equal(built.facets.find((facet) => facet.slug === "wywiady")?.count, 0);
  assert.equal(built.facets.find((facet) => facet.slug === SPECJALE_SEARCH_SLUG)?.count, 5);
  assert.equal(built.wszystkoCount, 15);
  assert.equal(wynikLabel(15), "wyników");
  assert.equal(wynikLabel(2), "wyniki");
  assert.equal(wynikLabel(1), "wynik");

  const withExtra = buildSearchFacets({
    categories: [
      ...PUBLIC_CATEGORIES,
      { slug: "open-mic", name: "Open mic", displayOrder: 7, itemCount: 3, showCount: 0 },
    ],
    specjaleCount: 0,
    peopleCount: 0,
    showsCount: 0,
    itemCount: 3,
  });
  assert.equal(withExtra.facets.at(-1)?.slug, "open-mic");

  const already = buildSearchFacets({
    categories: [
      { slug: "specjale", name: "Specjale", displayOrder: 2, itemCount: 8, showCount: 1 },
    ],
    specjaleCount: 99,
    peopleCount: 0,
    showsCount: 1,
    itemCount: 8,
  });
  assert.equal(already.facets.filter((facet) => facet.slug === "specjale").length, 1);
  assert.equal(already.facets[0]?.count, 9);
});

test("category chips mute zeros and sections stay sensible", () => {
  assert.equal(searchChipMode(0, false), "muted");
  assert.equal(searchChipMode(0, true), "current");
  assert.equal(searchChipMode(4, false), "link");
  assert.equal(searchChipMode(4, true), "current");

  assert.deepEqual(searchResultSections(""), { people: true, shows: true, items: true });
  assert.deepEqual(searchResultSections("formaty"), { people: false, shows: true, items: true });
  assert.deepEqual(searchResultSections("shorts"), { people: false, shows: true, items: true });
  assert.deepEqual(searchResultSections("specjale"), { people: false, shows: false, items: true });
  assert.deepEqual(searchDirectoriesOnPage("", 2), { people: false, shows: false });
  assert.deepEqual(searchDirectoriesOnPage("formaty", 1), { people: false, shows: true });
});

test("search filters on the server, keeps paging, and leaves the nav forms resume-safe", () => {
  const page = source("app/szukaj/page.tsx");
  const chips = source("app/szukaj/SearchCategoryChips.tsx");
  assert.match(page, /searchAll\(query, \{/);
  assert.match(page, /categorySlug: kategoria/);
  assert.match(page, /unknownSearchCategoryHref/);
  assert.match(page, /searchClampHref/);
  assert.match(page, /<SearchCategoryChips/);
  assert.match(chips, /aria-label="Kategorie wynik/);
  assert.match(chips, /aria-current=\{current \? "page" : undefined\}/);
  assert.match(chips, /aria-disabled="true"/);
  assert.match(chips, /revealCurrentChip/);
  assert.match(page, /searchDirectoriesOnPage/);
  assert.match(page, /<Pager/);
  assert.match(page, /searchHref\(\{ q: query, kategoria, page: nextPage \}\)/);
  assert.doesNotMatch(page, /items\.filter|useSearchParams|useState/);
  assert.match(page, /showCategoryBadge=\{showItemCategory\}/);
  assert.doesNotMatch(page, /showCategoryBadge=\{false\}/);

  const data = source("lib/data.ts");
  const fn = between(data, "function pageTitleMatches", "export async function getLatestPerShow");
  assert.match(fn, /\.range\(/);
  assert.match(fn, /count: "exact"/);
  assert.match(fn, /category_id/);
  assert.match(fn, /export async function searchAll/);
  assert.match(fn, /SPECJALE_SEARCH_SLUG/);
  assert.match(fn, /dedupeSearchItems/);
  assert.match(fn, /buildSearchFacets/);

  assert.match(source("app/components/NavSearch.tsx"), /data-resume-safe=""/);
  assert.match(source("app/components/NavSearch.tsx"), /\/szukaj\?q=/);
  assert.match(source("app/components/MobileDrawer.tsx"), /data-resume-safe=""/);
  assert.match(source("app/components/MobileDrawer.tsx"), /\/szukaj\?q=/);
});
