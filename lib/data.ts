import { cache } from "react";
import {
  eventFacets,
  eventPeople,
  FAVORITE_UPCOMING_SCAN_LIMIT,
  favoritePersonSlugs,
  peopleFromEventRow,
  PROFILE_TOUR_LIMIT,
  hasActiveTrasyFilters,
  LISTED_EVENT_STATUSES,
  mergeTourEvents,
  occurrenceKey,
  pageMergedEvents,
  pickFavoriteUpcomingEvents,
  toTourEvent,
  upcomingBounds,
  type EventFacetSource,
  type EventFacets,
  type EventRow,
  type FavoriteUpcomingEvent,
  type TourEvent,
  type TrasyFilters,
} from "@/lib/events";
import {
  HOME_NOWE_SHORTS_CATEGORY_ID,
  HOME_NOWE_SHORTS_URL_MATCH,
} from "@/lib/home-nowe";
import { SEARCH_CANDIDATE_LIMIT, SEARCH_RESULT_LIMIT, dedupeSearchItems } from "@/lib/search";
import { supabase } from "@/lib/supabase";
import { HOME_FEATURED_LIMIT } from "@/lib/featured";
import { PUBLIC_LISTING_PAGE_SIZE } from "@/lib/category-browse";
import { mergeShowEpisodes, pageShowEpisodes } from "@/lib/show-episodes";
import { paidExternalUrl } from "@/lib/youtube";

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
  is_paid: boolean;
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
  is_paid: boolean;
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
      is_paid: item.is_paid === true,
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
    .select("id, title, url, thumbnail_url, published_at, source_id, show_id, category_id, episode_group_id, duration_seconds, is_paid")
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
    .select("id, title, url, thumbnail_url, published_at, source_id, show_id, category_id, episode_group_id, duration_seconds, is_paid")
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

  const cols = "id, title, url, thumbnail_url, published_at, source_id, show_id, category_id, episode_group_id, duration_seconds, is_paid";

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
    .select("id, title, url, thumbnail_url, published_at, source_id, show_id, category_id, episode_group_id, duration_seconds, is_paid")
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

export type ShowLatestEpisode = {
  id: number;
  name: string;
  slug: string;
  latestDate: string | null;
};

type ShowLatestEpisodeRow = {
  id: number;
  name: string;
  slug: string;
  content_items: { published_at: string | null }[] | { published_at: string | null } | null;
};

function firstPublishedAt(items: ShowLatestEpisodeRow["content_items"]): string | null {
  const list = Array.isArray(items) ? items : items ? [items] : [];
  const published = list[0]?.published_at;
  return published || null;
}

// Aktywne formaty z datą ostatniego zatwierdzonego odcinka (bez shortów).
// Nazwy zostają A–Z; stopka i menu sortują po latestDate w footerShows.
export const getShowsWithLatestEpisode = cache(async (): Promise<ShowLatestEpisode[]> => {
  const { data: shortsCat } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", "shorts")
    .maybeSingle();

  let query = supabase
    .from("shows")
    .select("id, name, slug, content_items(published_at)")
    .eq("is_active", true)
    .eq("content_items.status", "approved")
    .neq("content_items.content_type", "short")
    .is("content_items.merged_into_id", null)
    .order("name");

  if (shortsCat?.id != null) {
    query = query.neq("content_items.category_id", shortsCat.id);
  }

  const { data, error } = await query
    .order("published_at", {
      referencedTable: "content_items",
      ascending: false,
      nullsFirst: false,
    })
    .limit(1, { referencedTable: "content_items" });

  if (error) {
    console.error("Blad dat formatow:", error);
    return [];
  }

  return ((data ?? []) as ShowLatestEpisodeRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    latestDate: firstPublishedAt(row.content_items),
  }));
});

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
type NoweQuery = {
  neq(column: "category_id", value: number): NoweQuery;
  not(column: "url", operator: "ilike", value: string): NoweQuery;
};

function excludeShortsFromNowe<Q>(query: Q, shortsCatId: number | null): Q {
  // categories.id = 4 zawsze wykluczone, nawet gdy lookup sluga sie nie uda.
  const builder = query as unknown as NoweQuery;
  let next = builder.neq("category_id", HOME_NOWE_SHORTS_CATEGORY_ID);
  if (shortsCatId != null && shortsCatId !== HOME_NOWE_SHORTS_CATEGORY_ID) {
    next = next.neq("category_id", shortsCatId);
  }
  // Shorty YouTube przypisane do Roast (albo innej kategorii) nadal maja URL /shorts/.
  return next.not("url", "ilike", `%${HOME_NOWE_SHORTS_URL_MATCH}%`) as unknown as Q;
}

