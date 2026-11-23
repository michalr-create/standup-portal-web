import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  ACCOUNT_SECTION_PREVIEW,
  FAVORITE_FEED_DEFAULT,
  FAVORITE_FEED_MAX,
  WATCH_LATER_HOME_LIMIT,
  accountPreview,
  clampFavoriteFeedLimit,
  homeWatchLaterIds,
  mergeFavoriteFeed,
  orderWatchLaterItems,
  pageFavoriteFeed,
} from "./favorite-feed.ts";
import { PUBLIC_LISTING_PAGE_SIZE } from "./category-browse.ts";

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

test("the home watch-later row keeps newest-first order and the shared row cap", () => {
  assert.equal(WATCH_LATER_HOME_LIMIT, FAVORITE_FEED_DEFAULT);
  const saved = [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 8, 0, -3, "7"];
  assert.deepEqual(homeWatchLaterIds(saved), [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9]);
  assert.deepEqual(homeWatchLaterIds([4, 4, 1], 2), [4, 1]);
  assert.deepEqual(homeWatchLaterIds([]), []);

  const cards = [
    { id: 9, title: "older" },
    { id: 4, title: "removed" },
    { id: 20, title: "newest" },
  ];
  assert.deepEqual(
    orderWatchLaterItems(cards, [20, 9]).map((item) => item.id),
    [20, 9],
  );
  assert.deepEqual(orderWatchLaterItems(cards, []), []);
});

test("account sections collapse to five until the reader asks for the rest", () => {
  const items = [1, 2, 3, 4, 5, 6, 7];
  assert.equal(ACCOUNT_SECTION_PREVIEW, 5);
  assert.deepEqual(accountPreview(items, false), [1, 2, 3, 4, 5]);
  assert.deepEqual(accountPreview(items, true), items);
  assert.deepEqual(accountPreview([1, 2], false), [1, 2]);
});

test("the favorites catalog pages newest first and keeps one copy of a shared video", () => {
  const people = [
    { id: 1, published_at: "2026-01-01T00:00:00.000Z" },
    { id: 2, published_at: "2026-06-01T00:00:00.000Z" },
  ];
  const shows = [
    { id: 2, published_at: "2026-06-01T00:00:00.000Z" },
    { id: 3, published_at: "2026-11-01T00:00:00.000Z" },
  ];
  const many = Array.from({ length: 30 }, (_, index) => ({
    id: index + 10,
    published_at: new Date(Date.UTC(2025, 0, index + 1)).toISOString(),
  }));

  assert.equal(PUBLIC_LISTING_PAGE_SIZE, 24);
  const first = pageFavoriteFeed([people, shows, many], 1);
  assert.equal(first.total, 33);
  assert.equal(first.page, 1);
  assert.equal(first.items.length, 24);
  assert.deepEqual(first.items.slice(0, 3).map((item) => item.id), [3, 2, 1]);
  assert.equal(first.items[3].id, 39);

  const second = pageFavoriteFeed([people, shows, many], 2);
  assert.equal(second.page, 2);
  assert.equal(second.items.length, 9);
  assert.equal(second.items[0].id, 18);
  assert.equal(second.items[8].id, 10);

  const past = pageFavoriteFeed([people, shows], 9);
  assert.equal(past.page, 1);
  assert.deepEqual(past.items.map((item) => item.id), [3, 2, 1]);
  assert.deepEqual(pageFavoriteFeed([[]], 1).items, []);
});

test("the favorites query orders every person and show before it limits", () => {
  const route = readFileSync(new URL("../app/api/favorites/route.ts", import.meta.url), "utf8");
  assert.match(route, /content_tags!inner\(tag_id\)/);
  assert.match(route, /\.in\("content_tags\.tag_id", tagIds\)/);
  assert.match(route, /\.in\("person_id", personIds\)/);
  assert.match(route, /\.in\("slug", personSlugs\)/);
  assert.match(route, /\.in\("show_id", showIds\)/);
  assert.match(route, /mergeFavoriteFeed\(\[personRows, showRows\], limit\)/);
  assert.match(route, /pageFavoriteFeed\(\[personRows, showRows\], contentPage, PUBLIC_LISTING_PAGE_SIZE\)/);
  assert.match(route, /FAVORITE_CATALOG_CAP/);
  assert.match(route, /\.range\(offset, end\)/);

  const page = readFileSync(new URL("../app/ulubione/tresci/page.tsx", import.meta.url), "utf8");
  const grid = readFileSync(new URL("../app/ulubione/tresci/FavoriteContent.tsx", import.meta.url), "utf8");
  assert.match(page, /parseListingPage/);
  assert.match(page, /"\/ulubione\/tresci"/);
  assert.match(grid, />\s*Ulubione<span className="dot-accent">\.<\/span>/);
  assert.match(grid, /Zapisane w tej przeglądarce\./);
  assert.match(grid, /href=\{`\/zaloguj\?next=\$\{PATHNAME\}`\}/);
  assert.match(grid, /Zaloguj się/);
  assert.match(grid, /żeby mieć ulubione, obejrzane i listę „Do obejrzenia” też na innych urządzeniach\./);
  assert.match(grid, /!library\.signedIn/);
  assert.match(grid, /<ItemsBrowser items=\{items\} \/>/);
  assert.match(grid, /<Pager/);
  assert.match(grid, /pageSize=\{PUBLIC_LISTING_PAGE_SIZE\}/);
  assert.match(grid, /listingPageHref\(PATHNAME, next\)/);
  assert.match(grid, /page,/);
  assert.doesNotMatch(grid, /SignOutButton/);
  assert.doesNotMatch(grid, /AccountPlaces/);
  assert.match(route, /\.order\("published_at", \{ ascending: false \}\)/);
  assert.doesNotMatch(route, /select\("content_item_id"\)/);
  assert.doesNotMatch(route, /SERVICE/);
});
