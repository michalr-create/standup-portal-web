import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  HOME_NOSTALGIA_COUNT,
  NOSTALGIA_MIN_SECONDS,
  isNostalgiaCandidate,
  nostalgiaCookieAssignment,
  nostalgiaCookieValue,
  parseNostalgiaCookie,
  pickNostalgiaShelf,
  nostalgiaHits,
} from "./nostalgia.ts";

const now = new Date("2026-11-21T12:00:00.000Z");

test("nostalgia keeps full specials older than five years", () => {
  assert.equal(NOSTALGIA_MIN_SECONDS, 1800);
  assert.equal(isNostalgiaCandidate({
    publishedAt: "2021-11-20T12:00:00.000Z",
    durationSeconds: 1800,
  }, now), true);
  assert.equal(isNostalgiaCandidate({
    publishedAt: "2021-11-21T12:00:00.000Z",
    durationSeconds: 4000,
  }, now), false);
  assert.equal(isNostalgiaCandidate({
    publishedAt: "2018-01-01T00:00:00.000Z",
    durationSeconds: 1799,
  }, now), false);
  assert.equal(isNostalgiaCandidate({ publishedAt: null, durationSeconds: 2000 }, now), false);
});

test("the next shelf excludes the previous ids until the pool runs out", () => {
  const pool = Array.from({ length: 20 }, (_, index) => ({ id: index + 1 }));
  const random = () => 0;
  const first = pickNostalgiaShelf(pool, [], 8, random);
  assert.equal(first.length, 8);
  assert.equal(new Set(first.map((item) => item.id)).size, 8);
  const second = pickNostalgiaShelf(pool, first.map((item) => item.id), 8, random);
  const overlap = second.filter((item) => first.some((prev) => prev.id === item.id));
  assert.equal(overlap.length, 0);

  const tiny = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const filled = pickNostalgiaShelf(tiny, [1, 2], 12, random);
  assert.deepEqual(filled.map((item) => item.id).sort((a, b) => a - b), [1, 2, 3]);
  assert.equal(pickNostalgiaShelf([], [1], 12, random).length, 0);
});

test("hits are the top view counts from the same pool", () => {
  const hits = nostalgiaHits([
    { id: 1, viewCount: 10 },
    { id: 2, viewCount: null },
    { id: 3, viewCount: 50 },
    { id: 4, viewCount: 50 },
  ], 2);
  assert.deepEqual(hits.map((item) => item.id), [3, 4]);
});

test("the home shelf is a few random specials from the nostalgia pool", () => {
  assert.equal(HOME_NOSTALGIA_COUNT, 6);
  assert.ok(HOME_NOSTALGIA_COUNT < 12);
  const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const section = readFileSync(new URL("../app/components/HomeNostalgia.tsx", import.meta.url), "utf8");
  const data = readFileSync(new URL("./nostalgia-data.ts", import.meta.url), "utf8");
  const specjale = home.indexOf('title="Specjale"');
  const nostalgia = home.indexOf("<HomeNostalgia");
  const formaty = home.indexOf('title="Formaty"');
  assert.ok(specjale > 0 && nostalgia > specjale && formaty > nostalgia);
  assert.match(section, /title="Nostalgia"/);
  assert.match(section, /Specjale starsze ni\\u017c 5 lat/);
  assert.match(section, /linkHref="\/nostalgia"/);
  assert.match(section, /Zobacz wszystkie/);
  assert.match(section, /className="band"/);
  assert.match(section, /SectionHead/);
  assert.match(section, /<ScrollRow items=\{items\} \/>/);
  assert.doesNotMatch(section, /cookies\(/);
  assert.match(data, /export async function getHomeNostalgia\(count = HOME_NOSTALGIA_COUNT\)/);
  assert.match(data, /const pool = await nostalgiaPool\(\);\s*const shelf = pickNostalgiaShelf\(pool, \[\], count\);/);
  assert.match(data, /\.gte\("duration_seconds", NOSTALGIA_MIN_SECONDS\)/);
  assert.match(data, /\.lt\("published_at", cutoff\)/);
});

test("the nostalgia cookie stores only the previous ids", () => {
  assert.deepEqual(parseNostalgiaCookie("12.4.nope.4.0"), [12, 4]);
  assert.equal(nostalgiaCookieValue([4, 4, -1, 12]), "4.12");
  assert.match(nostalgiaCookieAssignment([8, 9]), /^nostalgia_prev=8\.9; Path=\/; Max-Age=2592000; SameSite=Lax$/);
});
