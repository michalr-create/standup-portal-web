import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  MIN_PERCENT_BASE,
  PENDING_RANKING_MESSAGE,
  dedupeByExternalId,
  describeViewsWindow,
  isWithinPastDays,
  parseRankingQuery,
  percentHeading,
  qualifiesForPeopleViews,
  rankPeopleBySpecials,
  rankPeopleByViews,
  rankShows,
  rankingHref,
  topByViewCount,
  viewsWindowPhrase,
  weeklyHeading,
} from "./rankings.ts";

const today = "2026-11-21";

test("the weekly window shrinks to the snapshot dates that exist", () => {
  assert.deepEqual(describeViewsWindow(["2026-11-21"], today), {
    windowDays: 1,
    snapshotDays: 1,
    ready: false,
  });
  assert.deepEqual(describeViewsWindow(["2026-11-20", "2026-11-21"], today), {
    windowDays: 2,
    snapshotDays: 2,
    ready: true,
  });
  assert.deepEqual(
    describeViewsWindow(["2026-11-15", "2026-11-18", "2026-11-21"], today),
    { windowDays: 7, snapshotDays: 3, ready: true },
  );
  assert.deepEqual(describeViewsWindow(["2026-11-01", "2026-11-21"], today), {
    windowDays: 1,
    snapshotDays: 1,
    ready: false,
  });
});

test("window phrase follows the Polish day forms used on the page", () => {
  assert.equal(viewsWindowPhrase(1), "za ostatni dzie\u0144");
  assert.equal(viewsWindowPhrase(2), "za ostatnie 2 dni");
  assert.equal(viewsWindowPhrase(7), "za ostatnie 7 dni");
  assert.equal(weeklyHeading(3, true), "Hity tygodnia za ostatnie 3 dni");
  assert.equal(weeklyHeading(1, false), "Hity tygodnia");
  assert.equal(percentHeading(2, true), "Zyskuj\u0105ce za ostatnie 2 dni");
  assert.equal(PENDING_RANKING_MESSAGE, "Ranking ruszy jutro.");
});

test("ranking query defaults to weekly hits and keeps a valid year", () => {
  const now = new Date("2026-11-21T12:00:00.000Z");
  assert.deepEqual(parseRankingQuery({}, now), { ranking: "hity", scope: "all", year: 2026 });
  assert.deepEqual(parseRankingQuery({ ranking: "nope", zakres: "standup", rok: "2018" }, now), {
    ranking: "hity",
    scope: "standup_special",
    year: 2018,
  });
  assert.deepEqual(parseRankingQuery({ ranking: "specjale", rok: "1990" }, now).ranking, "specjale");
  assert.equal(parseRankingQuery({ rok: "1800" }, now).year, 2026);
  assert.equal(rankingHref({ ranking: "hity", scope: "all" }, 2026), "/rankingi");
  assert.equal(
    rankingHref({ ranking: "hity", scope: "standup_special" }, 2026),
    "/rankingi?zakres=standup",
  );
  assert.equal(rankingHref({ ranking: "specjale", year: 2026 }, 2026), "/rankingi?ranking=specjale");
  assert.equal(
    rankingHref({ ranking: "specjale", year: 2018 }, 2026),
    "/rankingi?ranking=specjale&rok=2018",
  );
});

test("external ids collapse to the higher view count", () => {
  const rows = topByViewCount([
    { id: 2, externalId: "abc", viewCount: 10 },
    { id: 1, externalId: "abc", viewCount: 50 },
    { id: 3, externalId: "  ", viewCount: 5 },
    { id: 4, externalId: null, viewCount: 40 },
  ], 10);
  assert.deepEqual(rows.map((row) => row.id), [1, 4, 3]);
  assert.equal(dedupeByExternalId([
    { id: 9, externalId: "same", viewCount: 3 },
    { id: 8, externalId: "same", viewCount: 3 },
  ])[0]?.id, 8);
});

test("month membership is the last 30 days and people totals do not double-count", () => {
  const now = new Date("2026-11-21T00:00:00.000Z");
  assert.equal(isWithinPastDays("2026-10-22T00:00:00.000Z", now, 30), true);
  assert.equal(isWithinPastDays("2026-10-21T00:00:00.000Z", now, 30), false);
  const person = { id: 1, name: "Ala", slug: "ala", photoUrl: null };
  const ranked = rankPeopleByViews([
    { id: 10, viewCount: 100, people: [person, person] },
    { id: 11, viewCount: 40, people: [person, { id: 2, name: "Bar", slug: "bar", photoUrl: null }] },
  ], 10);
  assert.equal(ranked[0]?.viewCount, 140);
  assert.equal(ranked[0]?.titleCount, 2);
  assert.equal(ranked[1]?.viewCount, 40);
  assert.equal(qualifiesForPeopleViews({
    contentType: "video",
    categorySlug: "wywiady",
    viewCount: 10,
    isSpecial: true,
  }), true);
  assert.equal(qualifiesForPeopleViews({
    contentType: "short",
    categorySlug: "standup",
    viewCount: 10,
    isSpecial: false,
  }), false);
  assert.equal(MIN_PERCENT_BASE, 20_000);
});

test("specials and shows sort by the public totals", () => {
  const ala = { id: 1, name: "Ala", slug: "ala", photoUrl: null };
  const bar = { id: 2, name: "Bar", slug: "bar", photoUrl: null };
  const specials = rankPeopleBySpecials([
    { id: 1, people: [ala] },
    { id: 2, people: [ala, bar] },
  ], 10);
  assert.equal(specials[0]?.specialCount, 2);
  assert.equal(specials[1]?.slug, "bar");
  const shows = rankShows(
    [
      { id: 1, showId: 7, viewCount: 10, publishedAt: "2020-01-01T00:00:00.000Z", thumbnailUrl: "old", durationSeconds: 1 },
      { id: 2, showId: 7, viewCount: null, publishedAt: "2024-01-01T00:00:00.000Z", thumbnailUrl: "new", durationSeconds: 9 },
      { id: 3, showId: 8, viewCount: 100, publishedAt: null, thumbnailUrl: null, durationSeconds: null },
    ],
    [
      { id: 7, name: "Wahanie", slug: "wahanie", isActive: true },
      { id: 8, name: "Ciche", slug: "ciche", isActive: false },
    ],
    10,
  );
  assert.equal(shows.length, 1);
  assert.equal(shows[0]?.viewCount, 10);
  assert.equal(shows[0]?.episodeCount, 2);
  assert.equal(shows[0]?.thumbnailUrl, "new");
});

test("nav and both pages link the new sections", () => {
  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const ranking = readFileSync(new URL("../app/rankingi/page.tsx", import.meta.url), "utf8");
  const nostalgia = readFileSync(new URL("../app/nostalgia/page.tsx", import.meta.url), "utf8");
  const reroll = readFileSync(new URL("../app/nostalgia/NostalgiaReroll.tsx", import.meta.url), "utf8");
  const cards = readFileSync(new URL("../app/components/RankingCards.tsx", import.meta.url), "utf8");
  assert.match(layout, /href: "\/rankingi", label: "Rankingi"/);
  assert.match(layout, /href: "\/nostalgia", label: "Nostalgia"/);
  assert.match(ranking, /Ranking ruszy jutro/);
  assert.match(ranking, /Standup i specjale/);
  assert.match(nostalgia, /NostalgiaReroll/);
  assert.match(nostalgia, /Nostalgiczne hity/);
  assert.match(reroll, /Wylosuj inne/);
  assert.match(cards, /VideoModal/);
});
