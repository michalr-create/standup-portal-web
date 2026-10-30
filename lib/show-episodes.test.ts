import assert from "node:assert/strict";
import { test } from "node:test";
import { PUBLIC_LISTING_PAGE_SIZE } from "./category-browse.ts";
import { mergeShowEpisodes, pageShowEpisodes, type EpisodeStamp } from "./show-episodes.ts";

function stamp(id: number, published_at: string | null): EpisodeStamp {
  return { id, published_at };
}

test("show episodes merge newest first and count each item once", () => {
  const byShow = [
    stamp(1, "2024-01-01T00:00:00.000Z"),
    stamp(2, "2026-05-01T00:00:00.000Z"),
    stamp(3, "2026-05-01T00:00:00.000Z"),
  ];
  const bySource = [
    stamp(2, "2026-05-01T00:00:00.000Z"),
    stamp(4, null),
    stamp(5, "2025-03-01T00:00:00.000Z"),
  ];

  const merged = mergeShowEpisodes(byShow, bySource);

  assert.deepEqual(merged.map((episode) => episode.id), [3, 2, 5, 1, 4]);
  assert.equal(merged.length, 5);
});

test("episode page total is the full show, including a window past the end", () => {
  const episodes = Array.from({ length: 25 }, (_, index) => stamp(index + 1, `2026-01-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`));
  const merged = mergeShowEpisodes(episodes);

  const first = pageShowEpisodes(merged, 0, PUBLIC_LISTING_PAGE_SIZE);
  assert.equal(first.total, 25);
  assert.equal(first.episodes.length, 24);
  assert.equal(first.episodes[0]?.id, 25);

  const last = pageShowEpisodes(merged, PUBLIC_LISTING_PAGE_SIZE, PUBLIC_LISTING_PAGE_SIZE);
  assert.equal(last.total, 25);
  assert.equal(last.episodes.length, 1);
  assert.equal(last.episodes[0]?.id, 1);

  const pastEnd = pageShowEpisodes(merged, PUBLIC_LISTING_PAGE_SIZE * 4, PUBLIC_LISTING_PAGE_SIZE);
  assert.equal(pastEnd.total, 25);
  assert.equal(pastEnd.episodes.length, 0);

  const empty = pageShowEpisodes([], 48, PUBLIC_LISTING_PAGE_SIZE);
  assert.equal(empty.total, 0);
  assert.deepEqual(empty.episodes, []);
});
