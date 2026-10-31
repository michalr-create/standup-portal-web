import assert from "node:assert/strict";
import { test } from "node:test";
import { listingCountLabel, type CountWord } from "./listing-count.ts";

const SPECJAL: CountWord = { one: "specjal", few: "specjale", many: "specjali" };
const POZYCJA: CountWord = { one: "pozycja", many: "pozycji" };

test("specjale uses specjal / specjale / specjali when nothing is filtered", () => {
  const label = (n: number) => listingCountLabel({
    catalogTotal: n,
    shown: Math.min(n, 24),
    inView: Math.min(n, 24),
    word: SPECJAL,
    filtered: false,
    server: true,
  });
  assert.equal(label(0), "0 specjali");
  assert.equal(label(1), "1 specjal");
  assert.equal(label(2), "2 specjale");
  assert.equal(label(4), "4 specjale");
  assert.equal(label(5), "5 specjali");
  assert.equal(label(12), "12 specjali");
  assert.equal(label(14), "14 specjali");
  assert.equal(label(21), "21 specjal");
  assert.equal(label(22), "22 specjale");
  assert.equal(label(24), "24 specjale");
  assert.equal(label(330), "330 specjali");
});

test("an active server filter counts the whole catalog as wyniki", () => {
  const label = (n: number) => listingCountLabel({
    catalogTotal: n,
    shown: Math.min(n, 24),
    inView: 24,
    word: SPECJAL,
    filtered: true,
    server: true,
  });
  assert.equal(label(0), "0 wynik\u00f3w");
  assert.equal(label(1), "1 wynik");
  assert.equal(label(2), "2 wyniki");
  assert.equal(label(4), "4 wyniki");
  assert.equal(label(5), "5 wynik\u00f3w");
  assert.equal(label(6), "6 wynik\u00f3w");
  assert.equal(label(12), "12 wynik\u00f3w");
  assert.equal(label(22), "22 wyniki");
  assert.equal(label(24), "24 wyniki");
  assert.equal(label(31), "31 wynik");
  assert.equal(label(330), "330 wynik\u00f3w");
  for (const n of [0, 1, 2, 6, 22, 31, 330]) {
    assert.equal(label(n).includes("na tej stronie"), false);
    assert.equal(label(n).includes("specjal"), false);
  }
});

test("listing nouns use Polish singular, paucal, and plural", () => {
  const forms = (word: CountWord, expected: Record<number, string>) => {
    for (const [raw, noun] of Object.entries(expected)) {
      const n = Number(raw);
      assert.equal(listingCountLabel({
        catalogTotal: n,
        shown: Math.min(n, 24),
        inView: Math.min(n, 24),
        word,
        filtered: false,
        server: true,
      }), `${n} ${noun}`);
    }
  };

  forms(
    { one: "nagranie", few: "nagrania", many: "nagra\u0144" },
    { 1: "nagranie", 2: "nagrania", 4: "nagrania", 5: "nagra\u0144", 12: "nagra\u0144", 22: "nagrania", 31: "nagranie" },
  );
  forms(
    { one: "wywiad", few: "wywiady", many: "wywiad\u00f3w" },
    { 1: "wywiad", 2: "wywiady", 5: "wywiad\u00f3w", 14: "wywiad\u00f3w", 22: "wywiady" },
  );
  forms(
    { one: "wydarzenie", few: "wydarzenia", many: "wydarze\u0144" },
    { 1: "wydarzenie", 3: "wydarzenia", 5: "wydarze\u0144", 11: "wydarze\u0144", 24: "wydarzenia" },
  );
  forms(
    { one: "odcinek", few: "odcinki", many: "odcink\u00f3w" },
    { 1: "odcinek", 2: "odcinki", 5: "odcink\u00f3w", 12: "odcink\u00f3w", 22: "odcinki" },
  );
  forms(
    { one: "kr\u00f3tki klip", few: "kr\u00f3tkie klipy", many: "kr\u00f3tkich klip\u00f3w" },
    { 1: "kr\u00f3tki klip", 2: "kr\u00f3tkie klipy", 5: "kr\u00f3tkich klip\u00f3w" },
  );
  forms(
    { one: "materia\u0142", few: "materia\u0142y", many: "materia\u0142\u00f3w" },
    { 1: "materia\u0142", 4: "materia\u0142y", 5: "materia\u0142\u00f3w" },
  );
  forms(
    { one: "roast", few: "roasty", many: "roast\u00f3w" },
    { 1: "roast", 2: "roasty", 5: "roast\u00f3w" },
  );
});

test("listings without a few-form keep the previous one-or-many counter", () => {
  assert.equal(listingCountLabel({
    catalogTotal: 21,
    shown: 21,
    inView: 21,
    word: POZYCJA,
    filtered: false,
    server: true,
  }), "21 pozycji");
  assert.equal(listingCountLabel({
    catalogTotal: 1,
    shown: 1,
    inView: 1,
    word: POZYCJA,
    filtered: false,
    server: true,
  }), "1 pozycja");
  assert.equal(listingCountLabel({
    catalogTotal: 40,
    shown: 3,
    inView: 24,
    word: POZYCJA,
    filtered: true,
    server: true,
  }), "40 wynik\u00f3w");
});
