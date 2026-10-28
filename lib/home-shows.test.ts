import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  DRAWER_FORMAT_LIMIT,
  FOOTER_FORMAT_LIMIT,
  footerShows,
  selectHomeFormats,
} from "./home-shows.ts";

const now = new Date("2026-10-25T12:00:00.000Z");

function row(id: string, latestDate: string | null) {
  return { id, latestDate };
}

test("keeps at most 8 formats, newest episode first", () => {
  const sections = Array.from({ length: 10 }, (_, i) =>
    row(`s${i}`, new Date(Date.UTC(2026, 9, 20 - i, 12)).toISOString()),
  );

  const selected = selectHomeFormats(sections, { now });

  assert.equal(selected.length, 8);
  assert.deepEqual(
    selected.map((section) => section.id),
    ["s0", "s1", "s2", "s3", "s4", "s5", "s6", "s7"],
  );
});

test("drops formats with no episode in the last 12 months", () => {
  const sections = [
    row("stale", "2025-10-25T11:59:59.999Z"),
    row("boundary", "2025-10-25T12:00:00.000Z"),
    row("recent", "2026-09-01T00:00:00.000Z"),
    row("missing", null),
    row("invalid", "not-a-date"),
    row("ancient", "2020-01-01T00:00:00.000Z"),
  ];

  const selected = selectHomeFormats(sections, { now });

  assert.deepEqual(
    selected.map((section) => section.id),
    ["recent", "boundary"],
  );
});

test("stale formats do not take a slot among the eight", () => {
  const recent = Array.from({ length: 9 }, (_, i) =>
    row(`live-${i}`, new Date(Date.UTC(2026, 8, 30 - i, 12)).toISOString()),
  );
  const stale = [
    row("old-a", "2024-01-01T00:00:00.000Z"),
    row("old-b", "2025-01-01T00:00:00.000Z"),
  ];

  const selected = selectHomeFormats([...stale, ...recent], { now });

  assert.equal(selected.length, 8);
  assert.equal(selected.some((section) => section.id.startsWith("old-")), false);
  assert.equal(selected[0]?.id, "live-0");
  assert.equal(selected.some((section) => section.id === "live-8"), false);
});

test("does not reorder the input list", () => {
  const sections = [
    row("b", "2026-08-01T00:00:00.000Z"),
    row("a", "2026-09-01T00:00:00.000Z"),
  ];
  const before = sections.map((section) => section.id);

  selectHomeFormats(sections, { now });

  assert.deepEqual(
    sections.map((section) => section.id),
    before,
  );
});

test("footer shows are the six newest episodes inside the home window", () => {
  assert.equal(FOOTER_FORMAT_LIMIT, 6);
  const sections = [
    row("alpha-stale", "2024-01-01T00:00:00.000Z"),
    row("no-date", null),
    row("invalid", "not-a-date"),
    ...Array.from({ length: 7 }, (_, i) =>
      row(`live-${i}`, new Date(Date.UTC(2026, 9, 20 - i, 12)).toISOString()),
    ),
  ];

  const selected = footerShows(sections, FOOTER_FORMAT_LIMIT, { now });

  assert.deepEqual(
    selected.map((section) => section.id),
    ["live-0", "live-1", "live-2", "live-3", "live-4", "live-5"],
  );
  assert.deepEqual(
    selected.map((section) => section.id),
    selectHomeFormats(sections, { now, limit: FOOTER_FORMAT_LIMIT }).map((section) => section.id),
  );
});

test("drawer shows use the same window and keep eight newest", () => {
  assert.equal(DRAWER_FORMAT_LIMIT, 8);
  const sections = Array.from({ length: 10 }, (_, i) =>
    row(`s${i}`, new Date(Date.UTC(2026, 9, 20 - i, 12)).toISOString()),
  );

  const drawer = footerShows(sections, DRAWER_FORMAT_LIMIT, { now });
  const footer = footerShows(sections, FOOTER_FORMAT_LIMIT, { now });

  assert.equal(drawer.length, 8);
  assert.deepEqual(
    drawer.map((section) => section.id),
    ["s0", "s1", "s2", "s3", "s4", "s5", "s6", "s7"],
  );
  assert.deepEqual(
    footer.map((section) => section.id),
    drawer.slice(0, FOOTER_FORMAT_LIMIT).map((section) => section.id),
  );
});

test("footer helper does not reorder the input list", () => {
  const sections = [
    row("b", "2026-08-01T00:00:00.000Z"),
    row("a", "2026-09-01T00:00:00.000Z"),
  ];
  const before = sections.map((section) => section.id);

  footerShows(sections, FOOTER_FORMAT_LIMIT, { now });

  assert.deepEqual(
    sections.map((section) => section.id),
    before,
  );
});

test("layout lists active formats by episode date; catalog page stays untouched", () => {
  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const formaty = readFileSync(new URL("../app/formaty/page.tsx", import.meta.url), "utf8");
  const data = readFileSync(new URL("./data.ts", import.meta.url), "utf8");

  assert.match(layout, /getShowsWithLatestEpisode/);
  assert.match(layout, /footerShows\(showActivity, DRAWER_FORMAT_LIMIT\)/);
  assert.match(layout, /footerShows\(showActivity, FOOTER_FORMAT_LIMIT\)/);
  assert.match(layout, /Wszystkie formaty/);
  assert.doesNotMatch(layout, /getAllShows\(/);
  assert.doesNotMatch(layout, /shows\.slice\(0,\s*[68]\)/);
  assert.match(formaty, /getLatestPerShow/);
  assert.doesNotMatch(formaty, /footerShows/);
  assert.match(data, /export async function getAllShows[\s\S]*?\.order\("name"\)/);
});