export async function getRecentItems(days = 7, minItems = 3, maxDays = 30): Promise<Item[]> {
  // Lookup sluga lapie przemianowany wiersz Shorts; id 4 i tak jest stosowane.
  const { data: shortsCat } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", "shorts")
    .maybeSingle();

  const shortsCatId = shortsCat?.id ?? null;
  let currentDays = days;

  while (currentDays <= maxDays) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - currentDays);

    const query = excludeShortsFromNowe(
      supabase
        .from("content_items")
        .select("id, title, url, thumbnail_url, published_at, source_id, show_id, category_id, episode_group_id, duration_seconds, is_paid")
        .eq("status", "approved")
        .is("merged_into_id", null)
        .gte("published_at", cutoff.toISOString())
        .order("published_at", { ascending: false })
        .limit(20),
      shortsCatId,
    );

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
  const fallbackQuery = excludeShortsFromNowe(
    supabase
      .from("content_items")
      .select("id, title, url, thumbnail_url, published_at, source_id, show_id, category_id, episode_group_id, duration_seconds, is_paid")
      .eq("status", "approved")
      .is("merged_into_id", null)
      .order("published_at", { ascending: false })
      .limit(20),
    shortsCatId,
  );

  const { data } = await fallbackQuery;
  return hydrateItems(data || []);
}

