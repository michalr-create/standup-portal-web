import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("trasy standuper filter is one combobox and dates share a row", () => {
  const filters = readFileSync(new URL("./TrasyFilters.tsx", import.meta.url), "utf8");
  const combo = readFileSync(new URL("./PersonCombobox.tsx", import.meta.url), "utf8");

  assert.match(filters, /<PersonCombobox/);
  assert.doesNotMatch(filters, /Filtruj listę/);
  assert.doesNotMatch(filters, /<select[\s\S]*?id="trasy-osoba"/);
  assert.match(filters, /grid min-w-0 grid-cols-2 gap-3 sm:col-span-2 lg:col-span-2/);
  assert.match(filters, /trasy-date min-h-10 w-full min-w-0 max-w-full/);
  assert.equal(filters.match(/type="date"/g)?.length, 2);
  assert.match(filters, /onSelect=\{\(osoba\) => go\(\{ osoba \}\)\}/);

  assert.match(combo, /role="combobox"/);
  assert.match(combo, /aria-autocomplete="list"/);
  assert.match(combo, /aria-expanded=\{open\}/);
  assert.match(combo, /role="listbox"/);
  assert.match(combo, /role="option"/);
  assert.match(combo, /Wszyscy/);
  assert.match(combo, /Wyczyść standupera/);
  assert.match(combo, /personComboboxOptions/);
  assert.match(combo, /ArrowDown/);
  assert.match(combo, /Escape/);
});
