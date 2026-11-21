import { unstable_cache } from "next/cache";
import { getApprovedItemsByIds, type Item } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import {
  MIN_PERCENT_BASE,
  MONTH_DAYS,
  HOME_RANKING_CHIP_LABELS,
  RANKING_IDS,
  RANKING_LABELS,
  RANKING_LIMIT,
  RANKING_REVALIDATE_SECONDS,
  WEEKLY_DAYS,
  currentUtcYear,
  homeRankingLabel,
  percentHeading,
  qualifiesForPeopleViews,
  RANKING_CACHE_KEY,
  attachSpecialPrograms,
  rankPeopleBySpecials,
  rankPeopleByViews,
  rankShows,
  selectHomeRanking,
  topByViewCount,
  utcYear,
  videoDetail,
  viewsLine,
  weeklyHeading,
  type PersonRef,
  type PersonSpecialsRank,
  type PersonViewsRank,
  type SpecialProgram,
  type RankingId,
  type RankingQuery,
  type RankingScope,
  type ShowEpisode,
  type ShowRank,
  type ShowRef,
} from "@/lib/rankings";
import { formatViews, programLabel } from "@/lib/view-count";

export type RankedVideo = {
  item: Item;
  rank: number;
  viewsLabel: string | null;
  detail: string | null;
  year: number | null;
};

export type RankingPersonCard = {
  rank: number;
  id: number;
  name: string;
  slug: string;
  photoUrl: string | null;
  metricLabel: string;
  /** Present on Najwięcej pełnych programów. Parts of one program are already ordered. */
  programs?: SpecialProgram[];
};

export type VideoRanking = {
  kind: "videos";
  heading: string;
  pending: boolean;
  entries: RankedVideo[];
  years: number[];
};

export type PeopleRanking = {
  kind: "people";
  heading: string;
  people: RankingPersonCard[];
};

export type ShowsRanking = {
  kind: "shows";
  heading: string;
  shows: ShowRank[];
};

export type RankingPageData = VideoRanking | PeopleRanking | ShowsRanking;

type RpcError = { code?: string; message?: string };

function isMissingRpc(error: RpcError): boolean {
  if (error.code === "PGRST202") return true;
  const message = error.message ?? "";
  return /could not find the function/i.test(message) || /schema cache/i.test(message);
}

function asInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed)) return parsed;
  }
  return null;
}

function asNum(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return [value];
  return [];
}

type GainRow = {
  content_item_id: number;
  view_count: number;
  gain: number;
  gain_pct: number | null;
  window_days: number;
};

type IdRow = {
  content_item_id: number;
  view_count: number;
  published_at: string | null;
};

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<{ missing: boolean; rows: T[] }> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    if (!isMissingRpc(error)) console.error(fn, error.message);
    return { missing: isMissingRpc(error), rows: [] };
  }
  return { missing: false, rows: (Array.isArray(data) ? data : []) as T[] };
}

async function rankedVideos(
  rows: { id: number; viewCount: number; detail: string | null; year: number | null }[],
): Promise<RankedVideo[]> {
  const items = await getApprovedItemsByIds(rows.map((row) => row.id));
  const byId = new Map(items.map((item) => [item.id, item]));
  const entries: RankedVideo[] = [];
  for (const row of rows) {
    const item = byId.get(row.id);
    if (!item) continue;
    entries.push({
      item,
      rank: entries.length + 1,
      viewsLabel: viewsLine(row.viewCount),
      detail: row.detail,
      year: row.year ?? utcYear(item.published_at),
    });
  }
  return entries;
}

async function loadWindow(): Promise<{ windowDays: number; ready: boolean; missing: boolean }> {
  const result = await rpc<{ window_days: number; snapshot_days: number; ready: boolean }>(
    "ranking_views_window",
    { p_days: WEEKLY_DAYS },
  );
  const row = result.rows[0];
  if (!row) return { windowDays: 0, ready: false, missing: result.missing };
  return {
    windowDays: asInt(row.window_days) ?? 0,
    ready: row.ready === true,
    missing: false,
  };
}

