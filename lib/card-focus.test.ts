import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { nextInputModality } from "./focus-trap.ts";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

function source(path: string): string {
  return readFileSync(new URL("../" + path, import.meta.url), "utf8");
}

test("pointer taps do not switch back to a keyboard ring, Escape does not either", () => {
  assert.equal(nextInputModality("keyboard", { type: "pointer" }), "pointer");
  assert.equal(nextInputModality("pointer", { type: "key", key: "Escape" }), "pointer");
  assert.equal(nextInputModality("pointer", { type: "key", key: "ArrowRight" }), "pointer");
  assert.equal(nextInputModality("pointer", { type: "key", key: "Tab" }), "keyboard");
  assert.equal(nextInputModality("pointer", { type: "key", key: "Enter" }), "keyboard");
  assert.equal(nextInputModality("pointer", { type: "key", key: " " }), "keyboard");
  assert.equal(nextInputModality("pointer", { type: "key", key: "Enter", modified: true }), "pointer");
  assert.equal(nextInputModality("keyboard", { type: "key", key: "a" }), "keyboard");
});

test("video cards hide pointer outlines and keep a keyboard ring", () => {
  const start = css.indexOf("/* Video card base */");
  const end = css.indexOf("/* Play overlay */");
  assert.ok(start > 0 && end > start);
  const cards = css.slice(start, end);

  assert.match(cards, /\.vcard,\s*\n\.vcard \* \{\s*\n\s*-webkit-tap-highlight-color:\s*transparent;/);
  assert.match(cards, /\.vcard :is\(a, button\):focus:not\(:focus-visible\) \{\s*\n\s*outline:\s*none;/);
  assert.match(cards, /\.vcard :is\(a, button\):focus-visible \{\s*\n\s*outline:\s*2px solid var\(--coral\);/);
  assert.match(cards, /outline-offset:\s*2px;/);
  assert.match(
    cards,
    /html\[data-input="pointer"\] \.vcard :is\(a, button\):focus,\s*\nhtml\[data-input="pointer"\] \.vcard :is\(a, button\):focus-visible \{\s*\n\s*outline:\s*none;/,
  );
  assert.match(cards, /-webkit-appearance:\s*none;/);

  assert.doesNotMatch(css, /(^|\n)\*:focus\b/);
  assert.doesNotMatch(css, /(^|\n):focus\s*\{/);
});

test("carousel arrow focus from the disc fix stays on the button", () => {
  const start = css.indexOf(".scroll-arrow {");
  const end = css.indexOf(".dot-accent");
  assert.ok(start > 0 && end > start);
  const arrows = css.slice(start, end);
  assert.match(arrows, /\.scroll-arrow-btn:focus \{\s*outline:\s*none;/);
  assert.match(arrows, /\.scroll-arrow-btn:focus-visible \{[^}]*outline:\s*2px solid var\(--coral\)/);
  assert.doesNotMatch(arrows, /\.vcard/);
  assert.doesNotMatch(css, /\.scroll-row:focus/);
  assert.doesNotMatch(css, /\.scroll-arrow-btn:focus:not\(:focus-visible\)/);
});

test("every video card surface uses .vcard so the outline rule covers it", () => {
  for (const path of [
    "app/components/ScrollRow.tsx",
    "app/components/ItemsBrowser.tsx",
    "app/components/RankingCards.tsx",
    "app/components/FormatCard.tsx",
    "app/ulubione/page.tsx",
    "app/rankingi/RankingLists.tsx",
  ]) {
    const file = source(path);
    assert.match(file, /vcard/);
  }
  assert.match(source("app/components/ScrollRow.tsx"), /scroll-row-card group vcard/);
  assert.match(source("app/components/RankingCards.tsx"), /group vcard relative/);
  assert.match(source("app/components/ItemsBrowser.tsx"), /group vcard relative/);
  assert.doesNotMatch(source("app/trasy/EventCard.tsx"), /vcard/);
});
