import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { dedupeSearchItems, normalizeSearchTitle, splitSearchHighlight } from "./search.ts";

function channel(hex: string, offset: number): number {
  const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function contrast(fg: string, bg: string): number {
  const lum = (hex: string) =>
    0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);
  const lighter = Math.max(lum(fg), lum(bg));
  const darker = Math.min(lum(fg), lum(bg));
  return (lighter + 0.05) / (darker + 0.05);
}

test("normalizeSearchTitle folds case, dashes, and extra space", () => {
  assert.equal(
    normalizeSearchTitle("Magda Kubicka - Parkowanie"),
    normalizeSearchTitle("Magda Kubicka — Parkowanie"),
  );
  assert.equal(normalizeSearchTitle("  BÓL   PLECÓW "), "ból pleców");
  assert.equal(normalizeSearchTitle("KiLKA SŁÓW NA DZiŚ🎙️"), "kilka słów na dziś");
  assert.equal(normalizeSearchTitle("KiLKA SŁÓW NA DZiŚ 🎙️"), "kilka słów na dziś");
  assert.equal(normalizeSearchTitle("🖤"), "🖤");
  assert.equal(normalizeSearchTitle("—"), "");
});

test("dedupe keeps the newest normalized title and the newest episode group", () => {
  const kept = dedupeSearchItems([
    { id: 1, title: "Magda Kubicka - Parkowanie", published_at: "2023-01-09T16:49:09Z", episode_group_id: null },
    { id: 2, title: "Magda Kubicka — Parkowanie", published_at: "2025-02-02T12:15:47Z", episode_group_id: null },
    { id: 3, title: "Magda Kubicka - Parkowanie", published_at: "2025-04-27T19:22:33Z", episode_group_id: "  " },
    { id: 4, title: "Parkowanie #shorts #humor", published_at: "2022-08-19T14:17:57Z", episode_group_id: null },
    { id: 5, title: "Wentyl (audio)", published_at: "2024-02-01T00:00:00Z", episode_group_id: "grp_1" },
    { id: 6, title: "Wentyl", published_at: "2024-06-01T00:00:00Z", episode_group_id: "grp_1" },
    { id: 7, title: "Batman", published_at: "2024-01-01T00:00:00Z", episode_group_id: "grp_a" },
    { id: 8, title: "Batman", published_at: "2025-01-01T00:00:00Z", episode_group_id: "grp_b" },
    { id: 9, title: "Batman", published_at: "2023-01-01T00:00:00Z", episode_group_id: null },
    { id: 10, title: "🖤", published_at: "2025-07-18T19:05:26Z", episode_group_id: null },
    { id: 11, title: "🖤", published_at: "2025-07-18T19:34:38Z", episode_group_id: null },
    { id: 12, title: "😅", published_at: "2025-09-21T13:01:33Z", episode_group_id: null },
    { id: 13, title: "—", published_at: null, episode_group_id: null },
    { id: 14, title: "—", published_at: null, episode_group_id: null },
  ]);

  assert.deepEqual(
    kept.map((item) => item.id),
    [12, 11, 3, 8, 6, 7, 9, 4, 13, 14],
  );
});

test("dedupe tie on published_at keeps the earlier input row", () => {
  const kept = dedupeSearchItems([
    { id: 2, title: "Foo", published_at: "2024-01-01T00:00:00Z", episode_group_id: null },
    { id: 1, title: "foo", published_at: "2024-01-01T00:00:00Z", episode_group_id: null },
  ]);
  assert.equal(kept.length, 1);
  assert.equal(kept[0].id, 2);
});

test("splitSearchHighlight marks the phrase without swallowing neighbors or regex chars", () => {
  assert.deepEqual(splitSearchHighlight("Magda Kubicka - Parkowanie", "parkowanie"), [
    { text: "Magda Kubicka - ", match: false },
    { text: "Parkowanie", match: true },
  ]);
  assert.deepEqual(splitSearchHighlight("Ból pleców", "ból"), [
    { text: "Ból", match: true },
    { text: " pleców", match: false },
  ]);
  assert.deepEqual(splitSearchHighlight("ab ab", "ab"), [
    { text: "ab", match: true },
    { text: " ", match: false },
    { text: "ab", match: true },
  ]);
  assert.deepEqual(splitSearchHighlight("PARKOWANIA", "parkowanie"), [
    { text: "PARKOWANIA", match: false },
  ]);
  assert.deepEqual(splitSearchHighlight("axb", "a.b"), [{ text: "axb", match: false }]);
  assert.deepEqual(splitSearchHighlight("a.b", "a.b"), [{ text: "a.b", match: true }]);
  assert.deepEqual(splitSearchHighlight("Foo", "   "), [{ text: "Foo", match: false }]);
});

test("search mark ink on gold clears AA", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const block = css.match(/\.search-mark\s*\{[^}]*\}/)?.[0];
  assert.ok(block, "expected .search-mark in globals.css");
  const background = block.match(/background:\s*(#[0-9A-Fa-f]{6})/)?.[1];
  const color = block.match(/color:\s*(#[0-9A-Fa-f]{6})/)?.[1];
  assert.equal(background?.toLowerCase(), "#f6de7a");
  assert.equal(color?.toLowerCase(), "#0b0b0b");
  assert.ok(contrast(color!, background!) >= 4.5);
});