async function loadGain(
  scope: RankingScope,
  order: "gain" | "percent",
  limit: number,
): Promise<{ missing: boolean; rows: GainRow[] }> {
  const result = await rpc<GainRow>("ranking_views_gain", {
    p_days: WEEKLY_DAYS,
    p_limit: limit,
    p_scope: scope,
    p_order: order,
    p_min_base: order === "percent" ? MIN_PERCENT_BASE : 0,
  });
  return {
    missing: result.missing,
    rows: result.rows.flatMap((row) => {
      const id = asInt(row.content_item_id);
      const viewCount = asInt(row.view_count);
      const gain = asInt(row.gain);
      if (id == null || viewCount == null || gain == null) return [];
      return [{
        content_item_id: id,
        view_count: viewCount,
        gain,
        gain_pct: asNum(row.gain_pct),
        window_days: asInt(row.window_days) ?? 0,
      }];
    }),
  };
}

async function weeklyFromRpc(scope: RankingScope, order: "gain" | "percent", limit: number): Promise<VideoRanking | "missing"> {
  const window = await loadWindow();
  if (window.missing) return "missing";
  const heading = order === "percent"
    ? percentHeading(window.windowDays, window.ready)
    : weeklyHeading(window.windowDays, window.ready);
  if (!window.ready) {
    return { kind: "videos", heading, pending: true, entries: [], years: [] };
  }
  const gain = await loadGain(scope, order, limit);
  if (gain.missing) return "missing";
  const windowDays = gain.rows[0]?.window_days || window.windowDays;
  const entries = await rankedVideos(gain.rows.map((row) => ({
    id: row.content_item_id,
    viewCount: row.view_count,
    detail: videoDetail(order, row.gain, row.gain_pct),
    year: null,
  })));
  return {
    kind: "videos",
    heading: order === "percent" ? percentHeading(windowDays, true) : weeklyHeading(windowDays, true),
    pending: false,
    entries,
    years: [],
  };
}

async function shortsCategoryId(): Promise<number | null> {
  const { data } = await supabase.from("categories").select("id").eq("slug", "shorts").maybeSingle();
  return asInt(data?.id);
}

const VIDEO_COLUMNS = "id, external_id, view_count, published_at, content_type, category_id";

type LooseVideo = {
  id: number;
  external_id: string | null;
  view_count: number | null;
  published_at: string | null;
};

function looseVideos(rows: LooseVideo[]): { id: number; externalId: string | null; viewCount: number; publishedAt: string | null }[] {
  const out = [];
  for (const row of rows) {
    const id = asInt(row.id);
    const viewCount = asInt(row.view_count);
    if (id == null || viewCount == null) continue;
    out.push({
      id,
      externalId: row.external_id,
      viewCount,
      publishedAt: row.published_at,
    });
  }
  return out;
}

async function topVideos(narrow?: (query: Query) => Query): Promise<RankedVideo[]> {
  const shortsId = await shortsCategoryId();
  let query = videoQuery(shortsId).order("view_count", { ascending: false }).limit(80);
  if (narrow) query = narrow(query);
  const { data, error } = await query;
  if (error || !Array.isArray(data)) {
    if (error) console.error("ranking videos", error.message);
    return [];
  }
  const top = topByViewCount(looseVideos(data as LooseVideo[]), RANKING_LIMIT);
  return rankedVideos(top.map((row) => ({
    id: row.id,
    viewCount: row.viewCount,
    detail: null,
    year: null,
  })));
}

type Query = {
  order: (column: string, options: { ascending: boolean }) => Query;
  limit: (count: number) => Query;
  gte: (column: string, value: string) => Query;
  range: (from: number, to: number) => Query;
  or: (filters: string) => Query;
  eq: (column: string, value: string) => Query;
  not: (column: string, operator: string, value: null) => Query;
  then: PromiseLike<{ data: unknown; error: { message: string } | null }>["then"];
};

