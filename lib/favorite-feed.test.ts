import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  ACCOUNT_SECTION_PREVIEW,
  FAVORITE_FEED_DEFAULT,
  FAVORITE_FEED_MAX,
  accountPreview,
  clampFavoriteFeedLimit,
  mergeFavoriteFeed,
} from "./favorite-feed.ts";

test("favorite feed limit stays in range and defaults when the caller omits it", () => {
  assert.equal(clampFavoriteFeedLimit(undefined), FAVORITE_FEED_DEFAULT);
  assert.equal(clampFavoriteFeedLimit(null), FAVORITE_FEED_DEFAULT);
  assert.equal(clampFavoriteFeedLimit("nope"), FAVORITE_FEED_DEFAULT);
  assert.equal(clampFavoriteFeedLimit(0), FAVORITE_FEED_DEFAULT);
  assert.equal(clampFavoriteFeedLimit(1), 1);
  assert.equal(clampFavoriteFeedLimit(FAVORITE_FEED_MAX + 20), FAVORITE_FEED_MAX);
  assert.equal(clampFavoriteFeedLimit("48"), 48);
});

test("newest items from every favorite person and show survive, duplicates do not", () => {
  const prolific = [
    { id: 1, published_at: "2020-01-01T00:00:00.000Z", who: "a" },
    { id: 2, published_at: "2020-06-01T00:00:00.000Z", who: "a" },
  ];
  const other = [{ id: 3, published_at: "2026-11-01T00:00:00.000Z", who: "b" }];
  const shows = [
    { id: 3, published_at: "2026-11-01T00:00:00.000Z", who: "b" },
    { id: 4, published_at: "2026-11-20T00:00:00.000Z", who: "show" },
    { id: 5, published_at: null, who: "show" },
  ];

  assert.deepEqual(
    mergeFavoriteFeed([prolific, other, shows], 10).map((item) => item.id),
    [4, 3, 2, 1, 5],
  );
  assert.deepEqual(
    mergeFavoriteFeed([prolific, other, shows], 2).map((item) => item.id),
    [4, 3],
  );
  assert.deepEqual(mergeFavoriteFeed([prolific], 0), []);
});

test("account sections collapse to five until the reader asks for the rest", () => {
  const items = [1, 2, 3, 4, 5, 6, 7];
  assert.equal(ACCOUNT_SECTION_PREVIEW, 5);
  assert.deepEqual(accountPreview(items, false), [1, 2, 3, 4, 5]);
  assert.deepEqual(accountPreview(items, true), items);
  assert.deepEqual(accountPreview([1, 2], false), [1, 2]);
});

test("the favorites query orders every person and show before it limits", () => {
  const route = readFileSync(new URL("../app/api/favorites/route.ts", import.meta.url), "utf8");
  assert.match(route, /content_tags!inner\(tag_id\)/);
  assert.match(route, /\.in\("content_tags\.tag_id", tagIds\)/);
  assert.match(route, /\.in\("person_id", personIds\)/);
  assert.match(route, /\.in\("slug", personSlugs\)/);
  assert.match(route, /\.in\("show_id", showIds\)/);
  assert.match(route, /mergeFavoriteFeed\(\[personRows, showRows\], limit\)/);
  assert.match(route, /\.order\("published_at", \{ ascending: false \}\)/);
  assert.doesNotMatch(route, /select\("content_item_id"\)/);
  assert.doesNotMatch(route, /SERVICE/);
});
