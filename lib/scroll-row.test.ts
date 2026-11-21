import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  closestScrollCardIndex,
  isCenterSnap,
  nextScrollCardIndex,
  scrollLeftByPage,
  scrollLeftToCenter,
} from "./scroll-row.ts";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const scrollRow = readFileSync(new URL("../app/components/ScrollRow.tsx", import.meta.url), "utf8");
const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const rankings = readFileSync(new URL("../app/components/RankingCards.tsx", import.meta.url), "utf8");

test("center snap moves one card onto the scrollport center", () => {
  assert.equal(isCenterSnap("center"), true);
  assert.equal(isCenterSnap("center center"), true);
  assert.equal(isCenterSnap("start"), false);
  assert.equal(isCenterSnap("none start"), false);

  const centers = [100, 400, 700];
  assert.equal(closestScrollCardIndex(centers, 410), 1);
  assert.equal(nextScrollCardIndex(centers, 410, "right"), 2);
  assert.equal(nextScrollCardIndex(centers, 410, "left"), 0);
  assert.equal(nextScrollCardIndex(centers, 100, "left"), 0);
  assert.equal(nextScrollCardIndex(centers, 700, "right"), 2);
  assert.equal(nextScrollCardIndex([], 0, "right"), 0);

  assert.equal(
    scrollLeftToCenter({ scrollLeft: 0, cardCenter: 640, portCenter: 195, maxScroll: 900 }),
    445,
  );
  assert.equal(
    scrollLeftToCenter({ scrollLeft: 800, cardCenter: 40, portCenter: 195, maxScroll: 900 }),
    645,
  );
  assert.equal(
    scrollLeftToCenter({ scrollLeft: 20, cardCenter: 10, portCenter: 195, maxScroll: 900 }),
    0,
  );
});

test("desktop arrows still advance by 80% of the row", () => {
  assert.equal(
    scrollLeftByPage({ scrollLeft: 100, clientWidth: 1000, maxScroll: 2000, direction: "right" }),
    900,
  );
  assert.equal(
    scrollLeftByPage({ scrollLeft: 100, clientWidth: 1000, maxScroll: 2000, direction: "left" }),
    0,
  );
  assert.equal(
    scrollLeftByPage({ scrollLeft: 1900, clientWidth: 1000, maxScroll: 2000, direction: "right" }),
    2000,
  );
});

test("phone rows center an 82vw card and desktop snap-start stays in ScrollRow", () => {
  const start = css.indexOf("@media (max-width: 767px)");
  const end = css.indexOf(".dot-accent");
  assert.ok(start > 0 && end > start);
  const mobile = css.slice(start, end);
  assert.match(mobile, /\.scroll-row/);
  assert.match(mobile, /\.band \.snap-x\.snap-mandatory/);
  assert.match(mobile, /--scroll-card:\s*82vw/);
  assert.match(mobile, /--scroll-gutter:\s*calc\(\(100vw - var\(--scroll-card\)\) \/ 2\)/);
  assert.match(mobile, /padding-inline:\s*var\(--scroll-gutter\)/);
  assert.match(mobile, /scroll-padding-inline:\s*var\(--scroll-gutter\)/);
  assert.match(mobile, /margin-inline:\s*-20px/);
  assert.match(mobile, /scroll-snap-align:\s*center/);
  assert.match(mobile, /\.scroll-row > \.scroll-row-card/);
  assert.match(mobile, /\.band \.snap-x\.snap-mandatory > \.snap-start/);
  assert.doesNotMatch(css.slice(end), /--scroll-card:\s*82vw/);

  assert.match(scrollRow, /className="scroll-row /);
  assert.match(scrollRow, /data-scroll-card/);
  assert.match(scrollRow, /scroll-row-card/);
  assert.match(scrollRow, /snap-center md:snap-start/);
  assert.match(scrollRow, /w-72 sm:w-80/);
  assert.match(scrollRow, /scrollLeftByPage/);
  assert.match(scrollRow, /scrollLeftToCenter/);
  assert.match(scrollRow, /nextScrollCardIndex/);
  assert.match(scrollRow, /isCenterSnap/);
  assert.match(scrollRow, /el\.clientWidth \* 0\.8|scrollLeftByPage/);
});

test("arrow discs do not paint tap bands over the row", () => {
  const start = css.indexOf(".scroll-arrow {");
  const end = css.indexOf(".dot-accent");
  assert.ok(start > 0 && end > start);
  const arrows = css.slice(start, end);
  assert.match(arrows, /-webkit-tap-highlight-color:\s*transparent/);
  assert.match(arrows, /pointer-events:\s*none/);
  assert.match(css, /\.group\\\/scroll,\s*\n\.scroll-row/);
  assert.match(arrows, /\.scroll-arrow-btn:focus \{\s*outline:\s*none;/);
  assert.match(arrows, /\.scroll-arrow-btn:focus-visible \{[^}]*outline:\s*2px solid var\(--coral\)/);
  assert.match(arrows, /@media \(hover: hover\) and \(pointer: fine\)/);
  assert.match(arrows, /\.group\\\/scroll:hover \.scroll-arrow-btn/);
  assert.doesNotMatch(arrows, /linear-gradient/);
  assert.doesNotMatch(arrows, /box-shadow/);
  assert.doesNotMatch(css, /\.scroll-row:focus/);
  assert.doesNotMatch(css, /\.scroll-row:focus-visible/);
  assert.doesNotMatch(css, /\.scroll-row:focus-within/);

  assert.match(scrollRow, /scroll-arrow-btn/);
  assert.match(scrollRow, /aria-label=\{label\}/);
  assert.match(scrollRow, /label="Poprzednie"/);
  assert.match(scrollRow, /label=\{"Nast\\u0119pne"\}/);
  assert.doesNotMatch(scrollRow, /linear-gradient/);
  assert.doesNotMatch(scrollRow, /group-hover\/scroll/);
  assert.doesNotMatch(scrollRow, /focus-visible:opacity-100/);
  assert.doesNotMatch(scrollRow, /w-12/);
});

test("Formaty and Rankingi strips still use the shared snap track", () => {
  assert.match(home, /snap-x snap-mandatory/);
  assert.match(home, /snap-start/);
  assert.match(rankings, /snap-x snap-mandatory/);
  assert.match(rankings, /snap-start/);
});
