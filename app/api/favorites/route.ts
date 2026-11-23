import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { favoritePersonSlugs } from "@/lib/events";
import { getUpcomingEventsForPersonSlugs, getUpcomingEventsInCity } from "@/lib/data";
import { PUBLIC_LISTING_PAGE_SIZE } from "@/lib/category-browse";
import {
  FAVORITE_CATALOG_CAP,
  FAVORITE_CATALOG_PAGE,
  clampFavoriteFeedLimit,
  mergeFavoriteFeed,
  pageFavoriteFeed,
} from "@/lib/favorite-feed";
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

function favoriteContentPage(value: unknown): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 1 && value <= 10000) return value;
  if (typeof value === "string" && /^[1-9]\d{0,4}$/.test(value.trim())) return Number(value.trim());
  return null;
}

export async function POST(req: NextRequest) {
  const body: { person_slugs?: unknown; show_slugs?: unknown; city?: unknown; limit?: unknown; page?: unknown } = await req.json();
  const personSlugs = favoritePersonSlugs(body?.person_slugs);
  const showSlugs = stringList(body?.show_slugs);
  const city = normalizeHomeCity(typeof body?.city === "string" ? body.city : null);
  const limit = clampFavoriteFeedLimit(body?.limit);
  const contentPage = favoriteContentPage(body?.page);
  const upcomingPromise = contentPage != null
    ? Promise.resolve([])
    : getUpcomingEventsForPersonSlugs(personSlugs).catch((error) => {
        console.error("Błąd pobierania tras ulubionych:", error);
        return [];
      });
  const cityPromise = contentPage != null || !city
    ? Promise.resolve([])
    : getUpcomingEventsInCity(city).catch((error) => {
        console.error("Błąd pobierania tras miasta:", error);
        return [];
      });

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
      ...(contentPage != null ? { total: 0, page: 1 } : {}),
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

  async function scanFeed(start: () => {
    order(column: string, options: { ascending: boolean }): {
      order(column: string, options: { ascending: boolean }): {
        range(from: number, to: number): PromiseLike<{ data: unknown; error: { code?: string } | null }>;
      };
    };
  }): Promise<FeedRow[]> {
    const out: FeedRow[] = [];
    for (let offset = 0; offset < FAVORITE_CATALOG_CAP; offset += FAVORITE_CATALOG_PAGE) {
      const end = Math.min(offset + FAVORITE_CATALOG_PAGE, FAVORITE_CATALOG_CAP) - 1;
      const { data, error } = await start()
        .order("published_at", { ascending: false })
        .order("id", { ascending: false })
        .range(offset, end);
      if (error) {
        console.error("favorites catalog", error.code);
        break;
      }
      const rows = rowsOf(data);
      out.push(...rows);
      if (rows.length < end - offset + 1) break;
    }
    return out;
  }

  let top: FeedRow[];
  let catalogTotal: number | null = null;
  let catalogPage: number | null = null;

  if (contentPage != null) {
    const [personRows, showRows] = await Promise.all([
      tagIds.length > 0
        ? scanFeed(() => approved(`${baseSelect}, content_tags!inner(tag_id)`).in("content_tags.tag_id", tagIds))
        : Promise.resolve([] as FeedRow[]),
      showIds.length > 0
        ? scanFeed(() => approved(baseSelect).in("show_id", showIds))
        : Promise.resolve([] as FeedRow[]),
    ]);
    const paged = pageFavoriteFeed([personRows, showRows], contentPage, PUBLIC_LISTING_PAGE_SIZE);
    top = paged.items;
    catalogTotal = paged.total;
    catalogPage = paged.page;
  } else {
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
    top = mergeFavoriteFeed([personRows, showRows], limit);
  }

  const uniqueShowIds = [...new Set(top.map((item) => item.show_id).filter((id): id is number => id != null))];
  const uniqueCatIds = [...new Set(top.map((item) => item.category_id).filter((id): id is number => id != null))];

  const [showsRes, catsRes] = await Promise.all([
    uniqueShowIds.length > 0
      ? sb.from("shows").select("id, name, slug").in("id", uniqueShowIds)
      : Promise.resolve({ data: [] as { id: number; name: string; slug: string }[] }),
    uniqueCatIds.length > 0
      ? sb.from("categories").select("id, name").in("id", uniqueCatIds)
      : Promise.resolve({ data: [] as { id: number; name: string }[] }),
  ]);

  const showNameMap = new Map((showsRes.data || []).map((show) => [show.id, show.name]));
  const showSlugMap = new Map((showsRes.data || []).map((show) => [show.id, show.slug]));
  const catNameMap = new Map((catsRes.data || []).map((category) => [category.id, category.name]));

  const items = top.map((item) => ({
    ...item,
    status: "approved",
    content_type: null,
    source_id: 0,
    is_featured: false,
    is_paid: item.is_paid === true,
    showName: item.show_id ? (showNameMap.get(item.show_id) ?? null) : null,
    showSlug: item.show_id ? (showSlugMap.get(item.show_id) ?? null) : null,
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
    ...(catalogTotal != null && catalogPage != null ? { total: catalogTotal, page: catalogPage } : {}),
  });
}
