import { cache } from "react";
import { SEARCH_CANDIDATE_LIMIT, SEARCH_RESULT_LIMIT, dedupeSearchItems } from "@/lib/search";
import { supabase } from "@/lib/supabase";

export type Item = {
  id: number;
  title: string;
  url: string;
  thumbnail_url: string | null;
  published_at: string | null;
  source_id: number;
  show_id: number | null;
  category_id: number | null;
  episode_group_id: string | null;
  duration_seconds: number | null;
  // pola pochodne (wypełniane w hydratacji)
  showName: string | null;
  showSlug: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  people: { name: string; slug: string }[];
  tags: { name: string; slug: string; tag_type: string }[];
};

export type Person = {
  id: number;
  name: string;
  slug: string;
  bio: string | null;
  photo_url: string | null;
  role: string | null;
};

export type Show = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  photo_url: string | null;
  category_id: number | null;
  category_name: string | null;
  category_slug: string | null;
  youtube_channel_url: string | null;
  spotify_show_url: string | null;
  apple_podcasts_url: string | null;
  website_url: string | null;
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
};

// =================================================================
// HELPER: hydratacja item (dodanie show, kategorii, person tagów)
// =================================================================
async function hydrateItems(rawItems: {
  id: number;
  title: string;
  url: string;
  thumbnail_url: string | null;
  published_at: string | null;
  source_id: number;
  show_id: number | null;
  category_id: number | null;
  episode_group_id: string | null;
  duration_seconds: number | null;
}[]): Promise<Item[]> {
  if (rawItems.length === 0) return [];

  const itemIds = rawItems.map((i) => i.id);
  const showIds = Array.from(new Set(rawItems.map((i) => i.show_id).filter((id): id is number => id !== null)));
  const categoryIds = Array.from(new Set(rawItems.map((i) => i.category_id).filter((id): id is number => id !== null)));

  // Pobierz shows
  const { data: shows } = showIds.length > 0
    ? await supabase.from("shows").select("id, name, slug").in("id", showIds)
    : { data: [] };

  // Pobierz categories
  const { data: categories } = categoryIds.length > 0
    ? await supabase.from("categories").select("id, name, slug").in("id", categoryIds)
    : { data: [] };

  // Pobierz tagi person dla tych itemów
  const { data: contentTags } = await supabase
    .from("content_tags")
    .select("content_item_id, tag_id, tags!inner(id, person_id, tag_type)")
    .in("content_item_id", itemIds)
    .eq("tags.tag_type", "person");

  // Pobierz tagi non-person (topic, format, event) dla tych itemów
  const { data: nonPersonTagsData } = await supabase
    .from("content_tags")
    .select("content_item_id, tags!inner(id, name, slug, tag_type)")
    .in("content_item_id", itemIds)
    .neq("tags.tag_type", "person");

  // Pobierz person z tagów
type CtRow = {
    content_item_id: number;
    tag_id: number;
    tags: { id: number; person_id: number | null; tag_type: string }[] | { id: number; person_id: number | null; tag_type: string } | null;
  };

type NpCtRow = {
    content_item_id: number;
    tags: { id: number; name: string; slug: string; tag_type: string }[] | { id: number; name: string; slug: string; tag_type: string } | null;
  };

  const personIds = Array.from(new Set(
    (contentTags as CtRow[] | null || [])
      .flatMap((ct) => {
        const t = ct.tags;
        if (!t) return [];
        const arr = Array.isArray(t) ? t : [t];
        return arr.map((tag) => tag.person_id).filter((id): id is number => id !== null);
      })
  ));

  const { data: people } = personIds.length > 0
    ? await supabase.from("people").select("id, name, slug").in("id", personIds)
    : { data: [] };

  // Mapy do szybkiego lookupu
  const showsMap = new Map((shows || []).map((s) => [s.id, s]));
  const categoriesMap = new Map((categories || []).map((c) => [c.id, c]));
  const peopleMap = new Map((people || []).map((p) => [p.id, p]));

// Map: item_id -> lista person
  const itemPeopleMap = new Map<number, { name: string; slug: string }[]>();
  for (const ct of (contentTags as CtRow[] | null) || []) {
    const t = ct.tags;
    if (!t) continue;
    const arr = Array.isArray(t) ? t : [t];
    for (const tag of arr) {
      if (tag.person_id === null) continue;
      const person = peopleMap.get(tag.person_id);
      if (!person) continue;
      if (!itemPeopleMap.has(ct.content_item_id)) {
        itemPeopleMap.set(ct.content_item_id, []);
      }
      itemPeopleMap.get(ct.content_item_id)!.push({ name: person.name, slug: person.slug });
    }
  }

  // Map: item_id -> lista non-person tagów
  const itemTagsMap = new Map<number, { name: string; slug: string; tag_type: string }[]>();
  for (const ct of (nonPersonTagsData as NpCtRow[] | null) || []) {
    const t = ct.tags;
    if (!t) continue;
    const arr = Array.isArray(t) ? t : [t];
    for (const tag of arr) {
      if (!itemTagsMap.has(ct.content_item_id)) {
        itemTagsMap.set(ct.content_item_id, []);
      }
      itemTagsMap.get(ct.content_item_id)!.push({ name: tag.name, slug: tag.slug, tag_type: tag.tag_type });
    }
  }

  return rawItems.map((item) => {
    const show = item.show_id ? showsMap.get(item.show_id) : null;
    const category = item.category_id ? categoriesMap.get(item.category_id) : null;
    return {
      ...item,
      showName: show?.name || null,
      showSlug: show?.slug || null,
      categoryName: category?.name || null,
      categorySlug: category?.slug || null,
      people: itemPeopleMap.get(item.id) || [],
      tags: itemTagsMap.get(item.id) || [],
    };
  });
}

