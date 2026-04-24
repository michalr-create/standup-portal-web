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
// QUERY: specjale (przez tag)
// =================================================================
export async function getItemsByTagSlug(tagSlug: string, limit = 10): Promise<Item[]> {
  const { data: tag } = await supabase
    .from("tags")
    .select("id")
    .eq("slug", tagSlug)
    .maybeSingle();

  if (!tag) return [];

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
      .limit(24),
    supabase
      .from("shows")
      .select("id, name, slug, description, photo_url, category_id, youtube_channel_url, spotify_show_url, apple_podcasts_url, website_url")
      .ilike("name", term)
      .eq("is_active", true)
      .limit(10),
  ]);

  const items = await hydrateItems(itemsRes.data || []);
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
