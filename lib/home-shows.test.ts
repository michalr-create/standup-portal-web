import assert from "node:assert/strict";
import { test } from "node:test";
import { selectHomeFormats } from "./home-shows.ts";

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
