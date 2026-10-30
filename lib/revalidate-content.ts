/**
 * Path selection for on-demand ISR. Category listings follow the public app:
 * each categories.slug is served at /{slug} (Sidebar and the listing pages).
 * /specjale is the "special" tag, not a category. /ulubione is a client page, but the
 * root layout's revalidate still statically generates it, so it is included.
 */

export const SPECJALE_CACHE_TAG = "specjale";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type TagRef = {
  slug?: string | null;
  tag_type?: string | null;
  person_slug?: string | null;
};

export type RevalidateRefs = {
  kind: "content" | "none";
  categoryIds: number[];
  showIds: number[];
  itemIds: number[];
  tagIds: number[];
  embeddedTags: TagRef[];
};

export type ResolvedSlugs = {
  categorySlugs: string[];
  showSlugs: string[];
  personSlugs: string[];
  tagSlugs: string[];
  /** True when a show id was present even if its slug could not be resolved. */
  hasShow: boolean;
};

export function numericId(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0 && value <= Number.MAX_SAFE_INTEGER) {
    return value;
  }
  if (typeof value === "string" && /^[0-9]+$/.test(value)) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function uniqueNumbers(values: number[]): number[] {
  return [...new Set(values)];
}

function pushId(target: number[], value: unknown) {
  const id = numericId(value);
  if (id != null) target.push(id);
}

export function normalizeSlug(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const slug = value.trim().toLowerCase();
  if (!SLUG.test(slug)) return null;
  return slug;
}

export function categoryListingPath(slug: unknown): string | null {
  const normalized = normalizeSlug(slug);
  if (!normalized) return null;
  return `/${normalized}`;
}

export function formatPath(slug: unknown): string | null {
  const normalized = normalizeSlug(slug);
  if (!normalized) return null;
  return `/format/${normalized}`;
}

export function standuperPath(slug: unknown): string | null {
  const normalized = normalizeSlug(slug);
  if (!normalized) return null;
  return `/standuper/${normalized}`;
}

/** Explicit `{paths}` entries. Anything that is not a site path is ignored. */
export function sanitizeExplicitPath(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const path = input.trim();
  if (path.length === 0 || path.length > 200) return null;
  const lower = path.toLowerCase();
  if (lower.includes("%2e") || path.includes("..") || path.includes("\\") || path.includes("//")) return null;
  if (path.includes("?") || path.includes("#")) return null;
  if (!/^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/.test(lower)) return null;
  return lower;
}

export function explicitPaths(body: Record<string, unknown>): string[] {
  if (!Array.isArray(body.paths)) return [];
  const paths = new Set<string>();
  for (const entry of body.paths) {
    const path = sanitizeExplicitPath(entry);
    if (path) paths.add(path);
  }
  return [...paths].sort();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function tagRef(value: unknown): TagRef | null {
  if (typeof value === "string") return { slug: value };
  const record = asRecord(value);
  if (!record) return null;
  const slug = typeof record.slug === "string" ? record.slug : null;
  const tagType = typeof record.tag_type === "string" ? record.tag_type : null;
  const personSlug = typeof record.person_slug === "string" ? record.person_slug : null;
  if (!slug && !personSlug) return null;
  return { slug, tag_type: tagType, person_slug: personSlug };
}

function tagRefs(value: unknown): TagRef[] {
  if (!Array.isArray(value)) return [];
  const refs: TagRef[] = [];
  for (const entry of value) {
    const tag = tagRef(entry);
    if (tag) refs.push(tag);
  }
  return refs;
}

function collectRow(refs: RevalidateRefs, row: Record<string, unknown> | null, table: string | null) {
  if (!row) return;
  if (table === "content_tags") {
    pushId(refs.itemIds, row.content_item_id);
    pushId(refs.tagIds, row.tag_id);
    return;
  }
  pushId(refs.itemIds, row.id);
  pushId(refs.categoryIds, row.category_id);
  pushId(refs.showIds, row.show_id);
  refs.embeddedTags.push(...tagRefs(row.tags));
}

export function collectRevalidateRefs(body: Record<string, unknown>): RevalidateRefs {
  const table = typeof body.table === "string" ? body.table : null;
  const type = typeof body.type === "string" ? body.type : null;
  const webhook =
    table === "content_items" ||
    table === "content_tags" ||
    (table == null && (type === "INSERT" || type === "UPDATE" || type === "DELETE"));

  const refs: RevalidateRefs = {
    kind: webhook ? "content" : "none",
    categoryIds: [],
    showIds: [],
    itemIds: [],
    tagIds: [],
    embeddedTags: [],
  };
  if (!webhook) return refs;

  const effectiveTable = table === "content_tags" ? "content_tags" : "content_items";
  collectRow(refs, asRecord(body.record), effectiveTable);
  collectRow(refs, asRecord(body.old_record), effectiveTable);

  if (Array.isArray(body.content_item_ids)) {
    for (const id of body.content_item_ids) pushId(refs.itemIds, id);
  }
  if (Array.isArray(body.tag_ids)) {
    for (const id of body.tag_ids) pushId(refs.tagIds, id);
  }
  refs.embeddedTags.push(...tagRefs(body.tag_context));

  refs.categoryIds = uniqueNumbers(refs.categoryIds);
  refs.showIds = uniqueNumbers(refs.showIds);
  refs.itemIds = uniqueNumbers(refs.itemIds);
  refs.tagIds = uniqueNumbers(refs.tagIds);
  return refs;
}

function addSlug(target: Set<string>, value: unknown) {
  const slug = normalizeSlug(value);
  if (slug) target.add(slug);
}

export function assembleContentPaths(refs: RevalidateRefs, resolved: ResolvedSlugs): string[] {
  if (refs.kind !== "content") return [];

  const paths = new Set<string>();
  paths.add("/");

  const categorySlugs = new Set<string>();
  const showSlugs = new Set<string>();
  const personSlugs = new Set<string>();
  const tagSlugs = new Set<string>();

  for (const slug of resolved.categorySlugs) addSlug(categorySlugs, slug);
  for (const slug of resolved.showSlugs) addSlug(showSlugs, slug);
  for (const slug of resolved.personSlugs) addSlug(personSlugs, slug);
  for (const slug of resolved.tagSlugs) addSlug(tagSlugs, slug);

  for (const tag of refs.embeddedTags) {
    addSlug(tagSlugs, tag.slug);
    if (tag.tag_type === "person") addSlug(personSlugs, tag.person_slug ?? tag.slug);
    else addSlug(personSlugs, tag.person_slug);
    if (normalizeSlug(tag.slug) === "special") tagSlugs.add("special");
  }

  for (const slug of categorySlugs) {
    const path = categoryListingPath(slug);
    if (path) paths.add(path);
  }
  for (const slug of showSlugs) {
    const path = formatPath(slug);
    if (path) paths.add(path);
  }
  if (resolved.hasShow || refs.showIds.length > 0 || showSlugs.size > 0 || categorySlugs.has("formaty")) {
    paths.add("/formaty");
  }
  for (const slug of personSlugs) {
    const path = standuperPath(slug);
    if (path) paths.add(path);
  }
  if (tagSlugs.has("special")) paths.add("/specjale");
  paths.add("/ulubione");

  return [...paths].sort();
}
