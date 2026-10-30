import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("standuperzy directory is a plain list with the trasy combobox match", () => {
  const list = readFileSync(new URL("./StanduperzyList.tsx", import.meta.url), "utf8");

  assert.match(list, /peopleSelectOptions/);
  assert.match(list, /sortPeopleByName/);
  assert.match(list, /role="combobox"/);
  assert.match(list, /aria-autocomplete="list"/);
  assert.match(list, /aria-expanded=\{open\}/);
  assert.match(list, /role="listbox"/);
  assert.match(list, /role="option"/);
  assert.match(list, /ArrowDown/);
  assert.match(list, /ArrowUp/);
  assert.match(list, /Enter/);
  assert.match(list, /Escape/);
  assert.match(list, /Wyczyść wyszukiwanie/);
  assert.match(list, /\/standuper\//);
  assert.match(list, /router\.push\("\/standuper\/" \+ slug\)/);

  assert.doesNotMatch(list, /data-directory-letter/);
  assert.doesNotMatch(list, /Skocz do litery/);
  assert.doesNotMatch(list, /groupPeopleByLetter/);
  assert.doesNotMatch(list, /jumpLettersFromGroups/);
  assert.doesNotMatch(list, /charAt\(0\)/);
  assert.doesNotMatch(list, /rounded-full shrink-0/);
});
