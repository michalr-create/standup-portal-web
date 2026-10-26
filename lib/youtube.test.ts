import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveContentOpen } from "./youtube.ts";

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
