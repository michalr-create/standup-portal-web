export const NOSTALGIA_MIN_SECONDS = 1800;
export const NOSTALGIA_SHELF = 12;
export const NOSTALGIA_HITS = 10;
/** Home row: a short random shelf, not the full 12. */
export const HOME_NOSTALGIA_COUNT = 6;
export const NOSTALGIA_COOKIE = "nostalgia_prev";
export const NOSTALGIA_COOKIE_MAX_IDS = 24;
export const NOSTALGIA_COOKIE_MAX_AGE = 2_592_000;

export function nostalgiaCutoffMs(now: Date): number {
  const cutoff = new Date(now.getTime());
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 5);
  return cutoff.getTime();
}

export function isNostalgiaCandidate(
  row: { publishedAt: string | null; durationSeconds: number | null },
  now: Date,
): boolean {
  if (row.durationSeconds == null || row.durationSeconds < NOSTALGIA_MIN_SECONDS) return false;
  if (!row.publishedAt) return false;
  const published = new Date(row.publishedAt).getTime();
  if (Number.isNaN(published)) return false;
  return published < nostalgiaCutoffMs(now);
}

export function parseNostalgiaCookie(raw: string | undefined | null): number[] {
  if (!raw) return [];
  const ids: number[] = [];
  const seen = new Set<number>();
  for (const part of raw.split(/[^0-9]+/)) {
    if (!part) continue;
    const id = Number(part);
    if (!Number.isSafeInteger(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (ids.length >= NOSTALGIA_COOKIE_MAX_IDS) break;
  }
  return ids;
}

export function nostalgiaCookieValue(ids: number[]): string {
  const clean: number[] = [];
  const seen = new Set<number>();
  for (const id of ids) {
    if (!Number.isSafeInteger(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    clean.push(id);
    if (clean.length >= NOSTALGIA_COOKIE_MAX_IDS) break;
  }
  return clean.join(".");
}

export function nostalgiaCookieAssignment(ids: number[]): string {
  return `${NOSTALGIA_COOKIE}=${nostalgiaCookieValue(ids)}; Path=/; Max-Age=${NOSTALGIA_COOKIE_MAX_AGE}; SameSite=Lax`;
}

/** Calendar date in Europe/Warsaw, `YYYY-MM-DD`. The nostalgia shelf is fixed for this day. */
export function warsawDateKey(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) return "1970-01-01";
  return `${year}-${month}-${day}`;
}

/** Stable 32-bit seed for one Warsaw date. */
export function nostalgiaDaySeed(dateKey: string): number {
  let hash = 2166136261;
  const input = `nostalgia:${dateKey}`;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const current = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = current;
  }
  return copy;
}

/**
 * Next shelf avoids the ids shown last time. When the fresh pool is smaller
 * than `count`, the rest is filled from those previous ids so the shelf
 * still fills up.
 */
export function pickNostalgiaShelf<T extends { id: number }>(
  pool: readonly T[],
  excludeIds: readonly number[],
  count: number,
  random: () => number = Math.random,
): T[] {
  if (count <= 0 || pool.length === 0) return [];
  const exclude = new Set(excludeIds);
  const fresh = pool.filter((item) => !exclude.has(item.id));
  const stale = pool.filter((item) => exclude.has(item.id));
  const picked = shuffle(fresh, random);
  if (picked.length >= count) return picked.slice(0, count);
  return [...picked, ...shuffle(stale, random)].slice(0, Math.min(count, pool.length));
}

/**
 * One shuffle for the Warsaw day. Sorting by id first keeps the result
 * independent of the pool's fetch order. A shorter count is a prefix of a
 * longer one for the same date.
 */
export function dailyNostalgiaPick<T extends { id: number }>(
  pool: readonly T[],
  count: number,
  dateKey: string,
): T[] {
  const ordered = pool.slice().sort((a, b) => a.id - b.id);
  return pickNostalgiaShelf(ordered, [], count, mulberry32(nostalgiaDaySeed(dateKey)));
}

export function nostalgiaHits<T extends { id: number; viewCount: number | null }>(
  pool: readonly T[],
  limit: number,
): T[] {
  return pool
    .filter((item) => item.viewCount != null)
    .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0) || a.id - b.id)
    .slice(0, limit);
}
