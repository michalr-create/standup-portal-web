import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatItemCount,
  peopleByActivity,
  pozycjaCountLabel,
  sortPeopleByName,
} from "./standuperzy-directory.ts";

test("pozycja pluralization follows Polish rules", () => {
  assert.equal(pozycjaCountLabel(0), "pozycji");
  assert.equal(pozycjaCountLabel(1), "pozycja");
  assert.equal(pozycjaCountLabel(2), "pozycje");
  assert.equal(pozycjaCountLabel(4), "pozycje");
  assert.equal(pozycjaCountLabel(5), "pozycji");
  assert.equal(pozycjaCountLabel(11), "pozycji");
  assert.equal(pozycjaCountLabel(12), "pozycji");
  assert.equal(pozycjaCountLabel(14), "pozycji");
  assert.equal(pozycjaCountLabel(21), "pozycja");
  assert.equal(pozycjaCountLabel(22), "pozycje");
  assert.equal(pozycjaCountLabel(101), "pozycja");
  assert.equal(pozycjaCountLabel(701), "pozycja");
});

test("directory names sort with Polish collation", () => {
  const people = [
    { id: 4, name: "\u017baneta" },
    { id: 2, name: "\u0141ukasz" },
    { id: 1, name: "Adam" },
    { id: 6, name: "Lukasz" },
    { id: 3, name: "Zosia" },
    { id: 5, name: "Adam" },
  ];
  assert.deepEqual(
    sortPeopleByName(people).map((person) => person.id),
    [1, 5, 6, 2, 3, 4],
  );
  assert.deepEqual(
    people.map((person) => person.id),
    [4, 2, 1, 6, 3, 5],
  );
});

test("item count line is omitted when there are no items", () => {
  assert.equal(formatItemCount(0), null);
  assert.equal(formatItemCount(-2), null);
  assert.equal(formatItemCount(1), "1 pozycja");
  assert.equal(formatItemCount(22), "22 pozycje");
  assert.equal(formatItemCount(5), "5 pozycji");
});

test("activity order breaks ties by Polish name", () => {
  const people = [
    { id: 1, name: "Zenon" },
    { id: 2, name: "Anna" },
    { id: 3, name: "Bartek" },
  ];
  const counts = new Map<number, number>([[1, 4], [3, 9], [2, 4]]);
  assert.deepEqual(
    peopleByActivity(people, counts, 2).map((person) => person.name),
    ["Bartek", "Anna"],
  );
  assert.deepEqual(people.map((person) => person.id), [1, 2, 3]);
});
