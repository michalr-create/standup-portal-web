import assert from "node:assert/strict";
import { test } from "node:test";
import { trasyHref } from "./events.ts";
import { openMicHref } from "./open-mics.ts";
import {
  hasBlankCityParam,
  hrefWithDefaultCity,
  matchHomeCity,
  normalizeHomeCity,
} from "./home-city.ts";

test("home city is a city name and a blank value clears it", () => {
  assert.equal(normalizeHomeCity("  Kraków  "), "Kraków");
  assert.equal(normalizeHomeCity("Zielona   Góra"), "Zielona Góra");
  assert.equal(normalizeHomeCity(""), null);
  assert.equal(normalizeHomeCity("   "), null);
  assert.equal(normalizeHomeCity(null), null);
  assert.equal(normalizeHomeCity("ul. Długa 1, Kraków"), null);
  assert.equal(normalizeHomeCity("a".repeat(81)), null);
});

test("the saved city is used only when the URL has no miasto key and the city is listed", () => {
  assert.equal(matchHomeCity("kraków", ["Warszawa", "Kraków"]), "Kraków");
  assert.equal(matchHomeCity("Gdańsk", ["Kraków"]), null);
  assert.equal(matchHomeCity("ul. Długa 1", ["Kraków"]), null);

  assert.equal(hasBlankCityParam({}), false);
  assert.equal(hasBlankCityParam({ miasto: "" }), true);
  assert.equal(hasBlankCityParam({ miasto: "  " }), true);
  assert.equal(hasBlankCityParam({ miasto: "Kraków" }), false);

  assert.equal(hrefWithDefaultCity("/trasy", "", "Kraków"), "/trasy?miasto=Krak%C3%B3w");
  assert.equal(hrefWithDefaultCity("/trasy", "?osoba=abelard-giza", "Kraków"), "/trasy?osoba=abelard-giza&miasto=Krak%C3%B3w");
  assert.equal(hrefWithDefaultCity("/open-mic", "?miasto=", "Kraków"), null);
  assert.equal(hrefWithDefaultCity("/open-mic", "?miasto=Warszawa", "Kraków"), null);
  assert.equal(hrefWithDefaultCity("/trasy", "", "ul. Długa 1, Kraków"), null);
});

test("an explicit empty city stays in the URL so the home city is not put back", () => {
  assert.equal(trasyHref({ miasto: "" }), "/trasy");
  assert.equal(trasyHref({ miasto: "" }, { keepBlankCity: true }), "/trasy?miasto=");
  assert.equal(
    trasyHref({ osoba: "abelard-giza", miasto: "" }, { keepBlankCity: true }),
    "/trasy?osoba=abelard-giza&miasto=",
  );
  assert.equal(trasyHref({ miasto: "Kraków" }, { keepBlankCity: true }), "/trasy?miasto=Krak%C3%B3w");
  assert.equal(openMicHref({ miasto: "" }, { keepBlankCity: true }), "/open-mic?miasto=");
  assert.equal(openMicHref({}), "/open-mic");
});
