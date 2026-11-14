import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("trasy standuper filter is one combobox and dates share a row", () => {
  const filters = readFileSync(new URL("./TrasyFilters.tsx", import.meta.url), "utf8");
  const combo = readFileSync(new URL("../components/OptionCombobox.tsx", import.meta.url), "utf8");
  const person = readFileSync(new URL("./PersonCombobox.tsx", import.meta.url), "utf8");
  const city = readFileSync(new URL("../components/CityCombobox.tsx", import.meta.url), "utf8");

  assert.match(filters, /<PersonCombobox/);
  assert.match(filters, /<CityCombobox/);
  assert.match(filters, /htmlFor="trasy-miasto"/);
  assert.match(filters, /inputId="trasy-miasto"/);
  assert.match(filters, /selectedCity=\{filters\.miasto\}/);
  assert.match(filters, /onSelect=\{\(miasto\) => go\(\{ miasto \}\)\}/);
  assert.doesNotMatch(filters, /<select/);
  assert.doesNotMatch(filters, /Filtruj listę/);
  assert.doesNotMatch(filters, /<select[\s\S]*?id="trasy-osoba"/);
  assert.match(filters, /grid min-w-0 grid-cols-2 gap-3 sm:col-span-2 lg:col-span-2/);
  assert.match(filters, /trasy-date min-h-10 w-full min-w-0 max-w-full/);
  assert.equal(filters.match(/type="date"/g)?.length, 1);
  assert.equal(filters.match(/<DateControl/g)?.length, 2);
  assert.match(filters, /onSelect=\{\(osoba\) => go\(\{ osoba \}\)\}/);
  assert.match(filters, /activeTrasyFilterCount\(filters\)/);
  assert.match(filters, /useState\(activeCount > 0\)/);
  assert.match(filters, />\s*Filtry\s*\{/);
  assert.match(filters, /aria-expanded=\{open\}/);
  assert.match(filters, /aria-controls="trasy-filter-fields trasy-filter-status"/);
  assert.match(filters, /sticky z-30 mb-3 bg-\[var\(--ink\)\] py-2 lg:hidden/);
  assert.match(filters, /style=\{\{ top: navOffset \}\}/);
  assert.match(filters, /new ResizeObserver\(sync\)/);
  assert.match(filters, /dd\.mm\.rrrr/);
  assert.match(filters, /trasy-date-mask/);
  assert.match(filters, /id="trasy-filter-fields"/);
  assert.match(filters, /id="trasy-filter-status"/);
  assert.match(filters, /order-2 hidden grid-cols-1 gap-3 sm:grid-cols-2 lg:order-none lg:grid lg:grid-cols-4/);
  assert.match(filters, /order-3 hidden flex-wrap items-center gap-2 lg:order-none lg:flex/);
  assert.equal(filters.match(/lang="pl"/g)?.length, 1);

  const fieldsAt = filters.indexOf('id="trasy-filter-fields"');
  const chipsAt = filters.indexOf('aria-label="Popularne miasta"');
  const statusAt = filters.indexOf('id="trasy-filter-status"');
  assert.ok(fieldsAt < chipsAt && chipsAt < statusAt);
  assert.match(filters.slice(fieldsAt, chipsAt), /<\/div>\s*\{cityChips/);
  assert.doesNotMatch(filters.slice(chipsAt - 220, chipsAt), /\bhidden\b/);
  assert.match(
    filters,
    /order-1 flex max-w-full items-center gap-2 overflow-x-auto scrollbar-hide lg:order-none lg:flex-wrap lg:overflow-visible/,
  );
  assert.match(filters, /aria-label="Popularne miasta"/);
  assert.doesNotMatch(filters, /Portal|filters\.portal|facets\.portals|providerLabel/);

  const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
  const shell = page.slice(page.indexOf("<TrasyFilters"), page.indexOf("</TrasyFilters>"));
  assert.match(shell, /<EventCard/);
  assert.match(shell, /<Pager/);

  assert.match(combo, /role="combobox"/);
  assert.match(combo, /aria-autocomplete="list"/);
  assert.match(combo, /aria-expanded=\{open\}/);
  assert.match(combo, /aria-controls=\{open \? listId : undefined\}/);
  assert.match(combo, /aria-activedescendant=/);
  assert.match(combo, /role="listbox"/);
  assert.match(combo, /role="option"/);
  assert.match(combo, /aria-selected=\{selectedOption\}/);
  assert.match(combo, /id=\{inputId\}/);
  assert.match(combo, /comboboxOptions/);
  assert.match(combo, /comboboxTypedValue/);
  assert.match(combo, /comboboxActiveIndex/);
  assert.match(combo, /ArrowDown/);
  assert.match(combo, /ArrowUp/);
  assert.match(combo, /Escape/);
  assert.match(combo, /Enter/);

  assert.match(person, /inputId = "trasy-osoba"/);
  assert.match(person, /<OptionCombobox/);
  assert.match(person, /allLabel="Wszyscy"/);
  assert.match(person, /Wyczyść standupera/);
  assert.match(person, /listLabel="Standuperzy"/);

  assert.match(city, /<OptionCombobox/);
  assert.match(city, /allLabel="Wszystkie"/);
  assert.match(city, /Wyczyść miasto/);
  assert.match(city, /Szukaj miasta\\u2026/);
  assert.match(city, /listLabel="Miasta"/);
  assert.match(city, /value: city, label: city/);
});