// =================================================================
// QUERY: wszystkie zatwierdzone wpisy
// =================================================================
export async function getAllApprovedItems(limit = 100): Promise<Item[]> {
  const { data, error } = await supabase
    .from("content_items")
    .select("id, title, url, thumbnail_url, published_at, source_id, show_id, category_id, episode_group_id, duration_seconds")
    .eq("status", "approved")
    .is("merged_into_id", null)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error("Blad pobierania:", error);
    return [];
  }

  return hydrateItems(data);
}

// =================================================================
// QUERY: zatwierdzone wpisy w danej kategorii
// =================================================================
// Limit dotyczy jednej strony listy. Filtry osoby i tagu idą przez getCategoryBrowse,
// bo obcięcie do pierwszych N wpisów gubi starsze pozycje tej osoby (w tym speciale).
export async function getItemsByCategorySlug(slug: string, limit = 100): Promise<Item[]> {
  const { data: cat } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (!cat) return [];

  const { data, error } = await supabase
    .from("content_items")
    .select("id, title, url, thumbnail_url, published_at, source_id, show_id, category_id, episode_group_id, duration_seconds")
    .eq("status", "approved")
    .eq("category_id", cat.id)
    .is("merged_into_id", null)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return hydrateItems(data);
}

// =================================================================
// QUERY: zatwierdzone wpisy danego show
// =================================================================
export async function getItemsByShowSlug(slug: string, limit = 100): Promise<Item[]> {
  const { data: show } = await supabase
    .from("shows")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (!show) return [];

  // Znajdź source_ids powiązane z tym show i kategorię shorts do wykluczenia
  const [sourcesRes, shortsCatRes] = await Promise.all([
    supabase.from("sources").select("id").eq("show_id", show.id),
    supabase.from("categories").select("id").eq("slug", "shorts").maybeSingle(),
  ]);

  const sourceIds = (sourcesRes.data || []).map((s) => s.id);
  const shortsCatId = shortsCatRes.data?.id;

  const cols = "id, title, url, thumbnail_url, published_at, source_id, show_id, category_id, episode_group_id, duration_seconds";

  // Zapytanie 1: items z show_id ustawionym bezpośrednio
  let q1 = supabase
    .from("content_items")
    .select(cols)
    .eq("status", "approved")
    .eq("show_id", show.id)
    .neq("content_type", "short")
    .is("merged_into_id", null)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (shortsCatId) q1 = q1.neq("category_id", shortsCatId);
  const { data: byShowId } = await q1;

  // Zapytanie 2: items z sourców przypisanych do tego show
  let q2Base = supabase
    .from("content_items")
    .select(cols)
    .eq("status", "approved")
    .neq("content_type", "short")
    .is("merged_into_id", null)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (shortsCatId) q2Base = q2Base.neq("category_id", shortsCatId);

  const { data: bySourceId } = sourceIds.length > 0
    ? await q2Base.in("source_id", sourceIds)
    : { data: [] };

  // Merge z deduplicacją po id, sortowanie po dacie
  const seen = new Set<number>();
  const merged: NonNullable<typeof byShowId> = [];
  for (const item of [...(byShowId || []), ...(bySourceId || [])]) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      merged.push(item);
    }
  }
  merged.sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""));

  return hydrateItems(merged.slice(0, limit));
}

