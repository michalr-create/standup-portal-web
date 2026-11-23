import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildProfileBlocks,
  formatLabel,
  materialLabel,
  PROFILE_ROW_LIMIT,
  profileCountLabel,
  profileTourLabel,
  profileVideoCount,
  sortByDateDesc,
  type ProfileShelfItem,
} from "./standuper-profile.ts";

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

const NOW = new Date("2026-11-23T12:00:00.000Z");

function shelf(partial: Partial<ProfileShelfItem> & Pick<ProfileShelfItem, "id">): ProfileShelfItem {
  return {
    published_at: "2024-06-01T00:00:00.000Z",
    show_id: null,
    categorySlug: "standup",
    categoryName: "Standup",
    duration_seconds: 600,
    tags: [],
    ...partial,
  };
}

test("profile tour button names the count and hides when there is nothing upcoming", () => {
  assert.equal(profileTourLabel(0), null);
  assert.equal(profileTourLabel(-3), null);
  assert.equal(profileTourLabel(Number.NaN), null);
  assert.equal(profileTourLabel(12), "Trasy (12)");
  assert.equal(profileTourLabel(1.9), "Trasy (1)");
});

test("profile rows keep twelve newest cards per category and link only filtered listings", () => {
  assert.equal(PROFILE_ROW_LIMIT, 12);
  const standup = Array.from({ length: 13 }, (_, index) =>
    shelf({
      id: index + 1,
      published_at: `2024-01-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
      categorySlug: "standup",
    }),
  );
  const blocks = buildProfileBlocks(
    [
      ...standup,
      shelf({
        id: 100,
        categorySlug: "standup",
        tags: [{ slug: "special" }],
        published_at: "2025-02-01T00:00:00.000Z",
      }),
      shelf({
        id: 101,
        categorySlug: "wywiady",
        categoryName: "Wywiady",
        published_at: "2023-01-01T00:00:00.000Z",
      }),
      shelf({
        id: 102,
        categorySlug: "shorts",
        categoryName: "Shorts",
        duration_seconds: 4000,
        published_at: "2018-01-01T00:00:00.000Z",
        tags: [{ slug: "special" }],
      }),
      shelf({ id: 103, categorySlug: "formaty", categoryName: "Formaty", show_id: 7 }),
      shelf({ id: 104, categorySlug: "kulisy", categoryName: "Kulisy" }),
      shelf({
        id: 200,
        categorySlug: "varia",
        categoryName: "Varia",
        published_at: "2022-01-01T00:00:00.000Z",
      }),
      shelf({
        id: 201,
        categorySlug: "archiwum",
        categoryName: "Archiwum",
        published_at: "2022-05-01T00:00:00.000Z",
      }),
    ],
    [],
    { now: NOW, defaultShowIds: new Set([7]), showDate: () => null },
  );

  const standupBlock = blocks.find((block) => block.key === "standup");
  assert.ok(standupBlock);
  assert.equal(standupBlock.total, 13);
  assert.equal(standupBlock.items.length, 12);
  assert.equal(standupBlock.items[0]?.id, 13);
  assert.equal(standupBlock.listingPath, "/standup");

  const specials = blocks.find((block) => block.key === "special");
  assert.equal(specials?.listingPath, "/specjale");
  assert.deepEqual(specials?.items.map((item) => item.id), [100, 102]);

  assert.equal(blocks.find((block) => block.key === "wywiady")?.listingPath, "/wywiady");
  assert.equal(blocks.find((block) => block.key === "kulisy")?.listingPath, "/kulisy");
  assert.equal(blocks.find((block) => block.key === "formaty"), undefined);
  assert.equal(blocks.some((block) => block.items.some((item) => item.id === 103)), false);

  const keys = blocks.map((block) => block.key);
  assert.deepEqual(keys.slice(0, 4), ["special", "standup", "wywiady", "kulisy"]);
  assert.deepEqual(keys.slice(-2), ["archiwum", "varia"]);
  assert.equal(blocks.find((block) => block.key === "archiwum")?.listingPath, null);
  assert.equal(blocks.find((block) => block.key === "varia")?.label, "Varia");
  assert.equal(blocks.find((block) => block.key === "nostalgia"), undefined);
});

test("nostalgia is the old specials that do not already sit on the Specjale row", () => {
  const recent = Array.from({ length: 12 }, (_, index) =>
    shelf({
      id: index + 1,
      tags: [{ slug: "special" }],
      published_at: `2024-06-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
      duration_seconds: 4000,
    }),
  );
  const old = shelf({
    id: 50,
    tags: [{ slug: "special" }],
    published_at: "2018-03-01T00:00:00.000Z",
    duration_seconds: 3600,
    categorySlug: "standup",
  });
  const blocks = buildProfileBlocks([...recent, old], [], {
    now: NOW,
    defaultShowIds: new Set(),
    showDate: () => null,
  });
  const nostalgia = blocks.find((block) => block.key === "nostalgia");
  assert.equal(nostalgia?.label, "Nostalgia");
  assert.equal(nostalgia?.listingPath, null);
  assert.deepEqual(nostalgia?.items.map((item) => item.id), [50]);
  assert.equal(nostalgia?.total, 1);
  assert.equal(blocks.find((block) => block.key === "special")?.total, 13);
  assert.equal(profileVideoCount(blocks), 13);

  const onlyOld = buildProfileBlocks([old], [], {
    now: NOW,
    defaultShowIds: new Set(),
    showDate: () => null,
  });
  assert.equal(onlyOld.find((block) => block.key === "nostalgia"), undefined);
  assert.deepEqual(onlyOld.find((block) => block.key === "special")?.items.map((item) => item.id), [50]);
});

test("format row keeps hosted shows and loose episodes, newest show first", () => {
  const shows = [
    { id: "old-show", latestDate: "2020-01-01T00:00:00.000Z" },
    { id: "new-show", latestDate: "2025-01-01T00:00:00.000Z" },
  ];
  const blocks = buildProfileBlocks(
    [
      shelf({ id: 1, categorySlug: "formaty", show_id: 9, published_at: "2024-01-01T00:00:00.000Z" }),
      shelf({ id: 2, categorySlug: "formaty", show_id: null, published_at: "2025-08-01T00:00:00.000Z" }),
      shelf({ id: 3, categorySlug: "roast", categoryName: "Roast" }),
    ],
    shows,
    {
      now: NOW,
      defaultShowIds: new Set([9]),
      showDate: (show) => show.latestDate,
    },
  );
  const formaty = blocks.find((block) => block.kind === "formaty");
  assert.ok(formaty && formaty.kind === "formaty");
  assert.equal(formaty.listingPath, null);
  assert.deepEqual(formaty.shows.map((show) => show.id), ["new-show", "old-show"]);
  assert.deepEqual(formaty.items.map((item) => item.id), [2]);
  assert.equal(formaty.total, 1);
  assert.deepEqual(blocks.map((block) => block.key), ["formaty", "roast"]);
  assert.equal(blocks.find((block) => block.key === "roast")?.listingPath, "/roast");
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
