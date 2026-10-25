import assert from "node:assert/strict";
import { test } from "node:test";
import {
  pendingTagAfterServerFilters,
  serverFilterKey,
  tagChipClick,
} from "./tagChipPending.ts";

test("arms the clicked chip and selects its tag", () => {
  assert.deepEqual(tagChipClick(null, "", "special"), {
    type: "navigate",
    tag: "special",
    pendingChipSlug: "special",
  });
});

test("clears the active tag when that chip is clicked", () => {
  assert.deepEqual(tagChipClick(null, "special", "special"), {
    type: "navigate",
    tag: "",
    pendingChipSlug: "special",
  });
});

test("ignores repeat clicks on the chip that is already pending", () => {
  assert.deepEqual(tagChipClick("special", "", "special"), { type: "ignore" });
  assert.deepEqual(tagChipClick("special", "special", "special"), { type: "ignore" });
});

test("a different chip replaces the in-flight tag", () => {
  assert.deepEqual(tagChipClick("special", "", "stand-up-impro"), {
    type: "navigate",
    tag: "stand-up-impro",
    pendingChipSlug: "stand-up-impro",
  });
});

test("server filter key tracks person, tag, and search", () => {
  const base = { personSlug: "", tagSlug: "", search: "" };
  assert.equal(serverFilterKey(base), serverFilterKey({ ...base }));
  assert.notEqual(serverFilterKey(base), serverFilterKey({ ...base, tagSlug: "special" }));
  assert.notEqual(serverFilterKey(base), serverFilterKey({ ...base, personSlug: "abelard-giza" }));
  assert.notEqual(serverFilterKey(base), serverFilterKey({ ...base, search: "wentyl" }));
});

test("pending chip clears only after the rendered filters change", () => {
  const idle = serverFilterKey({ personSlug: "", tagSlug: "", search: "" });
  const filtered = serverFilterKey({ personSlug: "", tagSlug: "special", search: "" });
  assert.equal(pendingTagAfterServerFilters("special", idle, idle), "special");
  assert.equal(pendingTagAfterServerFilters("special", idle, filtered), null);
});
