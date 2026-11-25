import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MATERIAL_TITLE_MAX,
  assembleTagIds,
  normalizeMaterialDraft,
  resolvePersonTagPlan,
  tagOptionLabel,
} from "./material-edit.ts";

const base = {
  title: "  Wentyl  ",
  description: "  program  ",
  categoryId: 2,
  showId: null,
  personIds: [4, 4, 9],
  tagIds: [3],
};

test("draft trims text, drops duplicate ids, and keeps empty description", () => {
  const parsed = normalizeMaterialDraft(base);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.value.title, "Wentyl");
  assert.equal(parsed.value.description, "program");
  assert.deepEqual(parsed.value.personIds, [4, 9]);
  assert.equal(parsed.value.categoryId, 2);
  assert.equal(parsed.value.showId, null);

  const empty = normalizeMaterialDraft({ ...base, description: "   " });
  assert.equal(empty.ok, true);
  if (empty.ok) assert.equal(empty.value.description, "");
});

test("draft rejects a blank title, oversized text, and bad ids", () => {
  assert.equal(normalizeMaterialDraft({ ...base, title: "  " }).ok, false);
  assert.equal(normalizeMaterialDraft({ ...base, title: "a".repeat(MATERIAL_TITLE_MAX + 1) }).ok, false);
  assert.equal(normalizeMaterialDraft({ ...base, categoryId: 0 }).ok, false);
  assert.equal(normalizeMaterialDraft({ ...base, showId: 1.5 }).ok, false);
  assert.equal(normalizeMaterialDraft({ ...base, personIds: ["4"] }).ok, false);
  assert.equal(normalizeMaterialDraft({ ...base, tagIds: [-1] }).ok, false);
  assert.equal(normalizeMaterialDraft({ ...base, description: 1 }).ok, false);
  assert.equal(normalizeMaterialDraft({ ...base, slug: "Dodaj" }).ok, false);
  assert.equal(normalizeMaterialDraft({ ...base, slug: "page" }).ok, false);
  const withSlug = normalizeMaterialDraft({ ...base, slug: " Wentyl-2026 " });
  assert.equal(withSlug.ok, true);
  if (withSlug.ok) assert.equal(withSlug.value.slug, "wentyl-2026");
  const emptySlug = normalizeMaterialDraft(base);
  assert.equal(emptySlug.ok, true);
  if (emptySlug.ok) assert.equal(emptySlug.value.slug, "");
});

test("person tags stay in the chosen order and unknown people fail", () => {
  const people = [
    { id: 1, name: "Anna", slug: "anna" },
    { id: 2, name: "Bartek", slug: "bartek" },
  ];
  const tags = [
    { id: 10, personId: 1 },
    { id: 11, personId: 1 },
  ];
  const plan = resolvePersonTagPlan(people, tags, [2, 1]);
  assert.equal(plan.ok, true);
  if (!plan.ok) return;
  assert.deepEqual(plan.slots, [
    { kind: "create", person: people[1] },
    { kind: "tag", tagId: 10 },
  ]);

  const missing = resolvePersonTagPlan(people, tags, [1, 9]);
  assert.deepEqual(missing, { ok: false, error: "Nieznany standuper." });
});

test("tag assembly puts people first and collapses duplicates", () => {
  assert.deepEqual(assembleTagIds([10, 11], [11, 3, 3]), [10, 11, 3]);
  assert.deepEqual(assembleTagIds([], []), []);
  assert.equal(tagOptionLabel({ name: "specjal", tagType: "topic" }), "Temat: specjal");
});
