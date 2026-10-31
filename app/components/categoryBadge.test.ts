import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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

  assert.equal(existsSync(new URL("../components/HomeVideoGrid.tsx", import.meta.url)), false);

  const scrollRow = source("components/ScrollRow.tsx");
  assert.match(scrollRow, /showCategoryBadge = false/);
  const rowChipStart = scrollRow.indexOf("{showCategoryBadge && (");
  const rowChipEnd = scrollRow.indexOf(")}", rowChipStart);
  assert.ok(rowChipStart > 0 && rowChipEnd > rowChipStart);
  const rowChip = scrollRow.slice(rowChipStart, rowChipEnd);
  assert.match(rowChip, /item\.categoryName \|\| "YouTube"/);
  assert.equal(scrollRow.split("item.categoryName").length - 1, 1);

  const home = source("page.tsx");
  assert.match(home, /<ScrollRow items=\{recentItems\} showCategoryBadge\s*\/>/);
  assert.doesNotMatch(home, /HomeVideoGrid/);
  const noweAt = home.indexOf('title="Nowe"');
  const polecaneAt = home.indexOf('title="Polecane"');
  assert.ok(noweAt > 0 && polecaneAt > noweAt);
  assert.match(home.slice(noweAt, polecaneAt), /showCategoryBadge/);
  assert.doesNotMatch(home.slice(polecaneAt), /showCategoryBadge/);
  assert.match(home, /<ScrollRow items=\{featuredItems\} \/>/);
  assert.match(home, /<ScrollRow items=\{specjalItems\} \/>/);
});