// =================================================================
// QUERY: zatwierdzone wpisy w których występuje dana person (przez tag)
// =================================================================
export async function getItemsByPersonSlug(slug: string, limit = 100): Promise<Item[]> {
  // Najpierw znajdź tag person dla tego slug
  const { data: tag } = await supabase
    .from("tags")
    .select("id")
    .eq("slug", slug)
    .eq("tag_type", "person")
    .maybeSingle();

  if (!tag) return [];

  // Potem znajdź content_item_id-y które mają ten tag
  const { data: ctRows } = await supabase
    .from("content_tags")
    .select("content_item_id")
    .eq("tag_id", tag.id);

  const itemIds = (ctRows || []).map((row) => row.content_item_id);
  if (itemIds.length === 0) return [];

  const { data, error } = await supabase
    .from("content_items")
    .select("id, title, url, thumbnail_url, published_at, source_id, show_id, category_id, episode_group_id, duration_seconds")
    .eq("status", "approved")
    .is("merged_into_id", null)
    .in("id", itemIds)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return hydrateItems(data);
}

// =================================================================
// QUERY: dane person po slugu
// =================================================================
export async function getPersonBySlug(slug: string): Promise<Person | null> {
  const { data } = await supabase
    .from("people")
    .select("id, name, slug, bio, photo_url, role")
    .eq("slug", slug)
    .maybeSingle();

  return data || null;
}

// =================================================================
// QUERY: dane show po slugu (z kategorią) i prowadzącymi
// =================================================================
export async function getShowBySlug(slug: string): Promise<Show | null> {
  const { data: show } = await supabase
    .from("shows")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!show) return null;

  let categoryName = null;
  let categorySlug = null;
  if (show.category_id) {
    const { data: cat } = await supabase
      .from("categories")
      .select("name, slug")
      .eq("id", show.category_id)
      .maybeSingle();
    categoryName = cat?.name || null;
    categorySlug = cat?.slug || null;
  }

  return {
    ...show,
    category_name: categoryName,
    category_slug: categorySlug,
  };
}

// =================================================================
// QUERY: prowadzący/regularni goście showa (poprzez source_default_people)
// =================================================================
export async function getShowHosts(showId: number): Promise<Person[]> {
  // Znajdź sources tego showa
  const { data: sources } = await supabase
    .from("sources")
    .select("id")
    .eq("show_id", showId);

  if (!sources || sources.length === 0) return [];

  const sourceIds = sources.map((s) => s.id);

  // Znajdź default_people dla tych sources
  const { data: defaults } = await supabase
    .from("source_default_people")
    .select("person_id")
    .in("source_id", sourceIds);

  const personIds = Array.from(new Set((defaults || []).map((d) => d.person_id)));
  if (personIds.length === 0) return [];

  const { data: people } = await supabase
    .from("people")
    .select("id, name, slug, bio, photo_url, role")
    .in("id", personIds);

  return people || [];
}

// =================================================================
// QUERY: lista wszystkich aktywnych standuperów (do sidebara)
// =================================================================
export async function getAllPeople(): Promise<Person[]> {
  const { data } = await supabase
    .from("people")
    .select("id, name, slug, bio, photo_url, role")
    .eq("is_active", true)
    .order("name");

  return data || [];
}

