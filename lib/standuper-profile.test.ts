import assert from "node:assert/strict";
import { test } from "node:test";
import { formatLabel, materialLabel, profileCountLabel, sortByDateDesc } from "./standuper-profile.ts";

test("profile count matches visible video cards and format cards", () => {
  assert.equal(profileCountLabel(0, 0), "0 materia\u0142\u00f3w");
  assert.equal(profileCountLabel(1, 0), "1 materia\u0142");
  assert.equal(profileCountLabel(2, 0), "2 materia\u0142y");
  assert.equal(profileCountLabel(5, 0), "5 materia\u0142\u00f3w");
  assert.equal(profileCountLabel(22, 0), "22 materia\u0142y");
  assert.equal(profileCountLabel(67, 0), "67 materia\u0142\u00f3w");
  assert.equal(profileCountLabel(0, 1), "1 format");
  assert.equal(profileCountLabel(0, 2), "2 formaty");
  assert.equal(profileCountLabel(0, 5), "5 format\u00f3w");
  assert.equal(profileCountLabel(12, 14), "12 materia\u0142\u00f3w \u00b7 14 format\u00f3w");
  assert.equal(profileCountLabel(67, 2), "67 materia\u0142\u00f3w \u00b7 2 formaty");
  assert.equal(materialLabel(11), "materia\u0142\u00f3w");
  assert.equal(formatLabel(4), "formaty");
});

test("sortByDateDesc orders sections newest first and keeps undated items last", () => {
  const items = [
    { id: "old", published_at: "2017-02-14T09:34:17+00:00" },
    { id: "none", published_at: null },
    { id: "new", published_at: "2026-10-18T09:59:07+00:00" },
    { id: "mid", published_at: "2020-04-01T16:00:32+00:00" },
    { id: "bad", published_at: "not-a-date" },
  ];

  assert.deepEqual(
    sortByDateDesc(items, (item) => item.published_at).map((item) => item.id),
    ["new", "mid", "old", "none", "bad"],
  );
});
