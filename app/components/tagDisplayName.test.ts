import assert from "node:assert/strict";
import { test } from "node:test";
import { tagDisplayName } from "./tagDisplayName.ts";

test("snake_case tag names become a sentence-case phrase", () => {
  assert.equal(tagDisplayName("pelny_program"), "Pelny program");
  assert.equal(tagDisplayName("pełny_program"), "Pełny program");
  assert.equal(tagDisplayName("  pelny_program  "), "Pelny program");
  assert.equal(tagDisplayName("a__b"), "A b");
});

test("lowercase kebab slugs are humanized", () => {
  assert.equal(tagDisplayName("open-mic"), "Open mic");
  assert.equal(tagDisplayName("pelny-program"), "Pelny program");
  assert.equal(tagDisplayName("pełny-program"), "Pełny program");
});

test("readable names are left as stored", () => {
  assert.equal(tagDisplayName("Pelny program"), "Pelny program");
  assert.equal(tagDisplayName("Specjal"), "Specjal");
  assert.equal(tagDisplayName("roast"), "roast");
  assert.equal(tagDisplayName("wywiad"), "wywiad");
  assert.equal(tagDisplayName("Stand-up"), "Stand-up");
  assert.equal(tagDisplayName("COVID-19"), "COVID-19");
  assert.equal(tagDisplayName("pelny program"), "pelny program");
  assert.equal(tagDisplayName(""), "");
});

test("mixed-case snake_case keeps existing letters", () => {
  assert.equal(tagDisplayName("YT_SHORT"), "YT SHORT");
  assert.equal(tagDisplayName("Pelny_Program"), "Pelny Program");
});
