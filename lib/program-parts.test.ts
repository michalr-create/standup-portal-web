import assert from "node:assert/strict";
import { test } from "node:test";
import { collapseBy, parseProgramPart, type ProgramFields } from "./program-parts.ts";

const BENSHI = [
  { id: 21, title: "Rafa\u0142 Pacze\u015b - \"Gortat\" (program BENSHI 4/5)", showId: null, publishedAt: "2025-07-11T13:00:11+00:00" },
  { id: 20, title: "Rafa\u0142 Pacze\u015b - \"Restauracja, Pandemia, MC Duda\" (program BENSHI 5/5)", showId: null, publishedAt: "2025-07-11T13:00:23+00:00" },
  { id: 19, title: "Rafa\u0142 Pacze\u015b - \"Czarna\" (program BENSHI 3/5)", showId: null, publishedAt: "2025-07-11T13:00:55+00:00" },
  { id: 18, title: "Rafa\u0142 Pacze\u015b - \"Nowa Kuchnia\" (program BENSHI 1/5)", showId: null, publishedAt: "2025-07-11T13:01:34+00:00" },
  { id: 17, title: "Rafa\u0142 Pacze\u015b - \"Kamper\" (program BENSHI 2/5)", showId: null, publishedAt: "2025-07-11T13:02:04+00:00" },
];

function fields(row: ProgramFields): ProgramFields {
  return row;
}

test("Benshi parts share one program and list 1 to 5", () => {
  for (const row of BENSHI) {
    assert.equal(parseProgramPart(row.title, null).seriesName, "BENSHI");
  }
  const newestFirst = [...BENSHI].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
  const groups = collapseBy(newestFirst, fields);
  assert.equal(groups.length, 1);
  assert.equal(groups[0]?.name, "Benshi");
  assert.deepEqual(groups[0]?.parts.map((part) => part.id), [18, 17, 19, 21, 20]);
});

test("title stems and part markers collapse, sequels and unrelated shows do not", () => {
  const rows: ProgramFields[] = [
    { id: 1, title: "Adam Van Bendler - Z\u0141O KONIECZNE | Bez cenzury | cz\u0119\u015b\u0107 1/3", showId: null, publishedAt: "2020-01-03T00:00:00Z" },
    { id: 2, title: "Adam Van Bendler | Z\u0141O KONIECZNE | Bez cenzury cz\u0119\u015b\u0107 2/3", showId: null, publishedAt: "2020-01-02T00:00:00Z" },
    { id: 3, title: "Adam Van Bendler - Z\u0141O KONIECZNE | Bez cenzury | cz\u0119\u015b\u0107 3/3", showId: null, publishedAt: "2020-01-01T00:00:00Z" },
    { id: 4, title: "Igor Kwiatkowski \"P\u00f3\u0142 geniusz, p\u00f3\u0142 kretyn\" cz\u0119\u015b\u0107 II", showId: null, publishedAt: "2021-02-01T00:00:00Z" },
    { id: 5, title: "Igor Kwiatkowski \"P\u00f3\u0142 geniusz, p\u00f3\u0142 kretyn\" cz\u0119\u015b\u0107 I", showId: null, publishedAt: "2021-01-01T00:00:00Z" },
    { id: 6, title: "Powiedz na g\u0142os, wszyscy si\u0119 po\u015bmiejemy | STAND-UP Format VHS cz.II | Krzysztof Jahns", showId: null, publishedAt: "2019-02-01T00:00:00Z" },
    { id: 7, title: "Stand-up FORMAT VHS cz.I | Krzysztof Jahns", showId: null, publishedAt: "2019-01-01T00:00:00Z" },
    { id: 8, title: "Rafa\u0142 Pacze\u015b - \"BANG\" (2018) (ca\u0142e nagranie)", showId: null, publishedAt: "2018-05-14T00:00:00Z" },
    { id: 9, title: "Rafa\u0142 Pacze\u015b - \"BANG 2\" (2020) (ca\u0142e nagranie)", showId: null, publishedAt: "2020-04-05T00:00:00Z" },
    { id: 10, title: "Foo cz. 1", showId: 3, publishedAt: "2024-01-02T00:00:00Z" },
    { id: 11, title: "Foo cz. 2", showId: 3, publishedAt: "2024-01-01T00:00:00Z" },
    { id: 12, title: "Foo cz. 1", showId: 9, publishedAt: "2024-01-01T00:00:00Z" },
    { id: 13, title: "III SZPAK - Reporta\u017c cz. II", showId: 48, publishedAt: "2018-02-01T00:00:00Z" },
    { id: 14, title: "III SZPAK - Reporta\u017c cz. I", showId: 48, publishedAt: "2018-01-01T00:00:00Z" },
    { id: 15, title: "Adam Gajda stand-up - \"\u017b\u00f3\u0142wik\"", showId: 48, publishedAt: "2018-03-01T00:00:00Z" },
    { id: 16, title: "Dygresje #1 | Rafa\u0142 Pacze\u015b x Rafa\u0142 Rutkowski", showId: 37, publishedAt: "2026-05-23T00:00:00Z" },
    { id: 17, title: "Dygresje #2 | Rafa\u0142 Pacze\u015b x Katarzyna Piasecka", showId: 37, publishedAt: "2026-05-30T00:00:00Z" },
    { id: 18, title: "Show odc. 2", showId: null, publishedAt: null },
    { id: 19, title: "Show odc. 1", showId: null, publishedAt: "2022-01-01T00:00:00Z" },
    { id: 20, title: "Pilot Part 2", showId: null, publishedAt: "2023-02-01T00:00:00Z" },
    { id: 21, title: "Pilot Part 1", showId: null, publishedAt: "2023-01-01T00:00:00Z" },
  ];

  const groups = collapseBy(rows, fields);
  const ids = (nameIncludes: string) =>
    groups.find((group) => group.parts.some((part) => part.title.includes(nameIncludes)))?.parts.map((part) => part.id);

  assert.deepEqual(ids("Z\u0141O KONIECZNE"), [1, 2, 3]);
  assert.deepEqual(ids("geniusz"), [5, 4]);
  assert.deepEqual(ids("VHS"), [7, 6]);
  assert.deepEqual(ids("BANG\" (2018)"), [8]);
  assert.deepEqual(ids("BANG 2"), [9]);
  assert.deepEqual(
    groups.filter((group) => group.parts.some((part) => part.title === "Foo cz. 1")).map((group) => group.parts.map((part) => part.id)),
    [[10, 11], [12]],
  );
  assert.deepEqual(ids("Reporta\u017c"), [14, 13]);
  assert.deepEqual(ids("\u017b\u00f3\u0142wik"), [15]);
  assert.deepEqual(ids("Dygresje #1"), [16]);
  assert.deepEqual(ids("Dygresje #2"), [17]);
  assert.deepEqual(ids("Show odc"), [19, 18]);
  assert.deepEqual(ids("Pilot"), [21, 20]);
});

test("the same part number falls back to published_at ascending", () => {
  const rows: ProgramFields[] = [
    { id: 5, title: "Wsp\u00f3lny materia\u0142 cz. 1", showId: null, publishedAt: "2024-06-01T00:00:00Z" },
    { id: 6, title: "Wsp\u00f3lny materia\u0142 cz. 1", showId: null, publishedAt: null },
    { id: 4, title: "Wsp\u00f3lny materia\u0142 cz. 1", showId: null, publishedAt: "2024-01-01T00:00:00Z" },
  ];
  const group = collapseBy(rows, fields);
  assert.equal(group.length, 1);
  assert.deepEqual(group[0]?.parts.map((part) => part.id), [4, 5, 6]);
});