// =================================================================
// QUERY: polecane (is_featured = true)
// =================================================================
export async function getFeaturedItems(limit = HOME_FEATURED_LIMIT): Promise<Item[]> {
  const capped = Math.min(
    HOME_FEATURED_LIMIT,
    Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : HOME_FEATURED_LIMIT,
  );
  const { data, error } = await supabase
    .from("content_items")
    .select("id, title, url, thumbnail_url, published_at, source_id, show_id, category_id, episode_group_id, duration_seconds, is_paid, featured_at")
    .eq("status", "approved")
    .eq("is_featured", true)
    .is("merged_into_id", null)
    .order("featured_at", { ascending: false, nullsFirst: false })
    .order("published_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(capped);

  if (error || !data) return [];
  const rows = data.map(({ featured_at: _featuredAt, ...item }) => item);
  return hydrateItems(rows);
}

// =================================================================
// QUERY: wpisy z danym tagiem (paginacja po published_at desc)
// =================================================================
const ITEM_COLUMNS =
  "id, title, url, thumbnail_url, published_at, source_id, show_id, category_id, episode_group_id, duration_seconds, is_paid";

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
  is_paid: boolean;
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
// QUERY: strona kategorii (published_at desc) z dokładnym count
// =================================================================
export async function getItemsByCategorySlugPage(
  slug: string,
  limit = PUBLIC_LISTING_PAGE_SIZE,
  offset = 0,
): Promise<PagedItems> {
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : PUBLIC_LISTING_PAGE_SIZE;
  const safeOffset = Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0;

  const { data: cat, error: catError } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (catError || !cat) return { items: [], total: 0 };

  const { data, error, count } = await supabase
    .from("content_items")
    .select(ITEM_COLUMNS, { count: "exact" })
    .eq("status", "approved")
    .eq("category_id", cat.id)
    .is("merged_into_id", null)
    .order("published_at", { ascending: false })
    .order("id", { ascending: false })
    .range(safeOffset, safeOffset + safeLimit - 1);

  // Zakres poza końcem zbioru (416) nie zwraca count — dolicz osobno, żeby pager mógł wrócić na ostatnią stronę.
  if (error?.code === "PGRST103") {
    const { count: total, error: countError } = await supabase
      .from("content_items")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved")
      .eq("category_id", cat.id)
      .is("merged_into_id", null);
    if (countError) {
      console.error("Blad pobierania kategorii:", countError);
      return { items: [], total: 0 };
    }
    return { items: [], total: total ?? 0 };
  }

  if (error || !data) {
    console.error("Blad pobierania kategorii:", error);
    return { items: [], total: 0 };
  }

  return {
    items: await hydrateItems(data as ContentItemRow[]),
    total: count ?? 0,
  };
}

// =================================================================
// QUERY: strona odcinków formatu (DESC), total po zmergowaniu show_id i źródeł
// =================================================================
const EPISODE_STAMP_PAGE = 1000;
const EPISODE_STAMP_CAP = 100;

type EpisodeStampRow = { id: number; published_at: string | null };

function episodeStampQuery(shortsCatId: number | null) {
  let query = supabase
    .from("content_items")
    .select("id, published_at")
    .eq("status", "approved")
    .neq("content_type", "short")
    .is("merged_into_id", null)
    .order("id", { ascending: true });
  if (shortsCatId != null) query = query.neq("category_id", shortsCatId);
  return query;
}

async function scanEpisodeStamps(
  load: (from: number, to: number) => PromiseLike<{
    data: unknown;
    error: { message?: string } | null;
  }>,
): Promise<EpisodeStampRow[] | null> {
  const rows: EpisodeStampRow[] = [];
  for (let page = 0; page < EPISODE_STAMP_CAP; page += 1) {
    const from = page * EPISODE_STAMP_PAGE;
    const { data, error } = await load(from, from + EPISODE_STAMP_PAGE - 1);
    if (error) {
      console.error("Blad pobierania odcinkow:", error);
      return null;
    }
    const batch = (data ?? []) as EpisodeStampRow[];
    rows.push(...batch);
    if (batch.length < EPISODE_STAMP_PAGE) return rows;
  }
  console.error("Blad pobierania odcinkow: przekroczono limit skanu");
  return null;
}

export async function getShowEpisodesPage(
  slug: string,
  limit = PUBLIC_LISTING_PAGE_SIZE,
  offset = 0,
): Promise<PagedItems> {
  const { data: show, error: showError } = await supabase
    .from("shows")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (showError || !show) return { items: [], total: 0 };

  const [sourcesRes, shortsCatRes] = await Promise.all([
    supabase.from("sources").select("id").eq("show_id", show.id),
    supabase.from("categories").select("id").eq("slug", "shorts").maybeSingle(),
  ]);
  if (sourcesRes.error) {
    console.error("Blad pobierania odcinkow:", sourcesRes.error);
    return { items: [], total: 0 };
  }

  const sourceIds = (sourcesRes.data || []).map((source: { id: number }) => source.id);
  const shortsCatId = shortsCatRes.data?.id ?? null;

  const [byShow, bySource] = await Promise.all([
    scanEpisodeStamps((from, to) => episodeStampQuery(shortsCatId).eq("show_id", show.id).range(from, to)),
    sourceIds.length === 0
      ? Promise.resolve([])
      : scanEpisodeStamps((from, to) => episodeStampQuery(shortsCatId).in("source_id", sourceIds).range(from, to)),
  ]);
  if (!byShow || !bySource) return { items: [], total: 0 };

  const merged = mergeShowEpisodes(byShow, bySource);
  const window = pageShowEpisodes(merged, offset, limit);
  if (window.episodes.length === 0) return { items: [], total: window.total };

  const ids = window.episodes.map((episode) => episode.id);
  const { data, error } = await supabase.from("content_items").select(ITEM_COLUMNS).in("id", ids);
  if (error || !data) {
    console.error("Blad pobierania odcinkow:", error);
    return { items: [], total: window.total };
  }

  const byId = new Map((data as ContentItemRow[]).map((row) => [row.id, row]));
  const ordered = ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });

  return {
    items: await hydrateItems(ordered),
    total: window.total,
  };
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
  categoryId: number | null;
  tagIds: number[];
  search: string;
};

const LINK_ALIASES = ["person_link", "topic_link", "extra_link"] as const;

/** One row per tag id. The base tag (specjale) and the optional person/topic filters share this list. */
function browseTagIds(baseId: number | null, extraIds: Array<number | null>): number[] {
  const ids: number[] = [];
  const push = (id: number | null) => {
    if (id == null || ids.includes(id)) return;
    ids.push(id);
  };
  push(baseId);
  for (const id of extraIds) push(id);
  return ids.slice(0, LINK_ALIASES.length);
}

function browseSelect(filter: ItemFilter, columns: string): string {
  if (filter.tagIds.length === 0) return columns;
  if (filter.tagIds.length === 1) return `${columns}, content_tags!inner(tag_id)`;
  const embeds = filter.tagIds.map((_, index) => `${LINK_ALIASES[index]}:content_tags!inner(tag_id)`);
  return `${columns}, ${embeds.join(", ")}`;
}

type ItemQuery = {
  eq: (column: string, value: unknown) => ItemQuery;
  is: (column: string, value: null) => ItemQuery;
  ilike: (column: string, value: string) => ItemQuery;
};

