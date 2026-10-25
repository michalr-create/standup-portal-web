import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DIRECTORY_LETTERS,
  directoryLetter,
  groupPeopleByLetter,
  peopleByActivity,
  pozycjaCountLabel,
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

test("directory letters keep \u0141 after L and \u017b at the end", () => {
  const letters = [...DIRECTORY_LETTERS];
  assert.ok(letters.indexOf("L") + 1 === letters.indexOf("\u0141"));
  assert.equal(letters[letters.length - 1], "\u017b");
  assert.equal(directoryLetter(" \u0142ukasz "), "\u0141");
  assert.equal(directoryLetter(""), "#");
});

test("grouping keeps database order inside a letter", () => {
  const groups = groupPeopleByLetter([
    { name: "Abelard Giza" },
    { name: "Antoni Syrek-D\u0105browski" },
    { name: "Lego\u0144koff" },
    { name: "\u0141ukasz Lotek Lodkowski" },
    { name: "Magda Kubicka" },
  ]);
  assert.deepEqual(groups.map((group) => group.letter), ["A", "L", "\u0141", "M"]);
  assert.deepEqual(groups[0].people.map((person) => person.name), [
    "Abelard Giza",
    "Antoni Syrek-D\u0105browski",
  ]);
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
