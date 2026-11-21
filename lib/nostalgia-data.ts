import { unstable_cache } from "next/cache";
import { getApprovedItemsByIds } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import {
  HOME_NOSTALGIA_COUNT,
  NOSTALGIA_HITS,
  NOSTALGIA_MIN_SECONDS,
  NOSTALGIA_SHELF,
  dailyNostalgiaPick,
  isNostalgiaCandidate,
  nostalgiaCutoffMs,
  nostalgiaHits,
  warsawDateKey,
} from "@/lib/nostalgia";
import { utcYear, viewsLine } from "@/lib/rankings";
import type { RankedVideo } from "@/lib/rankings-data";

const REVALIDATE_SECONDS = 3600;

type PoolItem = {
  id: number;
  viewCount: number | null;
  publishedAt: string | null;
  durationSeconds: number | null;
};

function asInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed)) return parsed;
  }
  return null;
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

async function loadNostalgiaPool(): Promise<PoolItem[]> {
  const now = new Date();
  const cutoff = new Date(nostalgiaCutoffMs(now)).toISOString();
  const { data: shorts } = await supabase.from("categories").select("id").eq("slug", "shorts").maybeSingle();
  const shortsId = asInt(shorts?.id);
  const ids = await specialItemIds();
  const pool: PoolItem[] = [];
  for (let index = 0; index < ids.length; index += 150) {
    let query = supabase
      .from("content_items")
      .select("id, view_count, published_at, duration_seconds, category_id")
      .in("id", ids.slice(index, index + 150))
      .eq("status", "approved")
      .is("merged_into_id", null)
      .neq("content_type", "short")
      .gte("duration_seconds", NOSTALGIA_MIN_SECONDS)
      .lt("published_at", cutoff);
    if (shortsId != null) query = query.or(`category_id.is.null,category_id.neq.${shortsId}`);
    const { data, error } = await query;
    if (error || !data) {
      if (error) console.error("nostalgia", error.message);
      continue;
    }
    for (const row of data) {
      const id = asInt(row.id);
      if (id == null) continue;
      const candidate = {
        id,
        viewCount: asInt(row.view_count),
        publishedAt: row.published_at,
        durationSeconds: asInt(row.duration_seconds),
      };
      if (isNostalgiaCandidate(candidate, now)) pool.push(candidate);
    }
  }
  return pool;
}

const nostalgiaPool = unstable_cache(loadNostalgiaPool, ["nostalgia-pool"], { revalidate: REVALIDATE_SECONDS });

function toCards(
  rows: PoolItem[],
  byId: Map<number, Awaited<ReturnType<typeof getApprovedItemsByIds>>[number]>,
  ranked: boolean,
): RankedVideo[] {
  const cards: RankedVideo[] = [];
  for (const row of rows) {
    const item = byId.get(row.id);
    if (!item) continue;
    cards.push({
      item,
      rank: ranked ? cards.length + 1 : 0,
      viewsLabel: row.viewCount != null ? viewsLine(row.viewCount) : null,
      detail: null,
      year: utcYear(row.publishedAt) ?? utcYear(item.published_at),
    });
  }
  return cards;
}

function dailyShelf(pool: PoolItem[], count: number, now: Date) {
  return dailyNostalgiaPick(pool, count, warsawDateKey(now));
}

export async function getNostalgiaPage(now = new Date()): Promise<{ shelf: RankedVideo[]; hits: RankedVideo[] }> {
  const pool = await nostalgiaPool();
  const shelf = dailyShelf(pool, NOSTALGIA_SHELF, now);
  const hits = nostalgiaHits(pool, NOSTALGIA_HITS);
  const items = await getApprovedItemsByIds([...shelf.map((row) => row.id), ...hits.map((row) => row.id)]);
  const byId = new Map(items.map((item) => [item.id, item]));
  return {
    shelf: toCards(shelf, byId, false),
    hits: toCards(hits, byId, true),
  };
}

/** First cards of the same Warsaw-day shelf shown on /nostalgia. */
export async function getHomeNostalgia(count = HOME_NOSTALGIA_COUNT, now = new Date()) {
  const pool = await nostalgiaPool();
  const shelf = dailyShelf(pool, NOSTALGIA_SHELF, now).slice(0, count);
  const items = await getApprovedItemsByIds(shelf.map((row) => row.id));
  const byId = new Map(items.map((item) => [item.id, item]));
  return shelf.flatMap((row) => {
    const item = byId.get(row.id);
    return item ? [item] : [];
  });
}