type PersonItemCountRow = {
  person_id: number | null;
  content_tags: { count: number }[] | { count: number } | null;
};

function approvedCountFromRow(row: PersonItemCountRow): number {
  const tags = row.content_tags;
  const entries = Array.isArray(tags) ? tags : tags ? [tags] : [];
  return entries.reduce((sum, entry) => {
    const n = Number(entry?.count);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
}

// Liczba zatwierdzonych pozycji (bez scalonych duplikatów) per osoba.
// Agregat PostgREST: content_items musi być w select, inaczej filtr statusu nie wchodzi do count.
const PERSON_COUNT_PAGE = 1000;

export const getApprovedItemCountsByPersonId = cache(async (): Promise<Map<number, number>> => {
  const counts = new Map<number, number>();

  for (let offset = 0; ; offset += PERSON_COUNT_PAGE) {
    const { data, error } = await supabase
      .from("tags")
      .select("person_id, content_tags(count, content_items!inner())")
      .eq("tag_type", "person")
      .eq("content_tags.content_items.status", "approved")
      .is("content_tags.content_items.merged_into_id", null)
      .order("person_id", { ascending: true })
      .range(offset, offset + PERSON_COUNT_PAGE - 1);

    if (error) {
      console.error("Blad liczenia pozycji:", error);
      break;
    }

    const rows = (data ?? []) as PersonItemCountRow[];
    for (const row of rows) {
      if (row.person_id == null) continue;
      counts.set(row.person_id, (counts.get(row.person_id) ?? 0) + approvedCountFromRow(row));
    }
    if (rows.length < PERSON_COUNT_PAGE) break;
  }

  return counts;
});

// =================================================================
// QUERY: lista wszystkich aktywnych shows (do sidebara/strony Formaty)
// =================================================================
export async function getAllShows(): Promise<Show[]> {
  const { data } = await supabase
    .from("shows")
    .select("id, name, slug, description, photo_url, category_id, youtube_channel_url, spotify_show_url, apple_podcasts_url, website_url")
    .eq("is_active", true)
    .order("name");

  return (data || []).map((s) => ({
    ...s,
    category_name: null,
    category_slug: null,
  }));
}

// =================================================================
// QUERY: shows w danej kategorii
// =================================================================
export async function getShowsByCategorySlug(slug: string): Promise<Show[]> {
  const { data: cat } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (!cat) return [];

  const { data } = await supabase
    .from("shows")
    .select("id, name, slug, description, photo_url, category_id, youtube_channel_url, spotify_show_url, apple_podcasts_url, website_url")
    .eq("is_active", true)
    .eq("category_id", cat.id)
    .order("name");

  return (data || []).map((s) => ({
    ...s,
    category_name: null,
    category_slug: slug,
  }));
}

// =================================================================
// QUERY: lista wszystkich kategorii (do sidebara)
// =================================================================
export async function getAllCategories(): Promise<Category[]> {
  const { data } = await supabase
    .from("categories")
    .select("id, name, slug, description, display_order")
    .order("display_order");

  return data || [];
}

// =================================================================
// QUERY: dane kategorii po slugu
// =================================================================
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const { data } = await supabase
    .from("categories")
    .select("id, name, slug, description, display_order")
    .eq("slug", slug)
    .maybeSingle();

  return data || null;
}
// =================================================================
// QUERY: nowości (ostatnie N dni, z auto-rozszerzaniem)
// =================================================================
export async function getRecentItems(days = 7, minItems = 3, maxDays = 30): Promise<Item[]> {
  // Znajdz ID kategorii Shorts zeby ja wykluczyc
  const { data: shortsCat } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", "shorts")
    .maybeSingle();

  const shortsCatId = shortsCat?.id;
  let currentDays = days;

  while (currentDays <= maxDays) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - currentDays);

    let query = supabase
      .from("content_items")
      .select("id, title, url, thumbnail_url, published_at, source_id, show_id, category_id, episode_group_id, duration_seconds")
      .eq("status", "approved")
      .is("merged_into_id", null)
      .gte("published_at", cutoff.toISOString())
      .order("published_at", { ascending: false })
      .limit(20);

    if (shortsCatId) {
      query = query.neq("category_id", shortsCatId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Blad pobierania nowosci:", error);
      return [];
    }

    if (data && data.length >= minItems) {
      return hydrateItems(data);
    }

    currentDays += 7;
  }

  // Fallback: ostatnie 20
  let fallbackQuery = supabase
    .from("content_items")
    .select("id, title, url, thumbnail_url, published_at, source_id, show_id, category_id, episode_group_id, duration_seconds")
    .eq("status", "approved")
    .is("merged_into_id", null)
    .order("published_at", { ascending: false })
    .limit(20);

  if (shortsCatId) {
    fallbackQuery = fallbackQuery.neq("category_id", shortsCatId);
  }

  const { data } = await fallbackQuery;
  return hydrateItems(data || []);
}