function videoQuery(shortsId: number | null): Query {
  let query = supabase
    .from("content_items")
    .select(VIDEO_COLUMNS)
    .eq("status", "approved")
    .is("merged_into_id", null)
    .neq("content_type", "short")
    .not("view_count", "is", null);
  if (shortsId != null) query = query.or(`category_id.is.null,category_id.neq.${shortsId}`);
  return query as unknown as Query;
}

async function idRowsFromRpc(fn: string, args: Record<string, unknown>): Promise<{ missing: boolean; rows: IdRow[] }> {
  const result = await rpc<IdRow>(fn, args);
  return {
    missing: result.missing,
    rows: result.rows.flatMap((row) => {
      const id = asInt(row.content_item_id);
      const viewCount = asInt(row.view_count);
      if (id == null || viewCount == null) return [];
      return [{ content_item_id: id, view_count: viewCount, published_at: row.published_at ?? null }];
    }),
  };
}

async function videosFromIdRows(rows: IdRow[]): Promise<RankedVideo[]> {
  return rankedVideos(rows.map((row) => ({
    id: row.content_item_id,
    viewCount: row.view_count,
    detail: null,
    year: null,
  })));
}

async function specialItemIds(): Promise<number[]> {
  const { data: tag, error } = await supabase.from("tags").select("id").eq("slug", "special").maybeSingle();
  if (error || !tag) return [];
  const ids: number[] = [];
  for (let from = 0; from < 5000; from += 1000) {
    const { data, error: tagError } = await supabase
      .from("content_tags")
      .select("content_item_id")
      .eq("tag_id", tag.id)
      .order("content_item_id", { ascending: true })
      .range(from, from + 999);
    if (tagError || !data || data.length === 0) break;
    for (const row of data) {
      const id = asInt(row.content_item_id);
      if (id != null) ids.push(id);
    }
    if (data.length < 1000) break;
  }
  return ids;
}

async function itemsByIds(ids: number[], shortsId: number | null): Promise<LooseVideo[]> {
  const rows: LooseVideo[] = [];
  for (let index = 0; index < ids.length; index += 150) {
    let query = supabase
      .from("content_items")
      .select(VIDEO_COLUMNS)
      .in("id", ids.slice(index, index + 150))
      .eq("status", "approved")
      .is("merged_into_id", null)
      .neq("content_type", "short");
    if (shortsId != null) query = query.or(`category_id.is.null,category_id.neq.${shortsId}`);
    const { data, error } = await query;
    if (error || !data) {
      if (error) console.error("ranking specials", error.message);
      continue;
    }
    rows.push(...(data as LooseVideo[]));
  }
  return rows;
}

async function fallbackSpecials(year: number): Promise<{ entries: RankedVideo[]; years: number[] }> {
  const shortsId = await shortsCategoryId();
  const ids = await specialItemIds();
  const rows = looseVideos(await itemsByIds(ids, shortsId));
  const years = [...new Set(rows.flatMap((row) => {
    const value = utcYear(row.publishedAt);
    return value == null ? [] : [value];
  }))].sort((a, b) => b - a);
  const top = topByViewCount(rows.filter((row) => utcYear(row.publishedAt) === year), RANKING_LIMIT);
  return {
    years,
    entries: await rankedVideos(top.map((row) => ({
      id: row.id,
      viewCount: row.viewCount,
      detail: null,
      year,
    }))),
  };
}

