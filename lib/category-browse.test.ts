import assert from "node:assert/strict";
import { test } from "node:test";
import {
  categoryBrowseHref,
  parseBrowsePage,
  parseCategoryBrowseSearchParams,
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