// =================================================================
// QUERY: polecane (is_featured = true)
// =================================================================
export async function getFeaturedItems(limit = 6): Promise<Item[]> {
  const { data, error } = await supabase
    .from("content_items")
    .select("id, title, url, thumbnail_url, published_at, source_id, show_id, category_id, episode_group_id, duration_seconds")
    .eq("status", "approved")
    .eq("is_featured", true)
    .is("merged_into_id", null)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return hydrateItems(data);
}

// =================================================================
// QUERY: wpisy z danym tagiem (paginacja po published_at desc)
// =================================================================
const ITEM_COLUMNS =
  "id, title, url, thumbnail_url, published_at, source_id, show_id, category_id, episode_group_id, duration_seconds";

type ContentItemRow = {
  id: number;
  title: string;
  url: string;
  thumbnail_url: string | null;
  published_at: string | null;
  source_id: number;
  show_id: number | null;
  category_id: number | null;
  episode_group_id: string | null;
  duration_seconds: number | null;
};

export type PagedItems = {
  items: Item[];
  total: number;
};

export async function getItemsByTagSlugPage(
  tagSlug: string,
  limit = 24,
  offset = 0,
): Promise<PagedItems> {
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 24;
  const safeOffset = Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0;

  const { data: tag, error: tagError } = await supabase
    .from("tags")
    .select("id")
    .eq("slug", tagSlug)
    .maybeSingle();

  if (tagError || !tag) return { items: [], total: 0 };

  const query = supabase
    .from("content_items")
    .select(`${ITEM_COLUMNS}, content_tags!inner(tag_id)`, { count: "exact" })
    .eq("status", "approved")
    .is("merged_into_id", null)
    .eq("content_tags.tag_id", tag.id)
    .order("published_at", { ascending: false })
    .order("id", { ascending: false });

  const { data, error, count } = await query.range(safeOffset, safeOffset + safeLimit - 1);

  // Zakres poza koncem zbioru (416) nie zwraca count — dolicz osobno, zeby pager mogl wrocic na ostatnia strone.
  if (error?.code === "PGRST103") {
    const { count: total, error: countError } = await supabase
      .from("content_items")
      .select("id, content_tags!inner(tag_id)", { count: "exact", head: true })
      .eq("status", "approved")
      .is("merged_into_id", null)
      .eq("content_tags.tag_id", tag.id);
    if (countError) {
      console.error("Blad pobierania tagu:", countError);
      return { items: [], total: 0 };
    }
    return { items: [], total: total ?? 0 };
  }

  if (error || !data) {
    console.error("Blad pobierania tagu:", error);
    return { items: [], total: 0 };
  }

  const rows: ContentItemRow[] = data.map((row) => {
    const { content_tags: _embedded, ...item } = row as ContentItemRow & { content_tags?: unknown };
    return item;
  });

  return {
    items: await hydrateItems(rows),
    total: count ?? 0,
  };
}

export async function getItemsByTagSlug(tagSlug: string, limit = 10, offset = 0): Promise<Item[]> {
  const { items } = await getItemsByTagSlugPage(tagSlug, limit, offset);
  return items;
}

