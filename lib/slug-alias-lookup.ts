import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";
import { PUBLIC_SLUG } from "@/lib/slugify";

const REVALIDATE_SECONDS = 120;

export type AliasPerson = { id: number; name: string; slug: string };

function positiveId(value: unknown): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return value;
  if (typeof value === "string" && /^[1-9]\d*$/.test(value)) {
    const id = Number(value);
    return Number.isSafeInteger(id) ? id : null;
  }
  return null;
}

function publicSlug(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const slug = value.trim();
  return PUBLIC_SLUG.test(slug) ? slug : null;
}

async function aliasTarget(
  table: "people_slug_aliases" | "show_slug_aliases",
  column: "person_id" | "show_id",
  live: "people" | "shows",
  slug: string,
): Promise<string | null> {
  if (!PUBLIC_SLUG.test(slug)) return null;
  const alias = await supabase.from(table).select(column).eq("slug", slug).maybeSingle();
  if (alias.error || !alias.data) {
    if (alias.error) console.error("Błąd aliasu sluga:", alias.error.message);
    return null;
  }
  const id = positiveId((alias.data as Record<string, unknown>)[column]);
  if (id == null) return null;
  const current = await supabase.from(live).select("slug").eq("id", id).maybeSingle();
  if (current.error || !current.data) {
    if (current.error) console.error("Błąd aliasu sluga:", current.error.message);
    return null;
  }
  const canonical = publicSlug(current.data.slug);
  if (!canonical || canonical === slug) return null;
  return canonical;
}

const personAliasTargetCached = unstable_cache(
  (slug: string) => aliasTarget("people_slug_aliases", "person_id", "people", slug),
  ["person-slug-alias"],
  { revalidate: REVALIDATE_SECONDS },
);

const showAliasTargetCached = unstable_cache(
  (slug: string) => aliasTarget("show_slug_aliases", "show_id", "shows", slug),
  ["show-slug-alias"],
  { revalidate: REVALIDATE_SECONDS },
);

/** Current person slug when `slug` is a historical alias. Null otherwise. */
export function personAliasTarget(slug: string): Promise<string | null> {
  return personAliasTargetCached(slug);
}

/** Current show slug when `slug` is a historical alias. Null otherwise. */
export function showAliasTarget(slug: string): Promise<string | null> {
  return showAliasTargetCached(slug);
}

async function aliasIdMap(
  table: "people_slug_aliases" | "show_slug_aliases",
  column: "person_id" | "show_id",
  slugs: readonly string[],
): Promise<Map<string, number>> {
  const clean = slugs.filter((slug) => PUBLIC_SLUG.test(slug));
  const out = new Map<string, number>();
  if (clean.length === 0) return out;
  const alias = await supabase.from(table).select(`slug, ${column}`).in("slug", clean);
  if (alias.error || !alias.data) {
    if (alias.error) console.error("Błąd aliasów sluga:", alias.error.message);
    return out;
  }
  for (const row of alias.data as Record<string, unknown>[]) {
    const from = publicSlug(row.slug);
    const id = positiveId(row[column]);
    if (from && id != null) out.set(from, id);
  }
  return out;
}

async function slugRenames(
  table: "people_slug_aliases" | "show_slug_aliases",
  column: "person_id" | "show_id",
  live: "people" | "shows",
  slugs: readonly string[],
): Promise<Record<string, string>> {
  const idByAlias = await aliasIdMap(table, column, slugs);
  const ids = [...new Set(idByAlias.values())];
  if (ids.length === 0) return {};
  const current = await supabase.from(live).select("id, slug").in("id", ids);
  if (current.error || !current.data) {
    if (current.error) console.error("Błąd aliasów sluga:", current.error.message);
    return {};
  }
  const slugById = new Map<number, string>();
  for (const row of current.data as { id: unknown; slug: unknown }[]) {
    const id = positiveId(row.id);
    const slug = publicSlug(row.slug);
    if (id != null && slug) slugById.set(id, slug);
  }
  const out: Record<string, string> = {};
  for (const [from, id] of idByAlias) {
    const to = slugById.get(id);
    if (to && to !== from) out[from] = to;
  }
  return out;
}

/** Historical person slug to the row's current slug. Unknown keys are omitted. */
export function personSlugRenames(slugs: readonly string[]): Promise<Record<string, string>> {
  return slugRenames("people_slug_aliases", "person_id", "people", slugs);
}

/** Historical show slug to the row's current slug. Unknown keys are omitted. */
export function showSlugRenames(slugs: readonly string[]): Promise<Record<string, string>> {
  return slugRenames("show_slug_aliases", "show_id", "shows", slugs);
}

/** Replace historical slugs and drop duplicates. On lookup failure, keep the input. */
export async function canonicalPersonSlugs(slugs: readonly string[]): Promise<string[]> {
  const renames = await personSlugRenames(slugs);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const slug of slugs) {
    const next = renames[slug] ?? slug;
    if (seen.has(next)) continue;
    seen.add(next);
    out.push(next);
  }
  return out;
}

async function recordsByAlias(
  table: "people_slug_aliases" | "show_slug_aliases",
  column: "person_id" | "show_id",
  live: "people" | "shows",
  slugs: readonly string[],
): Promise<AliasPerson[]> {
  const liveIds = [...new Set((await aliasIdMap(table, column, slugs)).values())];
  if (liveIds.length === 0) return [];
  const current = await supabase.from(live).select("id, name, slug").in("id", liveIds);
  if (current.error || !current.data) {
    if (current.error) console.error("Błąd aliasów sluga:", current.error.message);
    return [];
  }
  const out: AliasPerson[] = [];
  for (const row of current.data as { id: unknown; name: unknown; slug: unknown }[]) {
    const id = positiveId(row.id);
    const slug = publicSlug(row.slug);
    if (id == null || !slug || typeof row.name !== "string") continue;
    out.push({ id, name: row.name, slug });
  }
  return out;
}

export function peopleByAliasSlugs(slugs: readonly string[]): Promise<AliasPerson[]> {
  return recordsByAlias("people_slug_aliases", "person_id", "people", slugs);
}

export function showsByAliasSlugs(slugs: readonly string[]): Promise<AliasPerson[]> {
  return recordsByAlias("show_slug_aliases", "show_id", "shows", slugs);
}