// Aliasy zagnieżdżeń (person_link) nie są kolumnami tabeli — filtr idzie po nich jako po relacji.
function applyItemFilter<Q>(query: Q, filter: ItemFilter): Q {
  let next = query as unknown as ItemQuery;
  next = next.eq("status", "approved");
  if (filter.categoryId != null) next = next.eq("category_id", filter.categoryId);
  next = next.is("merged_into_id", null);
  if (filter.tagIds.length === 1) {
    next = next.eq("content_tags.tag_id", filter.tagIds[0]);
  } else {
    filter.tagIds.forEach((id, index) => {
      next = next.eq(`${LINK_ALIASES[index]}.tag_id`, id);
    });
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
  extra_link?: unknown;
}): ContentItemRow {
  const {
    content_tags: _contentTags,
    person_link: _personLink,
    topic_link: _topicLink,
    extra_link: _extraLink,
    ...item
  } = row;
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
    extra_link?: unknown;
  }>).map(stripBrowseEmbeds);

  return {
    items: await hydrateItems(rows),
    total: count ?? 0,
  };
}

function normalizeBrowseQuery(query: CategoryBrowseQuery) {
  const limit = Number.isFinite(query.limit)
    ? Math.min(CATEGORY_BROWSE_MAX, Math.max(1, Math.floor(query.limit!)))
    : PUBLIC_LISTING_PAGE_SIZE;
  const offset = Number.isFinite(query.offset) ? Math.max(0, Math.floor(query.offset!)) : 0;
  return {
    limit,
    offset,
    personSlug: query.personSlug?.trim() ?? "",
    tagSlug: query.tagSlug?.trim() ?? "",
    search: query.search?.trim() ?? "",
  };
}

export async function getCategoryBrowse(slug: string, query: CategoryBrowseQuery = {}): Promise<CategoryBrowse> {
  const empty: CategoryBrowse = { items: [], total: 0, people: [], tags: [] };
  const { limit, offset, personSlug, tagSlug, search } = normalizeBrowseQuery(query);

  const [catRes, personTagId, contentTagId] = await Promise.all([
    supabase.from("categories").select("id").eq("slug", slug).maybeSingle(),
    personSlug ? findTagId(personSlug, true) : Promise.resolve(null),
    tagSlug ? findTagId(tagSlug, false) : Promise.resolve(null),
  ]);
  const cat = catRes.data;
  if (catRes.error || !cat) return empty;

  const tagIds = browseTagIds(null, [personTagId, contentTagId]);
  const invalid = (personSlug && personTagId == null) || (tagSlug && contentTagId == null);
  const [people, tags, page] = await Promise.all([
    listPeopleInCategory(cat.id),
    listTagsInCategory(cat.id),
    invalid
      ? Promise.resolve({ items: [], total: 0 })
      : pageFilteredItems({ categoryId: cat.id, tagIds, search }, limit, offset),
  ]);
  return { items: page.items, total: page.total, people, tags };
}

const FACET_ID_PAGE = 1000;
const FACET_LINK_CHUNK = 80;
const FACET_LINK_LIMIT = 1000;

type FacetTagRow = { slug: string; name: string; tag_type: string };

function asFacetTag(value: unknown): FacetTagRow | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") return null;
  const tag = row as Partial<FacetTagRow>;
  if (!tag.slug || !tag.name || !tag.tag_type) return null;
  return { slug: tag.slug, name: tag.name, tag_type: tag.tag_type };
}

async function listItemIdsForTag(tagId: number): Promise<number[] | null> {
  const ids: number[] = [];
  for (let offset = 0; ; offset += FACET_ID_PAGE) {
    const { data, error } = await supabase
      .from("content_tags")
      .select("content_item_id, content_items!inner(status, merged_into_id)")
      .eq("tag_id", tagId)
      .eq("content_items.status", "approved")
      .is("content_items.merged_into_id", null)
      .order("content_item_id", { ascending: true })
      .range(offset, offset + FACET_ID_PAGE - 1);
    if (error) {
      console.error("Blad pobierania facetow tagu:", error);
      return null;
    }
    const rows = (data ?? []) as { content_item_id: number }[];
    for (const row of rows) ids.push(row.content_item_id);
    if (rows.length < FACET_ID_PAGE) break;
  }
  return ids;
}