function peopleFromRow(row: Record<string, unknown>): { people: PersonRef[]; isSpecial: boolean; categorySlug: string | null } {
  let isSpecial = false;
  const people: PersonRef[] = [];
  const seen = new Set<number>();
  for (const link of asList(row.content_tags)) {
    const tag = asRecord(asRecord(link)?.tags);
    if (!tag) continue;
    if (tag.slug === "special") isSpecial = true;
    if (tag.tag_type !== "person") continue;
    const person = asRecord(tag.people);
    const id = asInt(person?.id ?? tag.person_id);
    if (id == null || seen.has(id)) continue;
    if (person?.is_active === false) continue;
    const name = typeof person?.name === "string" ? person.name : "";
    const slug = typeof person?.slug === "string" ? person.slug : "";
    if (!name || !slug) continue;
    seen.add(id);
    people.push({
      id,
      name,
      slug,
      photoUrl: typeof person?.photo_url === "string" ? person.photo_url : null,
    });
  }
  const category = asRecord(row.categories);
  return {
    people,
    isSpecial,
    categorySlug: typeof category?.slug === "string" ? category.slug : null,
  };
}

async function pageContent(select: string, narrow?: (query: Query) => Query) {
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; from < 8000; from += 500) {
    let query = baseItems(select);
    if (narrow) query = narrow(query);
    const { data, error } = await query.order("id", { ascending: true }).range(from, from + 499);
    if (error || !Array.isArray(data)) {
      if (error) console.error("ranking page", error.message);
      break;
    }
    rows.push(...(data as Record<string, unknown>[]));
    if (data.length < 500) break;
  }
  return rows;
}

function baseItems(select: string): Query {
  return supabase
    .from("content_items")
    .select(select)
    .eq("status", "approved")
    .is("merged_into_id", null)
    .neq("content_type", "short") as unknown as Query;
}

async function fallbackPeopleViews(): Promise<PersonViewsRank[]> {
  const shortsId = await shortsCategoryId();
  const rows = await pageContent(
    "id, view_count, content_type, categories(slug), content_tags(tags(tag_type, slug, person_id, people(id, name, slug, photo_url, is_active)))",
    (query) => {
      let next = query.eq("content_type", "video").not("view_count", "is", null);
      if (shortsId != null) next = next.or(`category_id.is.null,category_id.neq.${shortsId}`);
      return next;
    },
  );
  const sources = [];
  for (const row of rows) {
    const id = asInt(row.id);
    const viewCount = asInt(row.view_count);
    if (id == null || viewCount == null) continue;
    const parsed = peopleFromRow(row);
    if (!qualifiesForPeopleViews({
      contentType: typeof row.content_type === "string" ? row.content_type : null,
      categorySlug: parsed.categorySlug,
      viewCount,
      isSpecial: parsed.isSpecial,
    })) continue;
    sources.push({ id, viewCount, people: parsed.people });
  }
  return rankPeopleByViews(sources, RANKING_LIMIT);
}

async function fallbackPeopleSpecials(): Promise<PersonSpecialsRank[]> {
  const shortsId = await shortsCategoryId();
  const ids = await specialItemIds();
  const sources = [];
  for (let index = 0; index < ids.length; index += 150) {
    let query = supabase
      .from("content_items")
      .select("id, title, url, thumbnail_url, published_at, show_id, categories(slug), content_tags(tags(tag_type, slug, person_id, people(id, name, slug, photo_url, is_active)))")
      .in("id", ids.slice(index, index + 150))
      .eq("status", "approved")
      .is("merged_into_id", null)
      .neq("content_type", "short");
    if (shortsId != null) query = query.or(`category_id.is.null,category_id.neq.${shortsId}`);
    const { data, error } = await query;
    if (error || !data) continue;
    for (const row of data as Record<string, unknown>[]) {
      const id = asInt(row.id);
      if (id == null) continue;
      const parsed = peopleFromRow(row);
      if (parsed.categorySlug === "shorts" || !parsed.isSpecial) continue;
      sources.push({
        id,
        title: typeof row.title === "string" ? row.title : "",
        showId: asInt(row.show_id),
        publishedAt: typeof row.published_at === "string" ? row.published_at : null,
        url: typeof row.url === "string" ? row.url : null,
        thumbnailUrl: typeof row.thumbnail_url === "string" ? row.thumbnail_url : null,
        people: parsed.people,
      });
    }
  }
  return rankPeopleBySpecials(sources, RANKING_LIMIT);
}

