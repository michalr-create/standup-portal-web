import assert from "node:assert/strict";
import { test } from "node:test";
import {
  REPORT_DAILY_LIMIT,
  reportLimitReached,
  validateContentReport,
  warsawDayStart,
} from "./content-report.ts";

test("a missing film needs a YouTube link and ignores a catalog id", () => {
  const watch = validateContentReport({
    kind: "missing_video",
    url: " https://www.youtube.com/watch?v=dQw4w9WgXcQ ",
    message: " nie ma go na portalu ",
    contentItemId: 4,
  });
  assert.equal(watch.ok, true);
  if (watch.ok) {
    assert.equal(watch.row.kind, "missing_video");
    assert.equal(watch.row.url, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    assert.equal(watch.row.contentItemId, null);
    assert.equal(watch.row.message, "nie ma go na portalu");
  }

  assert.equal(validateContentReport({ kind: "missing_video", url: "https://youtu.be/abc123" }).ok, true);
  assert.equal(
    validateContentReport({ kind: "missing_video", url: "https://www.youtube.com/shorts/abc123" }).ok,
    true,
  );
  const site = validateContentReport({ kind: "missing_video", url: "https://example.com/film" });
  assert.equal(site.ok, false);
  const empty = validateContentReport({ kind: "missing_video", url: "" });
  assert.equal(empty.ok, false);
});

test("a wrong tag needs the material and a note, and a new open mic needs a description", () => {
  const meta = validateContentReport({ kind: "wrong_meta", contentItemId: "12", message: "  zła osoba  " });
  assert.equal(meta.ok, true);
  if (meta.ok) {
    assert.equal(meta.row.contentItemId, 12);
    assert.equal(meta.row.message, "zła osoba");
    assert.equal(meta.row.url, null);
  }
  assert.equal(validateContentReport({ kind: "wrong_meta", contentItemId: 0, message: "zła osoba" }).ok, false);
  assert.equal(validateContentReport({ kind: "wrong_meta", contentItemId: 3, message: "   " }).ok, false);
  assert.equal(
    validateContentReport({ kind: "wrong_meta", contentItemId: 3, message: "a".repeat(2001) }).ok,
    false,
  );

  const mic = validateContentReport({
    kind: "new_open_mic",
    message: "Wtorki w Łodzi",
    url: "https://example.com/mic",
  });
  assert.equal(mic.ok, true);
  if (mic.ok) assert.equal(mic.row.url, "https://example.com/mic");
  assert.equal(validateContentReport({ kind: "new_open_mic", message: "Wtorki", url: "javascript:alert(1)" }).ok, false);
  assert.equal(validateContentReport({ kind: "new_open_mic", message: "" }).ok, false);
  assert.equal(validateContentReport({ kind: "ocena", message: "nie" }).ok, false);
});

test("the daily cap is ten and the window starts at Warsaw midnight", () => {
  assert.equal(REPORT_DAILY_LIMIT, 10);
  assert.equal(reportLimitReached(9), false);
  assert.equal(reportLimitReached(10), true);
  assert.equal(reportLimitReached(11), true);
  assert.equal(warsawDayStart(new Date("2026-11-21T10:00:00.000Z")).toISOString(), "2026-11-20T23:00:00.000Z");
  assert.equal(warsawDayStart(new Date("2026-07-12T00:30:00.000Z")).toISOString(), "2026-07-11T22:00:00.000Z");
});
