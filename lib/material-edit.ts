export const MATERIAL_TITLE_MAX = 500;
export const MATERIAL_DESCRIPTION_MAX = 5000;

export type MaterialDraft = {
  title: string;
  description: string;
  categoryId: number | null;
  showId: number | null;
  personIds: number[];
  tagIds: number[];
};

export type MaterialDraftResult =
  | { ok: true; value: MaterialDraft }
  | { ok: false; error: string };

type DraftError = { ok: false; error: string };

export type NamedId = { id: number; name: string };

export type TagOption = { id: number; name: string; tagType: string };

export type MaterialEditorData = {
  item: {
    id: number;
    title: string;
    description: string;
    url: string;
    status: string;
    categoryId: number | null;
    showId: number | null;
  };
  categories: NamedId[];
  shows: NamedId[];
  people: NamedId[];
  tags: TagOption[];
  personIds: number[];
  tagIds: number[];
};

const TAG_TYPE_LABELS: Record<string, string> = {
  topic: "Temat",
  format: "Format",
  event: "Wydarzenie",
  wystapienie_goscinne: "Typ",
};

export function tagOptionLabel(tag: { name: string; tagType: string }): string {
  const kind = TAG_TYPE_LABELS[tag.tagType] ?? tag.tagType;
  return `${kind}: ${tag.name}`;
}

function fail(error: string): DraftError {
  return { ok: false, error };
}

function optionalId(value: unknown, label: string): { ok: true; id: number | null } | DraftError {
  if (value == null) return { ok: true, id: null };
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return fail(`Nieprawidłowy identyfikator (${label}).`);
  }
  return { ok: true, id: value };
}

function idList(value: unknown, label: string): { ok: true; ids: number[] } | DraftError {
  if (!Array.isArray(value)) return fail(`Nieprawidłowa lista: ${label}.`);
  const ids: number[] = [];
  const seen = new Set<number>();
  for (const id of value) {
    if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
      return fail(`Nieprawidłowy identyfikator (${label}).`);
    }
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return { ok: true, ids };
}

export function normalizeMaterialDraft(input: {
  title: unknown;
  description: unknown;
  categoryId: unknown;
  showId: unknown;
  personIds: unknown;
  tagIds: unknown;
}): MaterialDraftResult {
  if (typeof input.title !== "string") return fail("Podaj tytuł.");
  const title = input.title.trim();
  if (!title) return fail("Podaj tytuł.");
  if (title.length > MATERIAL_TITLE_MAX) {
    return fail(`Tytuł może mieć najwyżej ${MATERIAL_TITLE_MAX} znaków.`);
  }

  if (typeof input.description !== "string") return fail("Nieprawidłowy opis.");
  const description = input.description.trim();
  if (description.length > MATERIAL_DESCRIPTION_MAX) {
    return fail(`Opis może mieć najwyżej ${MATERIAL_DESCRIPTION_MAX} znaków.`);
  }

  const categoryId = optionalId(input.categoryId, "kategoria");
  if (!categoryId.ok) return categoryId;
  const showId = optionalId(input.showId, "format");
  if (!showId.ok) return showId;
  const personIds = idList(input.personIds, "standuperzy");
  if (!personIds.ok) return personIds;
  const tagIds = idList(input.tagIds, "tagi");
  if (!tagIds.ok) return tagIds;

  return {
    ok: true,
    value: {
      title,
      description,
      categoryId: categoryId.id,
      showId: showId.id,
      personIds: personIds.ids,
      tagIds: tagIds.ids,
    },
  };
}

export type PersonTagSlot =
  | { kind: "tag"; tagId: number }
  | { kind: "create"; person: { id: number; name: string; slug: string } };

export type PersonTagPlan =
  | { ok: true; slots: PersonTagSlot[] }
  | { ok: false; error: string };

/**
 * People on a material are person-tags (tags.person_id + content_tags).
 * There is no content_people table. Missing person tags are created.
 * Slot order matches personIds.
 */
export function resolvePersonTagPlan(
  people: readonly { id: number; name: string; slug: string }[],
  personTags: readonly { id: number; personId: number | null }[],
  personIds: readonly number[],
): PersonTagPlan {
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const tagByPerson = new Map<number, number>();
  for (const tag of personTags) {
    if (tag.personId == null || tagByPerson.has(tag.personId)) continue;
    tagByPerson.set(tag.personId, tag.id);
  }

  const slots: PersonTagSlot[] = [];
  for (const personId of personIds) {
    const person = peopleById.get(personId);
    if (!person) return { ok: false, error: "Nieznany standuper." };
    const existing = tagByPerson.get(personId);
    if (existing != null) slots.push({ kind: "tag", tagId: existing });
    else slots.push({ kind: "create", person });
  }
  return { ok: true, slots };
}

/** Person tags first, then other tags. Duplicates collapse, order stays. */
export function assembleTagIds(personTagIds: readonly number[], contentTagIds: readonly number[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const id of [...personTagIds, ...contentTagIds]) {
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}