// =================================================================
// QUERY: strona kategorii z filtrem osoby, tagu i tytułu (dokładny count)
// =================================================================
export type CategoryFacetPerson = { slug: string; name: string };
export type CategoryFacetTag = { name: string; slug: string; tag_type: string };

export type CategoryBrowse = {
  items: Item[];
  total: number;
  people: CategoryFacetPerson[];
  tags: CategoryFacetTag[];
};

export type CategoryBrowseQuery = {
  limit?: number;
  offset?: number;
  personSlug?: string;
  tagSlug?: string;
  search?: string;
};

const CATEGORY_BROWSE_MAX = 100;
const FACET_PAGE = 1000;

function escapeIlike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

function sortByPolishName<T extends { name: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.name.localeCompare(b.name, "pl"));
}

type ItemFilter = {
  categoryId: number;
  personTagId: number | null;
  contentTagId: number | null;
  search: string;
};

function browseSelect(filter: ItemFilter, columns: string): string {
  if (filter.personTagId && filter.contentTagId) {
    return `${columns}, person_link:content_tags!inner(tag_id), topic_link:content_tags!inner(tag_id)`;
  }
  if (filter.personTagId || filter.contentTagId) {
    return `${columns}, content_tags!inner(tag_id)`;
  }
  return columns;
}

type ItemQuery = {
  eq: (column: string, value: unknown) => ItemQuery;
  is: (column: string, value: null) => ItemQuery;
  ilike: (column: string, value: string) => ItemQuery;
};

// Aliasy zagnieżdżeń (person_link) nie są kolumnami tabeli — filtr idzie po nich jako po relacji.
function applyItemFilter<Q>(query: Q, filter: ItemFilter): Q {
  let next = query as unknown as ItemQuery;
  next = next
    .eq("status", "approved")
    .eq("category_id", filter.categoryId)
    .is("merged_into_id", null);
  if (filter.personTagId && filter.contentTagId) {
    next = next.eq("person_link.tag_id", filter.personTagId).eq("topic_link.tag_id", filter.contentTagId);
  } else if (filter.personTagId || filter.contentTagId) {
    next = next.eq("content_tags.tag_id", filter.personTagId ?? filter.contentTagId);
  }
  if (filter.search) next = next.ilike("title", `%${escapeIlike(filter.search)}%`);
  return next as unknown as Q;
}

async function listPeopleInCategory(categoryId: number): Promise<CategoryFacetPerson[]> {
  const map = new Map<string, string>();
  for (let offset = 0; ; offset += FACET_PAGE) {
    const { data, error } = await supabase
      .from("tags")
      .select("slug, name, content_tags!inner(content_items!inner(id))")
      .eq("tag_type", "person")
      .eq("content_tags.content_items.status", "approved")
      .eq("content_tags.content_items.category_id", categoryId)
      .is("content_tags.content_items.merged_into_id", null)
      .order("slug", { ascending: true })
      .range(offset, offset + FACET_PAGE - 1);
    if (error) {
      console.error("Blad pobierania standuperow kategorii:", error);
      break;
    }
    const rows = (data ?? []) as { slug: string; name: string }[];
    for (const row of rows) {
      if (row.slug && row.name) map.set(row.slug, row.name);
    }
    if (rows.length < FACET_PAGE) break;
  }
  return sortByPolishName([...map.entries()].map(([slug, name]) => ({ slug, name })));
}

async function listTagsInCategory(categoryId: number): Promise<CategoryFacetTag[]> {
  const map = new Map<string, CategoryFacetTag>();
  for (let offset = 0; ; offset += FACET_PAGE) {
    const { data, error } = await supabase
      .from("tags")
      .select("slug, name, tag_type, content_tags!inner(content_items!inner(id))")
      .neq("tag_type", "person")
      .eq("content_tags.content_items.status", "approved")
      .eq("content_tags.content_items.category_id", categoryId)
      .is("content_tags.content_items.merged_into_id", null)
      .order("slug", { ascending: true })
      .range(offset, offset + FACET_PAGE - 1);
    if (error) {
      console.error("Blad pobierania tagow kategorii:", error);
      break;
    }
    const rows = (data ?? []) as CategoryFacetTag[];
    for (const row of rows) {
      if (row.slug && row.name && row.tag_type) map.set(row.slug, row);
    }
    if (rows.length < FACET_PAGE) break;
  }
  return sortByPolishName([...map.values()]);
}

