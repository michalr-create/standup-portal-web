import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assembleContentPaths,
  collectRevalidateRefs,
  explicitPaths,
  type ResolvedSlugs,
} from "./revalidate-content.ts";
import { secretsMatch } from "./revalidate-secret.ts";

const emptyResolved = (): ResolvedSlugs => ({
  categorySlugs: [],
  showSlugs: [],
  personSlugs: [],
  tagSlugs: [],
  hasShow: false,
});

test("category slugs map to the public listing routes", () => {
  const refs = collectRevalidateRefs({
    type: "UPDATE",
    table: "content_items",
    record: { id: 10, status: "approved", category_id: 6, show_id: null },
    old_record: { id: 10, status: "pending", category_id: 3, show_id: null },
  });
  const resolved = emptyResolved();
  resolved.categorySlugs = ["roast", "wywiady"];

  assert.deepEqual(assembleContentPaths(refs, resolved), ["/", "/roast", "/ulubione", "/wywiady"]);
});

test("show ids revalidate the format page and the formaty index", () => {
  const refs = collectRevalidateRefs({
    type: "INSERT",
    table: "content_items",
    record: { id: 4, status: "approved", category_id: 2, show_id: 9 },
    old_record: null,
    tag_context: [
      { slug: "special", tag_type: "topic", person_slug: null },
      { slug: "abelard-giza", tag_type: "person", person_slug: "abelard-giza" },
    ],
  });
  const resolved: ResolvedSlugs = {
    categorySlugs: ["formaty"],
    showSlugs: ["wahanie"],
    personSlugs: [],
    tagSlugs: [],
    hasShow: true,
  };

  assert.deepEqual(refs.categoryIds, [2]);
  assert.deepEqual(refs.showIds, [9]);
  assert.deepEqual(refs.itemIds, [4]);
  assert.deepEqual(assembleContentPaths(refs, resolved), [
    "/",
    "/format/wahanie",
    "/formaty",
    "/specjale",
    "/standuper/abelard-giza",
    "/ulubione",
  ]);
});

test("unknown slugs are dropped and a missing show slug still refreshes /formaty", () => {
  const refs = collectRevalidateRefs({
    type: "UPDATE",
    table: "content_items",
    record: { id: "15", category_id: "nope", show_id: 3 },
    old_record: { show_id: null, category_id: 1 },
  });
  const resolved = emptyResolved();
  resolved.categorySlugs = ["../admin", "Kulisy"];
  resolved.hasShow = true;

  assert.deepEqual(refs.itemIds, [15]);
  assert.deepEqual(refs.showIds, [3]);
  assert.deepEqual(refs.categoryIds, [1]);
  assert.deepEqual(assembleContentPaths(refs, resolved), ["/", "/formaty", "/kulisy", "/ulubione"]);
});

test("content_tags payload keeps removed tag ids and the parent item", () => {
  const refs = collectRevalidateRefs({
    type: "DELETE",
    table: "content_tags",
    record: null,
    old_record: null,
    content_item_ids: [10, "10", 0],
    tag_ids: [4],
  });
  const resolved = emptyResolved();
  resolved.categorySlugs = ["standup"];
  resolved.personSlugs = ["rafal-paczes"];
  resolved.tagSlugs = ["special"];

  assert.equal(refs.kind, "content");
  assert.deepEqual(refs.itemIds, [10]);
  assert.deepEqual(refs.tagIds, [4]);
  assert.deepEqual(assembleContentPaths(refs, resolved), [
    "/",
    "/specjale",
    "/standup",
    "/standuper/rafal-paczes",
    "/ulubione",
  ]);
});

test("explicit paths ignore anything that is not a site path", () => {
  assert.deepEqual(
    explicitPaths({
      paths: ["/", "/formaty", "https://evil.example", "../admin", "/standuper/ok", "//evil", "/specjale"],
    }),
    ["/", "/formaty", "/specjale", "/standuper/ok"],
  );
  assert.equal(collectRevalidateRefs({ paths: ["/standup"] }).kind, "none");
});

test("secrets match in constant time across different lengths", () => {
  assert.equal(secretsMatch("same-secret", "same-secret"), true);
  assert.equal(secretsMatch("same-secret", "other-secret"), false);
  assert.equal(secretsMatch("", "other-secret"), false);
  assert.equal(secretsMatch("short", "much-longer-secret"), false);
});
