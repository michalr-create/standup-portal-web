import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canonicalSpecialIds,
  compareSpecialCandidates,
  planSpecialSlug,
  youtubeVideoId,
  type SpecialCandidate,
} from "./special-slug.ts";

function row(partial: Partial<SpecialCandidate> & Pick<SpecialCandidate, "id">): SpecialCandidate {
  return {
    url: null,
    externalId: null,
    description: null,
    durationSeconds: null,
    publishedAt: null,
    ...partial,
  };
}

test("youtube ids come from the watch url before external_id", () => {
  assert.equal(youtubeVideoId("https://www.youtube.com/watch?v=22YkF1zr_nk", "manual_1"), "22YkF1zr_nk");
  assert.equal(youtubeVideoId("https://youtu.be/abcdefghijk", null), "abcdefghijk");
  assert.equal(youtubeVideoId("https://sklep.example/wentyl", "paid:wentyl"), null);
  assert.equal(youtubeVideoId(null, "abcdefghijk"), "abcdefghijk");
});

test("the more complete row wins a shared YouTube id and id 47 never does", () => {
  const duplicate = row({
    id: 47,
    url: "https://www.youtube.com/watch?v=22YkF1zr_nk",
    externalId: "manual_1776416691624",
    description: "",
    durationSeconds: null,
    publishedAt: "2026-04-01T00:00:00.000Z",
  });
  const canonical = row({
    id: 3102,
    url: "https://www.youtube.com/watch?v=22YkF1zr_nk",
    externalId: "22YkF1zr_nk",
    description: "Opis programu, wystarczająco długi.",
    durationSeconds: 2540,
    publishedAt: "2025-03-21T00:00:00.000Z",
  });
  assert.ok(compareSpecialCandidates(canonical, duplicate) < 0);
  assert.deepEqual([...canonicalSpecialIds([duplicate, canonical])], [3102]);

  const older = row({
    id: 3,
    externalId: "abcdefghijk",
    description: "a",
    durationSeconds: 100,
    publishedAt: "2020-01-01T00:00:00.000Z",
  });
  const newer = row({
    id: 9,
    externalId: "abcdefghijk",
    description: "b",
    durationSeconds: 100,
    publishedAt: "2024-01-01T00:00:00.000Z",
  });
  assert.deepEqual([...canonicalSpecialIds([newer, older])], [3]);
});

test("approve allocates a slug and the editor can replace it", () => {
  const allocated = planSpecialSlug({
    id: 12,
    title: "Łukasz Lotek Lodkowski — Hardcore",
    currentSlug: null,
    eligible: true,
    taken: [],
  });
  assert.deepEqual(allocated, { action: "set", slug: "lukasz-lotek-lodkowski-hardcore" });

  const custom = planSpecialSlug({
    id: 12,
    title: "Łukasz Lotek Lodkowski — Hardcore",
    currentSlug: "lukasz-lotek-lodkowski-hardcore",
    explicitSlug: "hardcore",
    eligible: true,
    taken: [],
  });
  assert.deepEqual(custom, { action: "set", slug: "hardcore" });

  const taken = planSpecialSlug({
    id: 12,
    title: "Hardcore",
    currentSlug: null,
    explicitSlug: "hardcore",
    eligible: true,
    taken: ["hardcore"],
  });
  assert.equal(taken.action, "error");

  const excluded = planSpecialSlug({
    id: 47,
    title: "Tomasz Boras",
    currentSlug: null,
    explicitSlug: "tomasz-boras",
    eligible: true,
    taken: [],
  });
  assert.equal(excluded.action, "error");
});
