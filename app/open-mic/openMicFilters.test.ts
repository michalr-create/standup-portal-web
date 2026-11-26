import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("open mic city filter is a combobox and the other filters stay selects", () => {
  const filters = readFileSync(new URL("./OpenMicFilters.tsx", import.meta.url), "utf8");

  assert.match(filters, /<CityCombobox/);
  assert.match(filters, /htmlFor="open-mic-miasto"/);
  assert.match(filters, /inputId="open-mic-miasto"/);
  assert.match(filters, /selectedCity=\{filters\.miasto\}/);
  assert.match(filters, /onSelect=\{\(miasto\) => go\(\{ miasto \}\)\}/);
  assert.match(filters, /publicOpenMicHref/);
  assert.match(filters, /minHeightClass="min-h-11"/);
  assert.equal(filters.match(/<select/g)?.length, 2);
  assert.match(filters, /Dzień tygodnia/);
  assert.match(filters, /Język/);
  assert.match(filters, /href="\/open-mic\?miasto="/);
  assert.match(filters, /Wyczyść filtry/);
  assert.doesNotMatch(filters, /value=\{filters\.miasto\}/);
});
