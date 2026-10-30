import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PUBLIC_LISTING_PAGE_SIZE,
  categoryBrowseHref,
  clampListingPage,
  listingPageHref,
  listingTotalPages,
  parseBrowsePage,
  parseCategoryBrowseSearchParams,
  parseListingPage,
} from "./category-browse.ts";

test("browse href omits empty filters and the first page", () => {
  assert.equal(categoryBrowseHref("/standup", {}), "/standup");
  assert.equal(categoryBrowseHref("/standup", { page: 1, osoba: "  ", q: "" }), "/standup");
  assert.equal(
    categoryBrowseHref("/standup", { osoba: "abelard-giza" }),
    "/standup?osoba=abelard-giza",
  );
  assert.equal(
    categoryBrowseHref("/standup", { osoba: "abelard-giza", tag: "special", page: 2 }),
    "/standup?osoba=abelard-giza&tag=special&page=2",
  );
  assert.equal(
    categoryBrowseHref("/standup", { q: "wentyl", page: 3 }),
    "/standup?q=wentyl&page=3",
  );
});

test("parseBrowsePage accepts only a positive page", () => {
  assert.equal(parseBrowsePage(undefined), 1);
  assert.equal(parseBrowsePage(""), 1);
  assert.equal(parseBrowsePage("2"), 2);
  assert.equal(parseBrowsePage("0"), null);
  assert.equal(parseBrowsePage("01"), null);
  assert.equal(parseBrowsePage("nope"), null);
});

test("search params stay canonical and preserve a person plus tag filter", () => {
  const parsed = parseCategoryBrowseSearchParams(
    { osoba: "abelard-giza", tag: "special" },
    "/standup",
  );
  assert.equal(parsed.redirectHref, null);
  assert.equal(parsed.osoba, "abelard-giza");
  assert.equal(parsed.tag, "special");
  assert.equal(parsed.page, 1);

  const explicitFirst = parseCategoryBrowseSearchParams(
    { osoba: "abelard-giza", tag: "special", page: "1" },
    "/standup",
  );
  assert.equal(explicitFirst.redirectHref, "/standup?osoba=abelard-giza&tag=special");

  const messy = parseCategoryBrowseSearchParams(
    { osoba: "Abelard-Giza", tag: "Special", q: "  Wentyl  ", page: "2" },
    "/standup",
  );
  assert.equal(messy.osoba, "abelard-giza");
  assert.equal(messy.tag, "special");
  assert.equal(messy.q, "Wentyl");
  assert.equal(messy.page, 2);
  assert.equal(
    messy.redirectHref,
    "/standup?osoba=abelard-giza&tag=special&q=Wentyl&page=2",
  );
});

test("public listings share a page size of 24 and clamp a page past the end", () => {
  assert.equal(PUBLIC_LISTING_PAGE_SIZE, 24);
  assert.equal(listingTotalPages(0), 1);
  assert.equal(listingTotalPages(1), 1);
  assert.equal(listingTotalPages(24), 1);
  assert.equal(listingTotalPages(25), 2);
  assert.equal(listingTotalPages(48), 2);
  assert.equal(listingTotalPages(49), 3);
  assert.equal(listingTotalPages(1500), 63);

  assert.deepEqual(clampListingPage(1, 0), { page: 1, totalPages: 1 });
  assert.deepEqual(clampListingPage(5, 0), { page: 1, totalPages: 1 });
  assert.deepEqual(clampListingPage(2, 24), { page: 1, totalPages: 1 });
  assert.deepEqual(clampListingPage(2, 25), { page: 2, totalPages: 2 });
  assert.deepEqual(clampListingPage(9, 25), { page: 2, totalPages: 2 });
  assert.deepEqual(clampListingPage(2, 48), { page: 2, totalPages: 2 });
  assert.deepEqual(clampListingPage(3, 49), { page: 3, totalPages: 3 });
  assert.deepEqual(clampListingPage(100, 1500), { page: 63, totalPages: 63 });
  assert.deepEqual(clampListingPage(63, 1500), { page: 63, totalPages: 63 });
  assert.deepEqual(clampListingPage(Number.NaN, 30), { page: 1, totalPages: 2 });
  assert.deepEqual(clampListingPage(2.9, 50), { page: 2, totalPages: 3 });

  assert.equal(listingPageHref("/wywiady", 1), "/wywiady");
  assert.equal(listingPageHref("/format/wahanie", 2), "/format/wahanie?page=2");
});

test("listing page query canonicalizes invalid and explicit first pages", () => {
  assert.deepEqual(parseListingPage(undefined, "/shorts"), { page: 1, redirectHref: null });
  assert.deepEqual(parseListingPage("", "/shorts"), { page: 1, redirectHref: null });
  assert.deepEqual(parseListingPage("2", "/shorts"), { page: 2, redirectHref: null });
  assert.deepEqual(parseListingPage(["3", "9"], "/kulisy"), { page: 3, redirectHref: null });
  assert.deepEqual(parseListingPage("1", "/roast"), { page: 1, redirectHref: "/roast" });
  assert.deepEqual(parseListingPage("0", "/wywiady"), { page: 1, redirectHref: "/wywiady" });
  assert.deepEqual(parseListingPage("nope", "/specjale"), { page: 1, redirectHref: "/specjale" });
  assert.deepEqual(parseListingPage("01", "/format/wahanie"), {
    page: 1,
    redirectHref: "/format/wahanie",
  });
});

test("invalid slugs and pages are dropped instead of applied to the query", () => {
  const parsed = parseCategoryBrowseSearchParams(
    { osoba: "../abelard", tag: "special*", page: "0", q: "   " },
    "/standup",
  );
  assert.equal(parsed.osoba, "");
  assert.equal(parsed.tag, "");
  assert.equal(parsed.q, "");
  assert.equal(parsed.page, 1);
  assert.equal(parsed.redirectHref, "/standup");
});
