import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { favoritePersonSlugs } from "@/lib/events";
import { getUpcomingEventsForPersonSlugs, getUpcomingEventsInCity } from "@/lib/data";
import { clampFavoriteFeedLimit, mergeFavoriteFeed } from "@/lib/favorite-feed";
import { normalizeHomeCity } from "@/lib/home-city";

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

type FeedRow = {
  id: number;
  title: string;
  url: string;
  thumbnail_url: string | null;
  published_at: string | null;
  duration_seconds: number | null;
  show_id: number | null;
  category_id: number | null;
  is_paid: boolean;
};

function rowsOf(data: unknown): FeedRow[] {
  if (!Array.isArray(data)) return [];
  const out: FeedRow[] = [];
  for (const value of data) {
    if (!value || typeof value !== "object") continue;
    const record = value as Record<string, unknown>;
    const id = typeof record.id === "number" ? record.id : Number(record.id);
    if (!Number.isSafeInteger(id) || id <= 0) continue;
    if (typeof record.title !== "string" || typeof record.url !== "string") continue;
    out.push({
      id,
      title: record.title,
      url: record.url,
      thumbnail_url: typeof record.thumbnail_url === "string" ? record.thumbnail_url : null,
      published_at: typeof record.published_at === "string" ? record.published_at : null,
      duration_seconds: typeof record.duration_seconds === "number" ? record.duration_seconds : null,
      show_id: typeof record.show_id === "number" ? record.show_id : null,
      category_id: typeof record.category_id === "number" ? record.category_id : null,
      is_paid: record.is_paid === true,
    });
  }
  return out;
}

export async function POST(req: NextRequest) {
  const body: { person_slugs?: unknown; show_slugs?: unknown; city?: unknown; limit?: unknown } = await req.json();
  const personSlugs = favoritePersonSlugs(body?.person_slugs);
  const showSlugs = stringList(body?.show_slugs);
  const city = normalizeHomeCity(typeof body?.city === "string" ? body.city : null);
  const limit = clampFavoriteFeedLimit(body?.limit);
  const upcomingPromise = getUpcomingEventsForPersonSlugs(personSlugs).catch((error) => {
    console.error("Błąd pobierania tras ulubionych:", error);
    return [];
  });
  const cityPromise = city
    ? getUpcomingEventsInCity(city).catch((error) => {
        console.error("Błąd pobierania tras miasta:", error);
        return [];
      })
    : Promise.resolve([]);

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const peopleDetails: { slug: string; name: string }[] = [];
  const showDetails: { slug: string; name: string }[] = [];

  let personIds: number[] = [];
  if (personSlugs.length > 0) {
    const { data: people } = await sb
      .from("people")
      .select("id, name, slug")
      .in("slug", personSlugs);

    if (people?.length) {
      peopleDetails.push(...people.map((person) => ({ slug: person.slug, name: person.name })));
      personIds = people.map((person) => person.id).filter((id): id is number => typeof id === "number");
    }
  }

  let showIds: number[] = [];
  if (showSlugs.length > 0) {
    const { data: shows } = await sb
      .from("shows")
      .select("id, name, slug")
      .in("slug", showSlugs);

    if (shows?.length) {
      showDetails.push(...shows.map((show) => ({ slug: show.slug, name: show.name })));
      showIds = shows.map((show) => show.id).filter((id): id is number => typeof id === "number");
    }
  }

  const tagIdSet = new Set<number>();
  if (personSlugs.length > 0) {
    const [byPerson, bySlug] = await Promise.all([
      personIds.length > 0
        ? sb.from("tags").select("id").eq("tag_type", "person").in("person_id", personIds)
        : Promise.resolve({ data: [] as { id: number }[] }),
      sb.from("tags").select("id").eq("tag_type", "person").in("slug", personSlugs),
    ]);
    for (const row of [...(byPerson.data ?? []), ...(bySlug.data ?? [])]) {
      if (typeof row.id === "number") tagIdSet.add(row.id);
    }
  }
  const tagIds = [...tagIdSet];

  if (tagIds.length === 0 && showIds.length === 0) {
    return NextResponse.json({
      items: [],
      people: peopleDetails,
      shows: showDetails,
      upcoming_events: await upcomingPromise,
      city_events: await cityPromise,
    });
  }

  const { data: shortsCategory } = await sb
    .from("categories")
    .select("id")
    .eq("slug", "shorts")
    .maybeSingle();
  const shortsRaw = shortsCategory?.id;
  const shortsCategoryId = typeof shortsRaw === "number" && Number.isInteger(shortsRaw) ? shortsRaw : null;

  const baseSelect = "id, title, url, thumbnail_url, published_at, duration_seconds, show_id, category_id, is_paid";

  // Order by publication date before the limit. An unordered cap on
  // content_tags kept only one comedian's rows when that person had the
  // oldest tag links.
  function approved(select: string) {
    let query = sb
      .from("content_items")
      .select(select)
      .eq("status", "approved")
      .is("merged_into_id", null)
      .neq("content_type", "short");
    if (shortsCategoryId != null) {
      query = query.or(`category_id.is.null,category_id.neq.${shortsCategoryId}`);
    }
    return query;
  }

  const [personRes, showRes] = await Promise.all([
    tagIds.length > 0
      ? approved(`${baseSelect}, content_tags!inner(tag_id)`)
          .in("content_tags.tag_id", tagIds)
          .order("published_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(limit)
      : Promise.resolve({ data: [] as unknown[], error: null }),
    showIds.length > 0
      ? approved(baseSelect)
          .in("show_id", showIds)
          .order("published_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(limit)
      : Promise.resolve({ data: [] as unknown[], error: null }),
  ]);

  if (personRes.error) console.error("favorites people items", personRes.error.code);
  if (showRes.error) console.error("favorites show items", showRes.error.code);

  const personRows = rowsOf(personRes.data);
  const showRows = rowsOf(showRes.data);
  const top = mergeFavoriteFeed([personRows, showRows], limit);

  const uniqueShowIds = [...new Set(top.map((item) => item.show_id).filter((id): id is number => id != null))];
  const uniqueCatIds = [...new Set(top.map((item) => item.category_id).filter((id): id is number => id != null))];

  const [showsRes, catsRes] = await Promise.all([
    uniqueShowIds.length > 0
      ? sb.from("shows").select("id, name").in("id", uniqueShowIds)
      : Promise.resolve({ data: [] as { id: number; name: string }[] }),
    uniqueCatIds.length > 0
      ? sb.from("categories").select("id, name").in("id", uniqueCatIds)
      : Promise.resolve({ data: [] as { id: number; name: string }[] }),
  ]);

  const showNameMap = new Map((showsRes.data || []).map((show) => [show.id, show.name]));
  const catNameMap = new Map((catsRes.data || []).map((category) => [category.id, category.name]));

  const items = top.map((item) => ({
    ...item,
    status: "approved",
    content_type: null,
    source_id: 0,
    is_featured: false,
    is_paid: item.is_paid === true,
    showName: item.show_id ? (showNameMap.get(item.show_id) ?? null) : null,
    categoryName: item.category_id ? (catNameMap.get(item.category_id) ?? null) : null,
    people: [],
    tags: [],
  }));

  return NextResponse.json({
    items,
    people: peopleDetails,
    shows: showDetails,
    upcoming_events: await upcomingPromise,
    city_events: await cityPromise,
  });
}