async function findTagId(slug: string, person: boolean): Promise<number | null> {
  let query = supabase.from("tags").select("id").eq("slug", slug);
  query = person ? query.eq("tag_type", "person") : query.neq("tag_type", "person");
  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return data.id;
}

function stripBrowseEmbeds(row: ContentItemRow & {
  content_tags?: unknown;
  person_link?: unknown;
  topic_link?: unknown;
}): ContentItemRow {
  const { content_tags: _contentTags, person_link: _personLink, topic_link: _topicLink, ...item } = row;
  return item;
}

async function countFilteredItems(filter: ItemFilter): Promise<number> {
  const { count, error } = await applyItemFilter(
    supabase.from("content_items").select(browseSelect(filter, "id"), { count: "exact", head: true }),
    filter,
  );
  if (error) {
    console.error("Blad liczenia kategorii:", error);
    return 0;
  }
  return count ?? 0;
}

async function pageFilteredItems(filter: ItemFilter, limit: number, offset: number): Promise<PagedItems> {
  const { data, error, count } = await applyItemFilter(
    supabase.from("content_items").select(browseSelect(filter, ITEM_COLUMNS), { count: "exact" }),
    filter,
  )
    .order("published_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error?.code === "PGRST103") {
    return { items: [], total: await countFilteredItems(filter) };
  }
  if (error || !data) {
    console.error("Blad pobierania kategorii:", error);
    return { items: [], total: 0 };
  }

  const rows = (data as unknown as Array<ContentItemRow & {
    content_tags?: unknown;
    person_link?: unknown;
    topic_link?: unknown;
  }>).map(stripBrowseEmbeds);

  return {
    items: await hydrateItems(rows),
    total: count ?? 0,
  };
}

export async function getCategoryBrowse(slug: string, query: CategoryBrowseQuery = {}): Promise<CategoryBrowse> {
  const empty: CategoryBrowse = { items: [], total: 0, people: [], tags: [] };
  const limit = Number.isFinite(query.limit) ? Math.min(CATEGORY_BROWSE_MAX, Math.max(1, Math.floor(query.limit!))) : 24;
  const offset = Number.isFinite(query.offset) ? Math.max(0, Math.floor(query.offset!)) : 0;
  const personSlug = query.personSlug?.trim() ?? "";
  const tagSlug = query.tagSlug?.trim() ?? "";
  const search = query.search?.trim() ?? "";

  const { data: cat, error: catError } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (catError || !cat) return empty;

  const [people, tags, personTagId, contentTagId] = await Promise.all([
    listPeopleInCategory(cat.id),
    listTagsInCategory(cat.id),
    personSlug ? findTagId(personSlug, true) : Promise.resolve(null),
    tagSlug ? findTagId(tagSlug, false) : Promise.resolve(null),
  ]);

  if ((personSlug && personTagId == null) || (tagSlug && contentTagId == null)) {
    return { items: [], total: 0, people, tags };
  }

  const page = await pageFilteredItems(
    { categoryId: cat.id, personTagId, contentTagId, search },
    limit,
    offset,
  );
  return { items: page.items, total: page.total, people, tags };
}