function personCards(rows: PersonViewsRank[], mode: "views"): RankingPersonCard[];
function personCards(rows: PersonSpecialsRank[], mode: "specials"): RankingPersonCard[];
function personCards(rows: Array<PersonViewsRank | PersonSpecialsRank>, mode: "views" | "specials"): RankingPersonCard[] {
  return rows.map((row) => ({
    rank: row.rank,
    id: row.id,
    name: row.name,
    slug: row.slug,
    photoUrl: row.photoUrl,
    metricLabel: mode === "views" && "viewCount" in row
      ? formatViews(row.viewCount)
      : "specialCount" in row
        ? `${row.specialCount} ${programLabel(row.specialCount)}`
        : "",
    programs: "programs" in row ? row.programs : undefined,
  }));
}

type SpecialCountRow = {
  id: number;
  name: string;
  slug: string;
  photoUrl: string | null;
  specialCount: number;
};

async function peopleSpecialsFromRpc(): Promise<SpecialCountRow[] | "fallback"> {
  const { data, error } = await supabase.rpc("ranking_people_specials", { p_limit: RANKING_LIMIT });
  if (error) {
    if (!isMissingRpc(error)) console.error("ranking_people_specials", error.message);
    return "fallback";
  }
  const rows = (Array.isArray(data) ? data : []) as Array<{
    person_id: number;
    name: string;
    slug: string;
    photo_url: string | null;
    special_count: number;
  }>;
  return rows.flatMap((row) => {
    const id = asInt(row.person_id);
    const specialCount = asInt(row.special_count);
    if (id == null || specialCount == null || !row.slug || !row.name) return [];
    return [{
      id,
      name: row.name,
      slug: row.slug,
      photoUrl: row.photo_url,
      specialCount,
    }];
  });
}

function specialCards(rows: SpecialCountRow[], grouped: PersonSpecialsRank[]): RankingPersonCard[] {
  return attachSpecialPrograms(rows, grouped).map((row, index) => ({
    rank: index + 1,
    id: row.id,
    name: row.name,
    slug: row.slug,
    photoUrl: row.photoUrl,
    metricLabel: `${row.specialCount} ${programLabel(row.specialCount)}`,
    programs: row.programs,
  }));
}

async function peopleFromRpc(): Promise<RankingPersonCard[] | "missing"> {
  const result = await rpc<{
      person_id: number;
      name: string;
      slug: string;
      photo_url: string | null;
      view_count: number;
      title_count: number;
    }>("ranking_people_views", { p_limit: RANKING_LIMIT });
    if (result.missing) return "missing";
    return result.rows.flatMap((row, index) => {
      const id = asInt(row.person_id);
      const viewCount = asInt(row.view_count);
      if (id == null || viewCount == null || !row.slug || !row.name) return [];
      return [{
        rank: index + 1,
        id,
        name: row.name,
        slug: row.slug,
        photoUrl: row.photo_url,
        metricLabel: formatViews(viewCount),
      }];
    });
}

async function fallbackShows(): Promise<ShowRank[]> {
  const shortsId = await shortsCategoryId();
  const rows = await pageContent(
    "id, show_id, view_count, published_at, thumbnail_url, duration_seconds, category_id",
    (query) => {
      let next = query.not("show_id", "is", null);
      if (shortsId != null) next = next.or(`category_id.is.null,category_id.neq.${shortsId}`);
      return next;
    },
  );
  const episodes: ShowEpisode[] = [];
  for (const row of rows) {
    const id = asInt(row.id);
    const showId = asInt(row.show_id);
    if (id == null || showId == null) continue;
    episodes.push({
      id,
      showId,
      viewCount: asInt(row.view_count),
      publishedAt: typeof row.published_at === "string" ? row.published_at : null,
      thumbnailUrl: typeof row.thumbnail_url === "string" ? row.thumbnail_url : null,
      durationSeconds: asInt(row.duration_seconds),
    });
  }
  const { data, error } = await supabase.from("shows").select("id, name, slug, is_active").eq("is_active", true);
  if (error || !data) return [];
  const shows: ShowRef[] = data.flatMap((show) => {
    const id = asInt(show.id);
    if (id == null || !show.slug || !show.name) return [];
    return [{ id, name: show.name, slug: show.slug, isActive: show.is_active !== false }];
  });
  return rankShows(episodes, shows, RANKING_LIMIT);
}

