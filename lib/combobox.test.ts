import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cityComboboxOptions,
  comboboxActiveIndex,
  comboboxTypedValue,
} from "./combobox.ts";

const CITIES = ["Białystok", "Gdańsk", "Kraków", "Łódź", "Poznań", "Warszawa", "Wrocław", "Zielona Góra"];

test("city combobox folds case and Polish diacritics and keeps the original city value", () => {
  const all = cityComboboxOptions(CITIES, "");
  assert.equal(all[0]?.label, "Wszystkie");
  assert.equal(all[0]?.value, "");
  assert.deepEqual(
    all.slice(1).map((option) => option.value),
    CITIES,
  );
  assert.equal(cityComboboxOptions(CITIES, "   ")[0]?.label, "Wszystkie");

  assert.deepEqual(
    cityComboboxOptions(CITIES, "lodz").map((option) => option.value),
    ["Łódź"],
  );
  assert.deepEqual(
    cityComboboxOptions(CITIES, "ŁÓDŹ").map((option) => option.value),
    ["Łódź"],
  );
  assert.deepEqual(
    cityComboboxOptions(CITIES, "Łodz").map((option) => option.value),
    ["Łódź"],
  );
  assert.deepEqual(
    cityComboboxOptions(CITIES, "gdansk").map((option) => option.value),
    ["Gdańsk"],
  );
  assert.deepEqual(
    cityComboboxOptions(CITIES, "bialystok").map((option) => option.value),
    ["Białystok"],
  );
  assert.deepEqual(
    cityComboboxOptions(CITIES, "zielona gora").map((option) => option.value),
    ["Zielona Góra"],
  );
  assert.deepEqual(
    cityComboboxOptions(CITIES, "POZNAN").map((option) => option.value),
    ["Poznań"],
  );
  assert.deepEqual(
    cityComboboxOptions(CITIES, "krakow").map((option) => option.label),
    ["Kraków"],
  );
  assert.deepEqual(
    cityComboboxOptions(CITIES, "wroclaw").map((option) => option.value),
    ["Wrocław"],
  );
  assert.deepEqual(
    cityComboboxOptions(CITIES, "wsz").map((option) => option.value),
    [""],
  );
  assert.deepEqual(cityComboboxOptions(CITIES, "brak"), []);
  assert.equal(cityComboboxOptions([], "").length, 1);

  assert.equal(comboboxActiveIndex(all, "", ""), 0);
  assert.equal(
    comboboxActiveIndex(all, "", "Łódź"),
    all.findIndex((option) => option.value === "Łódź"),
  );
  assert.equal(comboboxActiveIndex(cityComboboxOptions(CITIES, "lodz"), "lodz", "Kraków"), 0);
  assert.equal(comboboxActiveIndex([], "lodz", ""), -1);

  const withAll = cityComboboxOptions(CITIES, "w");
  assert.equal(withAll[0]?.value, "");
  assert.equal(withAll.some((option) => option.value === "Warszawa"), true);
  assert.equal(comboboxActiveIndex(withAll, "w", ""), 1);

  assert.equal(comboboxTypedValue("Łódźx", "Łódź", true), "x");
  assert.equal(comboboxTypedValue("x", "Łódź", true), "x");
  assert.equal(comboboxTypedValue("Łódź extra", "Łódź", false), "Łódź extra");
});
