import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_GRID_CLASS,
  DEFAULT_THUMB_ASPECT,
  SHORTS_GRID_CLASS,
  SHORTS_THUMB_ASPECT,
  resolveItemsBrowserVariant,
} from "./itemsBrowserLayout.ts";

test("explicit shorts variant forces the portrait layout", () => {
  assert.equal(
    resolveItemsBrowserVariant([{ categorySlug: "standup" }], "shorts"),
    "shorts",
  );
});

test("explicit default keeps the landscape layout for a shorts-only list", () => {
  assert.equal(
    resolveItemsBrowserVariant([{ categorySlug: "shorts" }], "default"),
    "default",
  );
});

test("a listing of only shorts uses the portrait layout", () => {
  assert.equal(
    resolveItemsBrowserVariant([
      { categorySlug: "shorts" },
      { categorySlug: "shorts" },
    ]),
    "shorts",
  );
});

test("other categories and mixed lists stay on the landscape layout", () => {
  assert.equal(resolveItemsBrowserVariant([]), "default");
  assert.equal(resolveItemsBrowserVariant([{ categorySlug: null }]), "default");
  assert.equal(resolveItemsBrowserVariant([{ categorySlug: "standup" }]), "default");
  assert.equal(resolveItemsBrowserVariant([{ categorySlug: "roast" }]), "default");
  assert.equal(
    resolveItemsBrowserVariant([
      { categorySlug: "roast" },
      { categorySlug: "shorts" },
    ]),
    "default",
  );
});

test("shorts thumbs are 9/16 and the phone grid is two columns", () => {
  assert.equal(SHORTS_THUMB_ASPECT, "9/16");
  assert.equal(DEFAULT_THUMB_ASPECT, "16/10");
  assert.match(SHORTS_GRID_CLASS, /\bgrid-cols-2\b/);
  assert.doesNotMatch(SHORTS_GRID_CLASS, /grid-cols-1/);
  assert.match(SHORTS_GRID_CLASS, /lg:grid-cols-3/);
  assert.match(SHORTS_GRID_CLASS, /xl:grid-cols-4/);
  assert.match(DEFAULT_GRID_CLASS, /grid-cols-1/);
  assert.match(DEFAULT_GRID_CLASS, /sm:grid-cols-2/);
});
