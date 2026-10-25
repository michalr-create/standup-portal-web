import assert from "node:assert/strict";
import { test } from "node:test";
import { sortStandupTagChips, standupTagChipRank } from "./standupTagChipOrder.ts";

test("pins Special, Stand-up impro, then klipy ahead of the alphabetical tail", () => {
  const tags = [
    { slug: "zebra", name: "Zebra" },
    { slug: "klipy", name: "klipy" },
    { slug: "roast", name: "Roast" },
    { slug: "stand-up-impro", name: "Stand-up impro" },
    { slug: "alfa", name: "Alfa" },
    { slug: "special", name: "Special" },
  ];

  assert.deepEqual(
    sortStandupTagChips(tags).map((tag) => tag.slug),
    ["special", "stand-up-impro", "klipy", "alfa", "roast", "zebra"],
  );
});

test("matches close slugs and falls back to the stored name", () => {
  const tags = [
    { slug: "topic-klip", name: "Klipy" },
    { slug: "standup-impro", name: "Mango" },
    { slug: "format-x", name: "Stand-up impro" },
    { slug: "specjal", name: "Mango" },
    { slug: "misc", name: "Special" },
    { slug: "stand_up_improv", name: "Alfa" },
    { slug: "klip", name: "Zebra" },
  ];

  assert.deepEqual(
    sortStandupTagChips(tags).map((tag) => tag.slug),
    ["specjal", "misc", "stand_up_improv", "standup-impro", "format-x", "topic-klip", "klip"],
  );
});

test("slug wins when the name would point at a different preferred chip", () => {
  const tags = [
    { slug: "klipy", name: "Special" },
    { slug: "special", name: "klipy" },
  ];

  assert.deepEqual(
    sortStandupTagChips(tags).map((tag) => tag.slug),
    ["special", "klipy"],
  );
  assert.equal(standupTagChipRank(tags[0]), 2);
  assert.equal(standupTagChipRank(tags[1]), 0);
});

test("a bare impro tag stays in the alphabetical tail", () => {
  const tags = [
    { slug: "impro", name: "Impro" },
    { slug: "special", name: "Special" },
    { slug: "alfa", name: "Alfa" },
  ];

  assert.deepEqual(
    sortStandupTagChips(tags).map((tag) => tag.slug),
    ["special", "alfa", "impro"],
  );
});

test("the tail keeps Polish alphabetical order by stored name", () => {
  const tail = [
    { slug: "zart", name: "Żart" },
    { slug: "alfa", name: "Alfa" },
    { slug: "lza", name: "Łza" },
    { slug: "pelny-program", name: "pełny-program" },
  ];
  const sorted = sortStandupTagChips([
    ...tail,
    { slug: "special", name: "Special" },
  ]);

  assert.equal(sorted[0].slug, "special");
  assert.deepEqual(
    sorted.slice(1).map((tag) => tag.name),
    tail.map((tag) => tag.name).sort((a, b) => a.localeCompare(b, "pl")),
  );
});

test("does not mutate the input and drops no chips when a preferred tag is missing", () => {
  const tags = [
    { slug: "mango", name: "Mango" },
    { slug: "alfa", name: "Alfa" },
  ];
  const snapshot = tags.map((tag) => ({ ...tag }));

  assert.deepEqual(
    sortStandupTagChips(tags).map((tag) => tag.slug),
    ["alfa", "mango"],
  );
  assert.deepEqual(tags, snapshot);
});
