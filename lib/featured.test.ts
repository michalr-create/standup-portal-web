import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { featuredIdsToClear, HOME_FEATURED_LIMIT, selectFeaturedWindow } from "./featured.ts";

function row(id: number, featuredAt: string | null, publishedAt: string | null = null) {
  return { id, featuredAt, publishedAt };
}

test("Polecane keeps at most five, newest featured first", () => {
  assert.equal(HOME_FEATURED_LIMIT, 5);
  const items = [
    row(1, "2026-10-01T00:00:00.000Z", "2026-10-01T00:00:00.000Z"),
    row(2, "2026-10-05T00:00:00.000Z", "2026-09-01T00:00:00.000Z"),
    row(3, "2026-10-03T00:00:00.000Z"),
    row(4, "2026-10-04T00:00:00.000Z"),
    row(5, "2026-10-02T00:00:00.000Z"),
    row(6, "2026-09-01T00:00:00.000Z"),
  ];
  const before = items.map((item) => item.id);

  const selected = selectFeaturedWindow(items);

  assert.deepEqual(
    selected.map((item) => item.id),
    [2, 4, 3, 5, 1],
  );
  assert.deepEqual(
    items.map((item) => item.id),
    before,
  );
});

test("a newly featured item drops the oldest featured row", () => {
  const current = [
    row(1, "2026-10-01T00:00:00.000Z"),
    row(2, "2026-10-02T00:00:00.000Z"),
    row(3, "2026-10-03T00:00:00.000Z"),
    row(4, "2026-10-04T00:00:00.000Z"),
    row(5, "2026-10-05T00:00:00.000Z"),
  ];

  const drop = featuredIdsToClear(current, row(9, "2026-10-27T12:00:00.000Z"));

  assert.deepEqual(drop, [1]);
});

test("fewer than five featured rows stay put", () => {
  const drop = featuredIdsToClear(
    [row(4, "2026-10-04T00:00:00.000Z"), row(2, "2026-10-22T00:00:00.000Z")],
    row(8, "2026-10-27T00:00:00.000Z"),
  );
  assert.deepEqual(drop, []);
});

test("rows without featured_at are the first to drop", () => {
  const current = [
    row(1, null, "2026-10-20T00:00:00.000Z"),
    row(2, "2026-10-02T00:00:00.000Z"),
    row(3, "2026-10-03T00:00:00.000Z"),
    row(4, "2026-10-04T00:00:00.000Z"),
    row(5, "2026-10-05T00:00:00.000Z"),
  ];

  assert.deepEqual(
    featuredIdsToClear(current, row(9, "2026-10-27T00:00:00.000Z")),
    [1],
  );
});

test("re-stamping an existing id does not duplicate it", () => {
  const current = [
    row(1, "2026-10-01T00:00:00.000Z", "2020-01-01T00:00:00.000Z"),
    row(2, "2026-10-02T00:00:00.000Z"),
    row(3, "2026-10-03T00:00:00.000Z"),
    row(4, "2026-10-04T00:00:00.000Z"),
    row(5, "2026-10-05T00:00:00.000Z"),
  ];

  const drop = featuredIdsToClear(current, row(1, "2026-10-27T00:00:00.000Z"));
  const kept = selectFeaturedWindow([
    ...current.filter((item) => item.id !== 1),
    row(1, "2026-10-27T00:00:00.000Z"),
  ]);

  assert.equal(drop.includes(1), false);
  assert.equal(kept[0]?.id, 1);
  assert.deepEqual(drop, []);
});

test("homepage query and the feature action share the cap of five", () => {
  const data = readFileSync(new URL("./data.ts", import.meta.url), "utf8");
  const actions = readFileSync(new URL("../app/admin/actions.ts", import.meta.url), "utf8");
  const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(data, /HOME_FEATURED_LIMIT/);
  assert.match(data, /featured_at/);
  assert.match(actions, /featuredIdsToClear/);
  assert.match(actions, /featured_at/);
  assert.match(home, /HOME_FEATURED_LIMIT/);
  assert.doesNotMatch(home, /getFeaturedItems\(8\)/);
});
