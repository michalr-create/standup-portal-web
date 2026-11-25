import assert from "node:assert/strict";
import { test } from "node:test";
import { displayTitle } from "./display-title.ts";
import {
  EXCLUDED_SPECIAL_ITEM_ID,
  allocateContentSlug,
  isPublicContentSlug,
  slugify,
} from "./slugify.ts";

test("ł and Ł become l before other Polish letters are stripped", () => {
  assert.equal(slugify("Łukasz Lotek Lodkowski — Hardcore"), "lukasz-lotek-lodkowski-hardcore");
  assert.equal(slugify("łukasz"), "lukasz");
  assert.equal(slugify("ĄĆĘŃÓŚŹŻ"), "acenoszz");
  assert.equal(slugify("żółć"), "zolc");
  assert.equal(slugify("  "), "");
  assert.equal(slugify("---"), "");
});

test("public content slugs reject empty and reserved values", () => {
  assert.equal(isPublicContentSlug("abelard-giza-wentyl-2026"), true);
  assert.equal(isPublicContentSlug(""), false);
  assert.equal(isPublicContentSlug("dodaj"), false);
  assert.equal(isPublicContentSlug("page"), false);
  assert.equal(isPublicContentSlug("Admin"), false);
  assert.equal(isPublicContentSlug("wentyl--2026"), false);
  assert.equal(isPublicContentSlug("-wentyl"), false);
});

test("collisions suffix the row id and the excluded duplicate gets nothing", () => {
  assert.equal(allocateContentSlug("Wentyl", 12, []), "wentyl");
  assert.equal(allocateContentSlug("Wentyl", 12, ["wentyl"]), "wentyl-12");
  assert.equal(allocateContentSlug("page", 12, []), "12");
  assert.equal(allocateContentSlug("Wentyl", EXCLUDED_SPECIAL_ITEM_ID, []), null);
  assert.equal(allocateContentSlug("", 9, []), "9");
});

test("slug stays on the raw title, not the cleaned display title", () => {
  const raw = "ABELARD GIZA - Piniata całe nagranie 2020 STAND-UP";
  assert.equal(slugify(raw), "abelard-giza-piniata-cale-nagranie-2020-stand-up");
  assert.notEqual(slugify(displayTitle(raw)), slugify(raw));
});