async function readTagLinks(itemIds: number[]): Promise<FacetTagRow[] | null> {
  if (itemIds.length === 0) return [];
  const { data, error } = await supabase
    .from("content_tags")
    .select("tags!inner(slug, name, tag_type)")
    .in("content_item_id", itemIds)
    .limit(FACET_LINK_LIMIT);
  if (error) {
    console.error("Blad pobierania facetow tagu:", error);
    return null;
  }
  const rows = data ?? [];
  if (rows.length >= FACET_LINK_LIMIT && itemIds.length > 1) {
    const mid = Math.ceil(itemIds.length / 2);
    const [left, right] = await Promise.all([
      readTagLinks(itemIds.slice(0, mid)),
      readTagLinks(itemIds.slice(mid)),
    ]);
    if (!left || !right) return null;
    return [...left, ...right];
  }
  const tags: FacetTagRow[] = [];
  for (const row of rows) {
    const tag = asFacetTag((row as { tags?: unknown }).tags);
    if (tag) tags.push(tag);
  }
  return tags;
}

async function listFacetsForTag(tagId: number): Promise<{ people: CategoryFacetPerson[]; tags: CategoryFacetTag[] } | null> {
  const itemIds = await listItemIdsForTag(tagId);
  if (!itemIds) return null;
  const people = new Map<string, string>();
  const tags = new Map<string, CategoryFacetTag>();
  const chunks: number[][] = [];
  for (let offset = 0; offset < itemIds.length; offset += FACET_LINK_CHUNK) {
    chunks.push(itemIds.slice(offset, offset + FACET_LINK_CHUNK));
  }
  const batches = await Promise.all(chunks.map((chunk) => readTagLinks(chunk)));
  for (const links of batches) {
    if (!links) return null;
    for (const tag of links) {
      if (tag.tag_type === "person") {
        people.set(tag.slug, tag.name);
        continue;
      }
      if (!tags.has(tag.slug)) tags.set(tag.slug, tag);
    }
  }
  return {
    people: sortByPolishName([...people.entries()].map(([slug, name]) => ({ slug, name }))),
    tags: sortByPolishName([...tags.values()]),
  };
}

/**
 * Tag listing (specjale) with the same person, topic and title filters as a category.
 * The defining tag is not returned as a chip — the whole page already is that tag.
 */
export async function getTagBrowse(tagSlug: string, query: CategoryBrowseQuery = {}): Promise<CategoryBrowse> {
  const empty: CategoryBrowse = { items: [], total: 0, people: [], tags: [] };
  const { limit, offset, personSlug, tagSlug: extraSlug, search } = normalizeBrowseQuery(query);
  const extraIsBase = extraSlug === tagSlug;

  const [baseRes, personTagId, contentTagId] = await Promise.all([
    supabase.from("tags").select("id, slug").eq("slug", tagSlug).maybeSingle(),
    personSlug ? findTagId(personSlug, true) : Promise.resolve(null),
    extraSlug && !extraIsBase ? findTagId(extraSlug, false) : Promise.resolve(null),
  ]);
  const base = baseRes.data;
  if (baseRes.error || !base) return empty;

  const invalid = (personSlug && personTagId == null) || (extraSlug && !extraIsBase && contentTagId == null);
  const [facets, page] = await Promise.all([
    listFacetsForTag(base.id),
    invalid
      ? Promise.resolve({ items: [] as Item[], total: 0 })
      : pageFilteredItems(
        {
          categoryId: null,
          tagIds: browseTagIds(base.id, [personTagId, extraIsBase ? null : contentTagId]),
          search,
        },
        limit,
        offset,
      ),
  ]);
  if (!facets) return empty;

  const tags = facets.tags.filter((tag) => tag.slug !== base.slug);
  return { items: page.items, total: page.total, people: facets.people, tags };
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
      .select("id, title, url, thumbnail_url, published_at, source_id, show_id, category_id, episode_group_id, duration_seconds, is_paid")
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

// `people!events_person_id_fkey` is the legacy headliner. `event_people` is the
// full bill. PostgREST sees both as relationships to `people`, so an
// unqualified `people` embed is ambiguous.
const UPCOMING_EVENT_COLUMNS =
  "id, person_id, title, starts_at, city, venue, venue_address, price_from, currency, status, ticket_url, ticket_provider, external_id, image_url, people!events_person_id_fkey!inner(name, slug, photo_url), event_people(person_id, people(name, slug, photo_url)), event_ticket_links(ticket_url, ticket_provider, external_id, is_primary)";

const BILLED_EVENT_STAMPS =
  "id, starts_at, event_people!inner(person_id)";

const FACET_SCAN_CAP = 50;

export type TrasyListing = {
  events: TourEvent[];
  total: number;
  catalogTotal: number;
  facets: EventFacets;
  ok: boolean;
};

const EMPTY_FACETS: EventFacets = { people: [], cities: [] };

type UpcomingFilterQuery = {
  gte: (column: string, value: string) => UpcomingFilterQuery;
  lt: (column: string, value: string) => UpcomingFilterQuery;
  in: (column: string, values: readonly string[]) => UpcomingFilterQuery;
  eq: (column: string, value: string) => UpcomingFilterQuery;
};

function applyUpcomingFilters<Q>(query: Q, filters: TrasyFilters, now: Date): Q {
  const bounds = upcomingBounds(filters, now);
  let next = query as unknown as UpcomingFilterQuery;
  next = next.gte("starts_at", bounds.start.toISOString()).in("status", bounds.statuses);
  if (bounds.end) next = next.lt("starts_at", bounds.end.toISOString());
  if (filters.miasto) next = next.eq("city", filters.miasto);
  if (filters.osoba) next = next.eq("people.slug", filters.osoba);
  return next as unknown as Q;
}

type FacetRow = {
  person_id?: number | null;
  city: string | null;
  people: EventRow["people"];
  event_people?: EventRow["event_people"];
};

function rowToFacetSource(row: FacetRow): EventFacetSource | null {
  const roster = peopleFromEventRow(row).filter((person) => person.slug && person.name);
  const person = roster[0];
  if (!person) return null;
  return {
    city: row.city?.trim() ?? "",
    person: { slug: person.slug, name: person.name },
    people: roster.map((billed) => ({ slug: billed.slug, name: billed.name })),
  };
}

type EventStamp = { id: number; starts_at: string };

function soonestById<T extends EventStamp>(rows: readonly T[], limit: number): T[] {
  const byId = new Map<number, T>();
  for (const row of rows) {
    if (typeof row.id !== "number" || byId.has(row.id)) continue;
    byId.set(row.id, row);
  }
  return [...byId.values()]
    .sort((a, b) => {
      const delta = new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
      return delta !== 0 ? delta : a.id - b.id;
    })
    .slice(0, Math.max(0, limit));
}

async function eventRowsByIds(ids: readonly number[]): Promise<EventRow[] | null> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("events").select(UPCOMING_EVENT_COLUMNS).in("id", ids);
  if (error || !data) {
    console.error("Błąd pobierania tras:", error);
    return null;
  }
  return data as unknown as EventRow[];
}

