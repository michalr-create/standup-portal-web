import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { formatDuration, timeAgo } from "./format.ts";

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

const now = new Date(2026, 9, 25, 15, 0, 0).getTime();

function iso(y: number, m: number, d: number, hh = 15, mm = 0, ss = 0): string {
  return new Date(y, m - 1, d, hh, mm, ss).toISOString();
}

test("formatDuration uses M:SS under an hour and H:MM:SS from an hour", () => {
  assert.equal(formatDuration(null), "");
  assert.equal(formatDuration(Number.NaN), "");
  assert.equal(formatDuration(-1), "");
  assert.equal(formatDuration(0), "0:00");
  assert.equal(formatDuration(5), "0:05");
  assert.equal(formatDuration(59), "0:59");
  assert.equal(formatDuration(60), "1:00");
  assert.equal(formatDuration(65), "1:05");
  assert.equal(formatDuration(65.9), "1:05");
  assert.equal(formatDuration(3599), "59:59");
  assert.equal(formatDuration(3599.9), "59:59");
  assert.equal(formatDuration(3600), "1:00:00");
  assert.equal(formatDuration(3661), "1:01:01");
  assert.equal(formatDuration(3661.8), "1:01:01");
  assert.equal(formatDuration(36000), "10:00:00");
});

test("timeAgo uses one compact card style and Polish month abbreviations", () => {
  assert.equal(timeAgo(null, now), "");
  assert.equal(timeAgo("", now), "");
  assert.equal(timeAgo("not-a-date", now), "");

  assert.equal(timeAgo(iso(2026, 10, 25, 14, 30), now), "teraz");
  assert.equal(timeAgo(iso(2026, 10, 25, 14, 0), now), "1h");
  assert.equal(timeAgo(iso(2026, 10, 25, 12, 0), now), "3h");
  assert.equal(timeAgo(iso(2026, 10, 24, 16, 0), now), "23h");
  assert.equal(timeAgo(iso(2026, 10, 24, 15, 0), now), "wczoraj");
  assert.equal(timeAgo(iso(2026, 10, 23, 16, 0), now), "wczoraj");
  assert.equal(timeAgo(iso(2026, 10, 23, 15, 0), now), "2d");
  assert.equal(timeAgo(iso(2026, 10, 19, 15, 0), now), "6d");
  assert.equal(timeAgo(iso(2026, 10, 18, 15, 0), now), "18 pa\u017a");
  assert.equal(timeAgo(iso(2026, 1, 3, 15, 0), now), "3 sty");
  assert.equal(timeAgo(iso(2024, 10, 12, 15, 0), now), "12 pa\u017a");
  assert.equal(timeAgo(iso(2026, 12, 1, 15, 0), now), "1 gru");
});

test("card meta color clears AA on dark backgrounds", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const meta = css.match(/--paper-meta:\s*(#[0-9A-Fa-f]{6})/)?.[1];
  assert.ok(meta, "expected --paper-meta in globals.css");
  for (const bg of ["#0B0B0B", "#151514", "#14120E", "#100E0A"]) {
    assert.ok(contrast(meta, bg) >= 4.5, `${meta} on ${bg} is ${contrast(meta, bg).toFixed(2)}`);
  }
});
