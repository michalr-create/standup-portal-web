import assert from "node:assert/strict";
import { test } from "node:test";
import { displayTitle, itemDisplayTitle } from "./display-title.ts";

test("YouTube tails and hashtags come off, years inside the name stay", () => {
  assert.equal(
    displayTitle("Marcin Zbigniew Wojciech SZCZERZE? #standup cały progam 2026 STAND-UP"),
    "Marcin Zbigniew Wojciech Szczerze?",
  );
  assert.equal(
    displayTitle("ABELARD GIZA - Piniata całe nagranie 2020 STAND-UP"),
    "Abelard Giza - Piniata",
  );
  assert.equal(displayTitle("Abelard Giza — Wentyl (2026)"), "Abelard Giza — Wentyl (2026)");
  assert.equal(displayTitle("Wentyl 2026"), "Wentyl 2026");
  assert.equal(displayTitle("Foo | STAND-UP | 2025"), "Foo");
  assert.equal(displayTitle("Title STAND-UP standup"), "Title");
  assert.equal(displayTitle("Program #standup"), "Program");
});

test("all-caps words calm down without title-casing Polish function words", () => {
  assert.equal(displayTitle("DROGA DO DOMU"), "Droga do Domu");
  assert.equal(displayTitle("Abelard Giza i przyjaciele"), "Abelard Giza i przyjaciele");
  assert.equal(displayTitle("NA ŻYWO"), "Na Żywo");
  assert.equal(displayTitle(""), "");
});

test("cards keep the raw title until a public slug exists", () => {
  const raw = "ABELARD GIZA - Piniata całe nagranie 2020 STAND-UP";
  assert.equal(itemDisplayTitle({ title: raw, slug: null }), raw);
  assert.equal(itemDisplayTitle({ title: raw, slug: "abelard-giza-piniata-cale-nagranie-2020-stand-up" }), "Abelard Giza - Piniata");
});