// =================================================================
// QUERY: formaty gdzie dana osoba jest domyslnym standuperem
// =================================================================
export async function getDefaultShowsForPerson(personId: number): Promise<{
  show: Show;
  totalCount: number;
  latestDate: string | null;
  latestThumbnail: string | null;
}[]> {
  const { data: defaults } = await supabase
    .from("show_default_people")
    .select("show_id")
    .eq("person_id", personId);

  const showIds = (defaults || []).map((d: { show_id: number }) => d.show_id);
  if (showIds.length === 0) return [];

  const { data: shows } = await supabase
    .from("shows")
    .select("id, name, slug, description, photo_url, category_id, youtube_channel_url, spotify_show_url, apple_podcasts_url, website_url")
    .in("id", showIds)
    .eq("is_active", true);

  if (!shows?.length) return [];

  const { data: items } = await supabase
    .from("content_items")
    .select("show_id, published_at, thumbnail_url")
    .in("show_id", showIds)
    .eq("status", "approved")
    .is("merged_into_id", null);

  const countMap = new Map<number, number>();
  const latestMap = new Map<number, string>();
  const thumbnailMap = new Map<number, string>();
  for (const item of items || []) {
    countMap.set(item.show_id, (countMap.get(item.show_id) || 0) + 1);
    const cur = latestMap.get(item.show_id);
    if (!cur || item.published_at > cur) {
      latestMap.set(item.show_id, item.published_at);
      if (item.thumbnail_url) thumbnailMap.set(item.show_id, item.thumbnail_url);
    }
  }

  return shows.map((s: { id: number; name: string; slug: string; description: string | null; photo_url: string | null; category_id: number | null; youtube_channel_url: string | null; spotify_show_url: string | null; apple_podcasts_url: string | null; website_url: string | null }) => ({
    show: { ...s, category_name: null, category_slug: null },
    totalCount: countMap.get(s.id) || 0,
    latestDate: latestMap.get(s.id) || null,
    latestThumbnail: thumbnailMap.get(s.id) || null,
  }));
}

// =================================================================
// QUERY: wyszukiwanie globalne
// =================================================================
export async function searchAll(q: string): Promise<{
  people: Person[];
  items: Item[];
  shows: Show[];
}> {
  const term = `%${q.trim()}%`;

  const [peopleRes, itemsRes, showsRes] = await Promise.all([
    supabase
      .from("people")
      .select("id, name, slug, bio, photo_url, role")
      .ilike("name", term)
      .eq("is_active", true)
      .limit(10),
    supabase
      .from("content_items")
      .select("id, title, url, thumbnail_url, published_at, source_id, show_id, category_id, episode_group_id, duration_seconds")
      .eq("status", "approved")
      .is("merged_into_id", null)
      .ilike("title", term)
      .order("published_at", { ascending: false })
      .limit(SEARCH_CANDIDATE_LIMIT),
    supabase
      .from("shows")
      .select("id, name, slug, description, photo_url, category_id, youtube_channel_url, spotify_show_url, apple_podcasts_url, website_url")
      .ilike("name", term)
      .eq("is_active", true)
      .limit(10),
  ]);

  const items = await hydrateItems(
    dedupeSearchItems(itemsRes.data || []).slice(0, SEARCH_RESULT_LIMIT),
  );
  const shows = (showsRes.data || []).map((s: { id: number; name: string; slug: string; description: string | null; photo_url: string | null; category_id: number | null; youtube_channel_url: string | null; spotify_show_url: string | null; apple_podcasts_url: string | null; website_url: string | null }) => ({
    ...s,
    category_name: null,
    category_slug: null,
  }));

  return {
    people: (peopleRes.data || []) as Person[],
    items,
    shows,
  };
}

// =================================================================
// QUERY: najnowsze odcinki z kazdego show (do sekcji Formaty)
// =================================================================
export async function getLatestPerShow(limit = 3): Promise<{ show: Show; items: Item[]; totalCount: number; latestDate: string | null }[]> {
  const shows = await getAllShows();
  const results: { show: Show; items: Item[]; totalCount: number; latestDate: string | null }[] = [];

  for (const show of shows) {
    const allItems = await getItemsByShowSlug(show.slug, 999);
    if (allItems.length > 0) {
      results.push({
        show,
        items: allItems.slice(0, limit),
        totalCount: allItems.length,
        latestDate: allItems[0]?.published_at ?? null,
      });
    }
  }

  results.sort((a, b) => {
    if (!a.latestDate) return 1;
    if (!b.latestDate) return -1;
    return new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime();
  });

  return results;
}
