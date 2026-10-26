import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  PAID_BADGE_LABEL,
  PAID_SHOP_LINK_CUE,
  PAID_UNAVAILABLE_LABEL,
  cardActionKind,
  resolveContentOpen,
  showThumbDuration,
} from "./youtube.ts";

const YOUTUBE = "https://www.youtube.com/watch?v=abc123XYZ";
const SHOP = "https://sklep.example/wentyl";

test("paid items open the external url and never the YouTube modal", () => {
  assert.deepEqual(resolveContentOpen({ is_paid: true, url: SHOP }), {
    type: "external",
    url: SHOP,
  });
  assert.deepEqual(resolveContentOpen({ is_paid: true, url: YOUTUBE }), {
    type: "external",
    url: YOUTUBE,
  });
  assert.equal(resolveContentOpen({ is_paid: true, url: "  " }), null);
  assert.equal(resolveContentOpen({ is_paid: true, url: null }), null);
  assert.equal(resolveContentOpen({ is_paid: true, url: "javascript:alert(1)" }), null);
});

test("paid http(s) url is a shop link and unpaid stays in-app", () => {
  assert.equal(cardActionKind(true, SHOP), "shop");
  assert.equal(cardActionKind(true, "http://sklep.example/wagabunda"), "shop");
  assert.equal(cardActionKind(true, "  "), "unavailable");
  assert.equal(cardActionKind(true, null), "unavailable");
  assert.equal(cardActionKind(true, "javascript:alert(1)"), "unavailable");
  assert.equal(cardActionKind(true, "/relatywny"), "unavailable");
  assert.equal(cardActionKind(false, YOUTUBE), "inapp");
  assert.equal(cardActionKind(false, ""), "inapp");
});

test("paid thumbs do not show a video runtime", () => {
  assert.equal(showThumbDuration(true, 6120), false);
  assert.equal(showThumbDuration(true, null), false);
  assert.equal(showThumbDuration(false, 6120), true);
  assert.equal(showThumbDuration(false, null), false);
});

test("paid badge copy is readable Polish", () => {
  assert.equal(PAID_BADGE_LABEL, "Płatne");
  assert.equal(PAID_UNAVAILABLE_LABEL, "Niedostępne");
  assert.equal(PAID_SHOP_LINK_CUE, "Otwiera sklep w nowej karcie");
  const badge = readFileSync(new URL("../app/components/PaidBadge.tsx", import.meta.url), "utf8");
  const action = readFileSync(new URL("../app/components/ContentCardAction.tsx", import.meta.url), "utf8");
  const lib = readFileSync(new URL("./youtube.ts", import.meta.url), "utf8");
  assert.equal(badge.includes("\\u"), false);
  assert.equal(action.includes("\\u"), false);
  assert.equal(lib.includes("\\u"), false);
  assert.match(badge, /↗/);
  assert.match(badge, /PAID_BADGE_LABEL/);
  assert.match(action, /PAID_SHOP_LINK_CUE/);
  assert.match(action, /disabled/);
});

test("unpaid YouTube stays in the modal and other urls stay external", () => {
  assert.deepEqual(resolveContentOpen({ is_paid: false, url: YOUTUBE }), {
    type: "modal",
    videoId: "abc123XYZ",
  });
  assert.deepEqual(resolveContentOpen({ is_paid: false, url: SHOP }), {
    type: "external",
    url: SHOP,
  });
  assert.equal(resolveContentOpen({ is_paid: false, url: "" }), null);
});