async function showsFromRpc(): Promise<ShowRank[] | "missing"> {
  const result = await rpc<{
    show_id: number;
    name: string;
    slug: string;
    view_count: number;
    episode_count: number;
    latest_thumbnail_url: string | null;
    latest_published_at: string | null;
    latest_duration_seconds: number | null;
  }>("ranking_shows", { p_limit: RANKING_LIMIT });
  if (result.missing) return "missing";
  return result.rows.flatMap((row, index) => {
    const id = asInt(row.show_id);
    const viewCount = asInt(row.view_count);
    const episodeCount = asInt(row.episode_count);
    if (id == null || viewCount == null || episodeCount == null || !row.slug || !row.name) return [];
    return [{
      rank: index + 1,
      id,
      name: row.name,
      slug: row.slug,
      viewCount,
      episodeCount,
      thumbnailUrl: row.latest_thumbnail_url,
      durationSeconds: asInt(row.latest_duration_seconds),
      latestDate: row.latest_published_at,
    }];
  });
}

async function loadRankingUncached(query: RankingQuery): Promise<RankingPageData> {
  switch (query.ranking) {
    case "hity": {
      const ranked = await weeklyFromRpc(query.scope, "gain", RANKING_LIMIT);
      if (ranked !== "missing") return ranked;
      return {
        kind: "videos",
        heading: weeklyHeading(0, false),
        pending: true,
        entries: [],
        years: [],
      };
    }
    case "trendujace": {
      const ranked = await weeklyFromRpc("all", "percent", RANKING_LIMIT);
      if (ranked !== "missing") return ranked;
      return {
        kind: "videos",
        heading: percentHeading(0, false),
        pending: true,
        entries: [],
        years: [],
      };
    }
    case "klasyki": {
      const result = await idRowsFromRpc("ranking_classics", { p_limit: RANKING_LIMIT });
      const entries = result.missing ? await topVideos((query) => query) : await videosFromIdRows(result.rows);
      return { kind: "videos", heading: "Klasyki wszech czas\u00f3w", pending: false, entries, years: [] };
    }
    case "nowosci": {
      const result = await idRowsFromRpc("ranking_month", { p_days: MONTH_DAYS, p_limit: RANKING_LIMIT });
      const entries = result.missing
        ? await topVideos((query) => query.gte("published_at", new Date(Date.now() - MONTH_DAYS * 86_400_000).toISOString()))
        : await videosFromIdRows(result.rows);
      return { kind: "videos", heading: "Nowo\u015bci miesi\u0105ca", pending: false, entries, years: [] };
    }
    case "specjale": {
      const yearsResult = await rpc<{ year: number }>("ranking_special_years", {});
      const rows = await idRowsFromRpc("ranking_specials_year", { p_year: query.year, p_limit: RANKING_LIMIT });
      if (!yearsResult.missing && !rows.missing) {
        const years = yearsResult.rows.flatMap((row) => {
          const year = asInt(row.year);
          return year == null ? [] : [year];
        });
        return {
          kind: "videos",
          heading: `Top specjali ${query.year}`,
          pending: false,
          entries: await videosFromIdRows(rows.rows),
          years,
        };
      }
      const fallback = await fallbackSpecials(query.year);
      return {
        kind: "videos",
        heading: `Top specjali ${query.year}`,
        pending: false,
        entries: fallback.entries,
        years: fallback.years,
      };
    }
    case "standuperzy": {
      const people = await peopleFromRpc();
      return {
        kind: "people",
        heading: "Najch\u0119tniej ogl\u0105dani standuperzy",
        people: people === "missing" ? personCards(await fallbackPeopleViews(), "views") : people,
      };
    }
    case "programy": {
      // ranking_people_specials is the count. In-app grouping only fills the
      // expandable part lists, and only if that read succeeds.
      const [counted, grouped] = await Promise.all([
        peopleSpecialsFromRpc(),
        fallbackPeopleSpecials().catch((error: unknown) => {
          console.error("ranking program lists", error);
          return [] as PersonSpecialsRank[];
        }),
      ]);
      return {
        kind: "people",
        heading: "Najwi\u0119cej pe\u0142nych program\u00f3w",
        people: counted === "fallback" ? personCards(grouped, "specials") : specialCards(counted, grouped),
      };
    }
    case "formaty": {
      const shows = await showsFromRpc();
      return {
        kind: "shows",
        heading: "Top format\u00f3w",
        shows: shows === "missing" ? await fallbackShows() : shows,
      };
    }
    default:
      return { kind: "videos", heading: weeklyHeading(0, false), pending: true, entries: [], years: [] };
  }
}

