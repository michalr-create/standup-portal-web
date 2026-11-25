import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  CITY_LANDINGS,
  cityLandingByName,
  cityLandingHref,
  publicTrasyHref,
  resolveCityParam,
  trasyLandingRedirect,
} from "./city-landings.ts";
import { slugify } from "./slugify.ts";

test("ten city landings keep empty descriptions and stable slugs", () => {
  assert.deepEqual(
    CITY_LANDINGS.map((city) => city.name),
    [
      "Warszawa",
      "Kraków",
      "Wrocław",
      "Gdańsk",
      "Poznań",
      "Bydgoszcz",
      "Szczecin",
      "Łódź",
      "Białystok",
      "Gdynia",
    ],
  );
  assert.deepEqual(
    CITY_LANDINGS.map((city) => city.inCity),
    [
      "Warszawie",
      "Krakowie",
      "Wrocławiu",
      "Gdańsku",
      "Poznaniu",
      "Bydgoszczy",
      "Szczecinie",
      "Łodzi",
      "Białymstoku",
      "Gdyni",
    ],
  );
  for (const city of CITY_LANDINGS) {
    assert.equal(city.description, "");
    assert.equal(city.slug, slugify(city.name));
  }
  assert.equal(CITY_LANDINGS.find((city) => city.name === "Łódź")?.slug, "lodz");
  assert.equal(CITY_LANDINGS.find((city) => city.name === "Gdańsk")?.slug, "gdansk");

  const source = readFileSync(new URL("./city-landings.ts", import.meta.url), "utf8");
  assert.match(source, /do not invent city text/i);
  assert.doesNotMatch(source, /description: "[^"]+"/);
});

test("a city query redirects to the landing and keeps the other filters", () => {
  const empty = { osoba: "", miasto: "Kraków", od: "", doDnia: "", bilety: "" as const };
  assert.equal(trasyLandingRedirect(empty, 1), "/trasy/krakow");
  assert.equal(
    trasyLandingRedirect(
      { osoba: "abelard-giza", miasto: "kraków", od: "2026-12-01", doDnia: "", bilety: "dostepne" },
      2,
    ),
    "/trasy/krakow?osoba=abelard-giza&od=2026-12-01&bilety=dostepne&page=2",
  );
  assert.equal(trasyLandingRedirect({ ...empty, miasto: "Łódź" }, 1), "/trasy/lodz");
  assert.equal(trasyLandingRedirect({ ...empty, miasto: "Hel" }, 1), null);
  assert.equal(trasyLandingRedirect({ ...empty, miasto: "" }, 1), null);
  assert.equal(cityLandingByName("  Gdańsk ")?.slug, "gdansk");
  assert.equal(resolveCityParam("Kraków")?.city.slug, "krakow");
  assert.equal(resolveCityParam("Kraków")?.redirect, true);
  assert.equal(resolveCityParam("krakow")?.redirect, false);
  assert.equal(resolveCityParam("hel"), null);

  assert.equal(cityLandingHref("gdansk", { osoba: "lotek", page: 1 }), "/trasy/gdansk?osoba=lotek");
  assert.equal(publicTrasyHref({ miasto: "Poznań", bilety: "wyprzedane" }), "/trasy/poznan?bilety=wyprzedane");
  assert.equal(publicTrasyHref({ miasto: "Hel" }), "/trasy?miasto=Hel");
  assert.equal(publicTrasyHref({ miasto: "" }, { keepBlankCity: true }), "/trasy?miasto=");
});
