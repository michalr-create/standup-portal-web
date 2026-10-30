import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function source(path: string): string {
  return readFileSync(new URL("../" + path, import.meta.url), "utf8");
}

test("showCategoryBadge stays on by default and single-category listings turn it off", () => {
  const browser = source("components/ItemsBrowser.tsx");
  assert.match(browser, /showCategoryBadge = true/);
  const chipStart = browser.indexOf("{showCategoryBadge && (");
  const chipEnd = browser.indexOf(")}", chipStart);
  assert.ok(chipStart > 0 && chipEnd > chipStart);
  const chip = browser.slice(chipStart, chipEnd);
  assert.match(chip, /item\.categoryName \|\| "YouTube"/);
  assert.equal(browser.split("item.categoryName").length - 1, 1);
  assert.match(browser, /<ThumbDuration/);
  assert.match(browser, /<HeartButton/);
  assert.match(browser, /<PaidBadge/);

  const filterable = source("components/FilterableItemsBrowser.tsx");
  assert.match(filterable, /showCategoryBadge = true/);
  assert.match(filterable, /showCategoryBadge=\{showCategoryBadge\}/);

  const listing = source("components/CategoryListing.tsx");
  assert.match(listing, /showCategoryBadge=\{showCategoryBadge\}/);

  for (const path of [
    "standup/page.tsx",
    "wywiady/page.tsx",
    "shorts/page.tsx",
    "kulisy/page.tsx",
    "roast/page.tsx",
  ]) {
    assert.match(source(path), /showCategoryBadge=\{false\}/);
  }

  const profile = source("standuper/[slug]/page.tsx");
  const cards = profile.match(/<ItemsBrowser\b[^]*?\/>/g) ?? [];
  assert.equal(cards.length, 3);
  for (const card of cards) {
    assert.match(card, /showCategoryBadge=\{false\}/);
  }

  const search = source("szukaj/page.tsx");
  assert.match(search, /<ItemsBrowser items=\{items\} highlight=\{query\} \/>/);
  assert.doesNotMatch(search, /showCategoryBadge=\{false\}/);

  const homeGrid = source("components/HomeVideoGrid.tsx");
  const home = source("page.tsx");
  assert.match(home, /<HomeVideoGrid/);
  assert.match(homeGrid, /item\.categoryName \|\| "YouTube"/);
  assert.doesNotMatch(homeGrid, /showCategoryBadge/);
});
