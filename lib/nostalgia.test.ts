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
  dailyNostalgiaPick,
  nostalgiaDaySeed,
  pickNostalgiaShelf,
  nostalgiaHits,
  warsawDateKey,
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

test("the Warsaw day keeps one nostalgia shelf and the next day changes it", () => {
  assert.equal(warsawDateKey(new Date("2026-11-21T22:30:00.000Z")), "2026-11-21");
  assert.equal(warsawDateKey(new Date("2026-11-21T23:30:00.000Z")), "2026-11-22");
  assert.equal(warsawDateKey(new Date("2026-07-21T21:30:00.000Z")), "2026-07-21");
  assert.equal(warsawDateKey(new Date("2026-07-21T22:30:00.000Z")), "2026-07-22");

  const pool = Array.from({ length: 30 }, (_, index) => ({ id: index + 1 }));
  const today = "2026-11-21";
  const tomorrow = "2026-11-22";
  assert.notEqual(nostalgiaDaySeed(today), nostalgiaDaySeed(tomorrow));
  const page = dailyNostalgiaPick(pool, 12, today);
  const again = dailyNostalgiaPick(pool, 12, today);
  const home = dailyNostalgiaPick(pool, 12, today).slice(0, HOME_NOSTALGIA_COUNT);
  const next = dailyNostalgiaPick(pool, 12, tomorrow);
  assert.deepEqual(page.map((item) => item.id), again.map((item) => item.id));
  assert.deepEqual(home.map((item) => item.id), page.slice(0, HOME_NOSTALGIA_COUNT).map((item) => item.id));
  assert.equal(new Set(page.map((item) => item.id)).size, 12);
  assert.notDeepEqual(page.map((item) => item.id), next.map((item) => item.id));
  const shuffled = pool.slice().sort((a, b) => b.id - a.id);
  assert.deepEqual(
    dailyNostalgiaPick(shuffled, 12, today).map((item) => item.id),
    page.map((item) => item.id),
  );
});

test("the home shelf is the start of the daily nostalgia pool", () => {
  assert.equal(HOME_NOSTALGIA_COUNT, 6);
  assert.ok(HOME_NOSTALGIA_COUNT < 12);
  const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const section = readFileSync(new URL("../app/components/HomeNostalgia.tsx", import.meta.url), "utf8");
  const data = readFileSync(new URL("./nostalgia-data.ts", import.meta.url), "utf8");
  const page = readFileSync(new URL("../app/nostalgia/page.tsx", import.meta.url), "utf8");
  const formaty = home.indexOf('title="Formaty"');
  const nostalgia = home.indexOf("<HomeNostalgia");
  const rankings = home.indexOf("<HomeRankings");
  assert.ok(formaty > 0 && nostalgia > formaty && rankings > nostalgia);
  assert.match(section, /title="Nostalgia"/);
  assert.match(section, /P\\u00f3\\u0142ka dnia/);
  assert.match(section, /linkHref="\/nostalgia"/);
  assert.match(section, /Zobacz wszystkie/);
  assert.match(section, /className="band"/);
  assert.match(section, /SectionHead/);
  assert.match(section, /<ScrollRow items=\{items\} \/>/);
  assert.doesNotMatch(section, /cookies\(/);
  assert.doesNotMatch(section, /Math\.random/);
  assert.match(data, /export async function getHomeNostalgia\(count = HOME_NOSTALGIA_COUNT, now = new Date\(\)\)/);
  assert.match(data, /dailyNostalgiaPick\(pool, count, warsawDateKey\(now\)\)/);
  assert.match(data, /\.slice\(0, count\)/);
  assert.doesNotMatch(data, /Math\.random/);
  assert.doesNotMatch(data, /pickNostalgiaShelf\(pool, excludeIds/);
  assert.match(page, /czasu warszawskiego/);
  assert.doesNotMatch(page, /cookies\(/);
  assert.doesNotMatch(page, /NostalgiaReroll/);
  assert.match(data, /\.gte\("duration_seconds", NOSTALGIA_MIN_SECONDS\)/);
  assert.match(data, /\.lt\("published_at", cutoff\)/);
});

test("the nostalgia cookie stores only the previous ids", () => {
  assert.deepEqual(parseNostalgiaCookie("12.4.nope.4.0"), [12, 4]);
  assert.equal(nostalgiaCookieValue([4, 4, -1, 12]), "4.12");
  assert.match(nostalgiaCookieAssignment([8, 9]), /^nostalgia_prev=8\.9; Path=\/; Max-Age=2592000; SameSite=Lax$/);
});
