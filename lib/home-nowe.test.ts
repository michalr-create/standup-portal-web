import assert from "node:assert/strict";
import { test } from "node:test";
import {
  HOME_NOWE_SHORTS_CATEGORY_ID,
  isExcludedFromHomeNowe,
} from "./home-nowe.ts";

test("homepage Nowe excludes the Shorts category", () => {
  assert.equal(HOME_NOWE_SHORTS_CATEGORY_ID, 4);
  assert.equal(
    isExcludedFromHomeNowe({
      category_id: 4,
      url: "https://www.youtube.com/watch?v=abcdefghijk",
    }),
    true,
  );
});

test("homepage Nowe keeps a full video in another category", () => {
  assert.equal(
    isExcludedFromHomeNowe({
      category_id: 1,
      url: "https://www.youtube.com/watch?v=jMa5nECCYUI",
    }),
    false,
  );
  assert.equal(
    isExcludedFromHomeNowe({
      category_id: 6,
      url: "https://www.youtube.com/watch?v=roast-full",
    }),
    false,
  );
});

test("homepage Nowe excludes a YouTube Short filed under another category", () => {
  assert.equal(
    isExcludedFromHomeNowe({
      category_id: 6,
      url: "https://www.youtube.com/shorts/LmrsxqW7pNg",
    }),
    true,
  );
  assert.equal(
    isExcludedFromHomeNowe({
      category_id: null,
      url: "https://www.youtube.com/Shorts/AbCdEfGhIjK",
    }),
    true,
  );
});
