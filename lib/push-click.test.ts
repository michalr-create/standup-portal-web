import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { planNotificationClick, type PushWindow } from "./push-click.ts";

const ORIGIN = "https://parska.pl";

function windowAt(url: string, extras: Partial<PushWindow> = {}): PushWindow {
  return { url, canFocus: true, canNavigate: true, ...extras };
}

test("an open parska window is focused when it is already on the deep link", () => {
  const target = "https://parska.pl/?film=4&v=abcdefghijk&zrodlo=push";
  const plan = planNotificationClick(
    [windowAt("https://parska.pl/standup"), windowAt(target, { focused: false })],
    target,
    ORIGIN,
  );
  assert.equal(plan.focusOnly, 1);
  assert.deepEqual(plan.navigate, []);
  assert.equal(plan.openWindow, false);
});

test("a same-origin deep link navigates the focused parska window before the others", () => {
  const plan = planNotificationClick(
    [
      windowAt("https://parska.pl/standup"),
      windowAt("https://parska.pl/ulubione", { focused: true }),
      windowAt("https://parska.pl/trasy"),
    ],
    "/?film=4&v=abcdefghijk&zrodlo=push",
    ORIGIN,
  );
  assert.equal(plan.focusOnly, null);
  assert.deepEqual(plan.navigate, [1, 0, 2]);
  assert.equal(plan.openWindow, true);
});

test("an older YouTube notification opens a new window and does not navigate parska", () => {
  const plan = planNotificationClick(
    [windowAt("https://parska.pl/", { focused: true })],
    "https://www.youtube.com/watch?v=abcdefghijk",
    ORIGIN,
  );
  assert.equal(plan.focusOnly, null);
  assert.deepEqual(plan.navigate, []);
  assert.equal(plan.openWindow, true);
});

test("a lookalike origin is not treated as parska", () => {
  const plan = planNotificationClick(
    [windowAt("https://parska.pl.evil.com/", { focused: true })],
    "https://parska.pl.evil.com/watch",
    ORIGIN,
  );
  assert.deepEqual(plan.navigate, []);
  assert.equal(plan.openWindow, true);
});

test("the service worker focuses a parska client, then navigates, and still opens older https urls", () => {
  const sw = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
  assert.match(sw, /client\.focused/);
  assert.match(sw, /client\.navigate\(absolute\)/);
  assert.match(sw, /clients\.openWindow\(absolute\)/);
  assert.match(sw, /new URL\(url\)\.origin === origin/);
  assert.match(sw, /safeUrl\(event\.notification\.data && event\.notification\.data\.url\)/);
  assert.match(sw, /if \(url\.protocol === "https:"\) return url\.href/);
  assert.match(sw, /const DEFAULT_BADGE = "\/icons\/badge-96.png"/);
  assert.doesNotMatch(sw, /badge:\s*icon/);
});