const rankingPage = unstable_cache(
  async (ranking: RankingQuery["ranking"], scope: RankingQuery["scope"], year: number) =>
    loadRankingUncached({ ranking, scope, year }),
  [RANKING_CACHE_KEY],
  { revalidate: RANKING_REVALIDATE_SECONDS },
);

export function getRanking(query: RankingQuery): Promise<RankingPageData> {
  return rankingPage(query.ranking, query.scope, query.year);
}

export type HomeRankingPreview = {
  kind: "hity" | "klasyki";
  label: string;
  entries: RankedVideo[];
};

export type HomeRankingBoard =
  | { id: RankingId; label: string; kind: "videos"; pending: boolean; entries: RankedVideo[] }
  | { id: RankingId; label: string; kind: "people"; people: RankingPersonCard[] }
  | { id: RankingId; label: string; kind: "shows"; shows: ShowRank[] };

/** Every public ranking, in chip order, so the home switcher can change lists without a navigation. */
export async function getHomeRankingBoards(): Promise<HomeRankingBoard[]> {
  const year = currentUtcYear();
  const pages = await Promise.all(
    RANKING_IDS.map((id) => getRanking({ ranking: id, scope: "all", year })),
  );
  return RANKING_IDS.map((id, index) => {
    const data = pages[index]!;
    const label = HOME_RANKING_CHIP_LABELS[id];
    if (data.kind === "people") return { id, label, kind: "people", people: data.people };
    if (data.kind === "shows") return { id, label, kind: "shows", shows: data.shows };
    return { id, label, kind: "videos", pending: data.pending, entries: data.entries };
  });
}

/** Top of Hity tygodnia when gain rows exist, otherwise top of Klasyki. */
export async function getHomeRanking(limit = RANKING_LIMIT): Promise<HomeRankingPreview> {
  const year = currentUtcYear();
  const weekly = await getRanking({ ranking: "hity", scope: "all", year });
  const weeklyEntries = weekly.kind === "videos" ? weekly.entries : [];
  const pending = weekly.kind !== "videos" || weekly.pending;
  const kind = selectHomeRanking({ pending, entryCount: weeklyEntries.length });
  if (kind === "hity") {
    return {
      kind,
      label: homeRankingLabel(kind, weekly.kind === "videos" ? weekly.heading : ""),
      entries: weeklyEntries.slice(0, limit),
    };
  }
  const classics = await getRanking({ ranking: "klasyki", scope: "all", year });
  const entries = classics.kind === "videos" ? classics.entries.slice(0, limit) : [];
  const heading = classics.kind === "videos" ? classics.heading : RANKING_LABELS.klasyki;
  return { kind, label: homeRankingLabel(kind, heading), entries };
}