function rowsToTourEvents(rows: EventRow[]): TourEvent[] {
  return rows.flatMap((row) => {
    const event = toTourEvent(row);
    return event ? [event] : [];
  });
}

// Loads every row matching the SQL filters, then collapses joint bills.
// Paging happens after the merge so PAGE_SIZE counts shows, not person-rows,
// and a pair cannot be split across two pages.
async function scanUpcomingEvents(filters: TrasyFilters, now: Date): Promise<TourEvent[] | null> {
  const collected: TourEvent[] = [];
  for (let page = 0; page < FACET_SCAN_CAP; page += 1) {
    const offset = page * FACET_PAGE;
    const { data, error } = await applyUpcomingFilters(
      supabase.from("events").select(UPCOMING_EVENT_COLUMNS),
      filters,
      now,
    )
      .order("starts_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + FACET_PAGE - 1);
    if (error || !data) {
      console.error("Błąd pobierania tras:", error);
      return null;
    }
    const rows = data as unknown as EventRow[];
    collected.push(...rowsToTourEvents(rows));
    if (rows.length < FACET_PAGE) return mergeTourEvents(collected);
  }
  console.error("Błąd pobierania tras: za dużo terminów do filtrów");
  return null;
}

async function withCoPerformers(seeds: TourEvent[], now: Date): Promise<TourEvent[]> {
  if (seeds.length === 0) return [];
  const urls = new Set<string>();
  for (const event of seeds) {
    const raw = event.source_ticket_url?.trim() || event.ticket_url.trim();
    if (raw) urls.add(raw);
  }
  if (urls.size === 0) return mergeTourEvents(seeds);

  const { data, error } = await supabase
    .from("events")
    .select(UPCOMING_EVENT_COLUMNS)
    .in("ticket_url", [...urls])
    .gte("starts_at", now.toISOString())
    .in("status", [...LISTED_EVENT_STATUSES]);

  if (error || !data) {
    console.error("Błąd pobierania wspólnych występów:", error);
    return mergeTourEvents(seeds);
  }

  const related = rowsToTourEvents(data as unknown as EventRow[]);
  const keys = new Set(seeds.map((event) => occurrenceKey(event)));
  return mergeTourEvents([...seeds, ...related]).filter((event) => keys.has(occurrenceKey(event)));
}

async function listUpcomingFacets(now: Date): Promise<EventFacets | null> {
  const sources: EventFacetSource[] = [];
  for (let page = 0; page < FACET_SCAN_CAP; page += 1) {
    const offset = page * FACET_PAGE;
    const { data, error } = await applyUpcomingFilters(
      supabase
        .from("events")
        .select(
          "person_id, city, people!events_person_id_fkey!inner(name, slug), event_people(person_id, people(name, slug))",
        ),
      { osoba: "", miasto: "", od: "", doDnia: "", bilety: "" },
      now,
    )
      .order("id", { ascending: true })
      .range(offset, offset + FACET_PAGE - 1);
    if (error || !data) {
      console.error("Błąd pobierania tras:", error);
      return null;
    }
    const rows = data as unknown as FacetRow[];
    for (const row of rows) {
      const source = rowToFacetSource(row);
      if (source) sources.push(source);
    }
    if (rows.length < FACET_PAGE) return eventFacets(sources);
  }
  console.error("Błąd pobierania tras: za dużo terminów do filtrów");
  return null;
}

// Nadchodzące trasy (RLS: on_sale / sold_out, starts_at >= now()).
// City, date, and status stay in the query. The person filter runs after the
// merge: a joint bill must still list every comedian when only one of them
// was selected. Totals count merged shows (see pageMergedEvents).
export async function getTrasyListing(
  filters: TrasyFilters,
  page: number,
  pageSize: number,
  now = new Date(),
): Promise<TrasyListing> {
  const openFilters: TrasyFilters = { osoba: "", miasto: "", od: "", doDnia: "", bilety: "" };
  const sqlFilters: TrasyFilters = { ...filters, osoba: "" };
  const catalogSameScan = !hasActiveTrasyFilters(sqlFilters);

  const [scanned, facets, catalogScanned] = await Promise.all([
    scanUpcomingEvents(sqlFilters, now),
    listUpcomingFacets(now),
    hasActiveTrasyFilters(filters) && !catalogSameScan ? scanUpcomingEvents(openFilters, now) : Promise.resolve(undefined),
  ]);

  if (!scanned || !facets || (hasActiveTrasyFilters(filters) && !catalogSameScan && catalogScanned == null)) {
    return { events: [], total: 0, catalogTotal: 0, facets: EMPTY_FACETS, ok: false };
  }

  const merged = filters.osoba
    ? scanned.filter((event) => eventPeople(event).some((person) => person.slug === filters.osoba))
    : scanned;
  const listing = pageMergedEvents(merged, page, pageSize);
  const catalogTotal = catalogSameScan ? scanned.length : catalogScanned!.length;

  return {
    events: listing.events,
    total: listing.total,
    catalogTotal,
    facets,
    ok: true,
  };
}

function positiveIds(values: readonly unknown[]): number[] {
  const ids: number[] = [];
  const seen = new Set<number>();
  for (const value of values) {
    const id = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

function listedEventQuery(columns: string, now: Date, limit: number) {
  return supabase
    .from("events")
    .select(columns)
    .gte("starts_at", now.toISOString())
    .in("status", [...LISTED_EVENT_STATUSES])
    .order("starts_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit);
}

async function assembleListedRows(
  primaryRows: readonly EventRow[],
  billedStamps: readonly EventStamp[],
  limit: number,
): Promise<EventRow[]> {
  const wanted = soonestById([...primaryRows, ...billedStamps], limit);
  const have = new Map(primaryRows.map((row) => [row.id, row]));
  const missing = wanted.map((row) => row.id).filter((id) => !have.has(id));
  const extras = await eventRowsByIds(missing);
  const fullById = new Map(have);
  if (extras) {
    for (const row of extras) fullById.set(row.id, row);
  }
  return wanted.flatMap((row) => {
    const full = fullById.get(row.id);
    return full ? [full] : [];
  });
}

// Rows whose legacy person_id matches, plus rows where any event_people
// person matches. The second query only asks for ids so the !inner embed
// filter cannot strip co-headliners off the bill; full rows are loaded after.
async function listedRowsForPersonMatch(
  now: Date,
  limit: number,
  match: { personId: number } | { slugs: readonly string[] },
): Promise<EventRow[] | null> {
  const stampLimit = Math.max(0, limit);
  if ("personId" in match) {
    const personId = match.personId;
    const [primaryRes, billedRes] = await Promise.all([
      listedEventQuery(UPCOMING_EVENT_COLUMNS, now, stampLimit).eq("person_id", personId),
      listedEventQuery(BILLED_EVENT_STAMPS, now, stampLimit).eq("event_people.person_id", personId),
    ]);
    if (primaryRes.error && billedRes.error) {
      console.error("Błąd pobierania tras:", primaryRes.error);
      return null;
    }
    if (primaryRes.error) console.error("Błąd pobierania tras:", primaryRes.error);
    if (billedRes.error) console.error("Błąd pobierania tras:", billedRes.error);
    const primaryRows = (primaryRes.data ?? []) as unknown as EventRow[];
    const billedStamps = (billedRes.data ?? []) as unknown as EventStamp[];
    return assembleListedRows(primaryRows, billedStamps, stampLimit);
  }

  const slugs = [...match.slugs];
  const [primaryRes, peopleRes] = await Promise.all([
    listedEventQuery(UPCOMING_EVENT_COLUMNS, now, stampLimit).in("people.slug", slugs),
    supabase.from("people").select("id").in("slug", slugs),
  ]);
  if (peopleRes.error) console.error("Błąd pobierania tras:", peopleRes.error);
  const personIds = positiveIds((peopleRes.data ?? []).map((person) => person.id));
  const billedRes = personIds.length
    ? await listedEventQuery(BILLED_EVENT_STAMPS, now, stampLimit).in("event_people.person_id", personIds)
    : { data: [] as EventStamp[], error: null };
  if (primaryRes.error && billedRes.error) {
    console.error("Błąd pobierania tras:", primaryRes.error);
    return null;
  }
  if (primaryRes.error) console.error("Błąd pobierania tras:", primaryRes.error);
  if (billedRes.error) console.error("Błąd pobierania tras:", billedRes.error);
  const primaryRows = (primaryRes.data ?? []) as unknown as EventRow[];
  const billedStamps = (billedRes.data ?? []) as unknown as EventStamp[];
  return assembleListedRows(primaryRows, billedStamps, stampLimit);
}

// Najbliższe terminy osób z localStorage (parska_fav_persons).
// Anon client: RLS already hides cancelled, unknown, and past rows.
// A show matches when any billed person is favorited (event_people, or the
// legacy person_id when the junction is empty). pickFavoriteUpcomingEvents
// drops anyone the browser did not send. withCoPerformers still joins
// duplicate ticket rows so both names survive until those rows are collapsed.
export async function getUpcomingEventsForPersonSlugs(
  slugs: readonly string[],
  now = new Date(),
): Promise<FavoriteUpcomingEvent[]> {
  const allowed = favoritePersonSlugs(slugs);
  if (allowed.length === 0) return [];

  const rows = await listedRowsForPersonMatch(now, FAVORITE_UPCOMING_SCAN_LIMIT, { slugs: allowed });
  if (!rows) {
    console.error("Błąd pobierania tras ulubionych");
    return [];
  }

  const seeds = rowsToTourEvents(rows);
  const events = await withCoPerformers(seeds, now);

  return pickFavoriteUpcomingEvents(events, allowed, now).map((event) => {
    const roster = eventPeople(event);
    const lead = roster.find((person) => allowed.includes(person.slug)) ?? event.person;
    return {
      id: event.id,
      starts_at: event.starts_at,
      city: event.city,
      status: event.status,
      ticket_url: paidExternalUrl(event.ticket_url) ?? "",
      person: { name: lead.name, slug: lead.slug },
      people: roster.map((person) => ({ name: person.name, slug: person.slug })),
    };
  });
}

// Najbliższe terminy jednego standupera (profil). Dopasowanie po person_id
// albo event_people, z limitem zanim PostgREST zwróci pełne wiersze — nie
// korzysta z listingu /trasy, który dociąga facety całego katalogu.
export async function getUpcomingEventsForPerson(
  personId: number,
  now = new Date(),
): Promise<TourEvent[]> {
  if (!Number.isInteger(personId) || personId <= 0) return [];

  try {
    const rows = await listedRowsForPersonMatch(now, PROFILE_TOUR_LIMIT, { personId });
    if (!rows) {
      console.error("Błąd pobierania trasy profilu");
      return [];
    }
    return withCoPerformers(rowsToTourEvents(rows), now);
  } catch (error) {
    console.error("Błąd pobierania trasy profilu:", error);
    return [];
  }
}
