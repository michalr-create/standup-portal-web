import { formatGain, formatGainPct, formatViews } from "./view-count.ts";

export const RANKING_LIMIT = 10;
export const WEEKLY_DAYS = 7;
export const MONTH_DAYS = 30;
export const MIN_PERCENT_BASE = 20_000;
export const RANKING_REVALIDATE_SECONDS = 3600;

export const RANKING_IDS = [
  "hity",
  "zyskujace",
  "klasyki",
  "nowosci",
  "specjale",
  "standuperzy",
  "programy",
  "formaty",
] as const;

export type RankingId = (typeof RANKING_IDS)[number];
export type RankingScope = "all" | "standup_special";

export type RankingQuery = {
  ranking: RankingId;
  scope: RankingScope;
  year: number;
};

/** Short names for the home Rankingi chips. Order follows RANKING_IDS. */
export const HOME_RANKING_CHIP_LABELS: Record<RankingId, string> = {
  hity: "Hity tygodnia",
  zyskujace: "Zyskuj\u0105ce",
  klasyki: "Klasyki",
  nowosci: "Nowo\u015bci miesi\u0105ca",
  specjale: "Top specjali roku",
  standuperzy: "Standuperzy",
  programy: "Pe\u0142ne programy",
  formaty: "Top format\u00f3w",
};

export function homeRankingSeeAllHref(id: RankingId): string {
  return `/rankingi?ranking=${id}`;
}

export const RANKING_LABELS: Record<RankingId, string> = {
  hity: "Hity tygodnia",
  zyskujace: "Zyskuj\u0105ce",
  klasyki: "Klasyki wszech czas\u00f3w",
  nowosci: "Nowo\u015bci miesi\u0105ca",
  specjale: "Top specjali roku",
  standuperzy: "Najch\u0119tniej ogl\u0105dani standuperzy",
  programy: "Najwi\u0119cej pe\u0142nych program\u00f3w",
  formaty: "Top format\u00f3w",
};

const RANKING_SET = new Set<string>(RANKING_IDS);

function firstParam(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw.trim() : "";
}

export function currentUtcYear(now: Date = new Date()): number {
  return now.getUTCFullYear();
}

export function parseRankingQuery(
  params: Record<string, string | string[] | undefined>,
  now: Date = new Date(),
): RankingQuery {
  const rankingRaw = firstParam(params.ranking);
  const ranking: RankingId = RANKING_SET.has(rankingRaw) ? (rankingRaw as RankingId) : "hity";
  const scope: RankingScope = firstParam(params.zakres) === "standup" ? "standup_special" : "all";
  const current = currentUtcYear(now);
  const yearRaw = firstParam(params.rok);
  const parsed = /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : current;
  const year = parsed >= 1990 && parsed <= current + 1 ? parsed : current;
  return { ranking, scope, year };
}

export function rankingHref(
  query: { ranking: RankingId; scope?: RankingScope; year?: number },
  currentYear: number,
): string {
  const params = new URLSearchParams();
  if (query.ranking !== "hity") params.set("ranking", query.ranking);
  if (query.ranking === "hity" && query.scope === "standup_special") params.set("zakres", "standup");
  if (query.ranking === "specjale" && query.year != null && query.year !== currentYear) {
    params.set("rok", String(query.year));
  }
  const qs = params.toString();
  return qs ? `/rankingi?${qs}` : "/rankingi";
}

/**
 * Calendar span of the snapshot window, matching ranking_views_window.
 * Dates are UTC `YYYY-MM-DD`. The window is the last `days` dates including
 * today. windowDays = (today - oldest snapshot in that window) + 1.
 * Ready when at least two distinct snapshot dates fall inside the window.
 */
export function describeViewsWindow(
  snapshotDates: string[],
  today: string,
  days = WEEKLY_DAYS,
): { windowDays: number; snapshotDays: number; ready: boolean } {
  const span = Math.max(1, Math.floor(days));
  const start = addUtcDays(today, -(span - 1));
  const inWindow = [...new Set(snapshotDates.filter((date) => date >= start && date <= today))].sort();
  if (inWindow.length === 0) return { windowDays: 0, snapshotDays: 0, ready: false };
  const base = inWindow[0]!;
  const windowDays = Math.min(span, diffUtcDays(today, base) + 1);
  return {
    windowDays,
    snapshotDays: inWindow.length,
    ready: inWindow.length >= 2,
  };
}

export function viewsWindowPhrase(days: number): string {
  const n = Math.floor(days);
  if (n <= 1) return "za ostatni dzie\u0144";
  return `za ostatnie ${n} dni`;
}

export function weeklyHeading(days: number, ready: boolean): string {
  if (!ready) return RANKING_LABELS.hity;
  return `${RANKING_LABELS.hity} ${viewsWindowPhrase(days)}`;
}

export type HomeRankingKind = "hity" | "klasyki";

/**
 * Home shows the weekly cumulative gain list when that window has rows.
 * An empty or not-yet-ready gain ranking falls back to all-time classics
 * so the Rankingi section still has something to render.
 */
export function selectHomeRanking(weekly: { pending: boolean; entryCount: number }): HomeRankingKind {
  if (!weekly.pending && weekly.entryCount > 0) return "hity";
  return "klasyki";
}

export function homeRankingLabel(kind: HomeRankingKind, heading: string): string {
  const trimmed = heading.trim();
  return trimmed || RANKING_LABELS[kind];
}

export function percentHeading(days: number, ready: boolean): string {
  if (!ready) return RANKING_LABELS.zyskujace;
  return `${RANKING_LABELS.zyskujace} ${viewsWindowPhrase(days)}`;
}

export const PENDING_RANKING_MESSAGE = "Ranking ruszy jutro.";

export function videoDetail(kind: "gain" | "percent" | "views", gain: number | null, gainPct: number | null): string | null {
  if (kind === "gain" && gain != null) return formatGain(gain);
  if (kind === "percent" && gainPct != null) return formatGainPct(gainPct);
  return null;
}

export function viewsLine(count: number): string {
  return formatViews(count);
}

export type ExternalVideo = {
  id: number;
  externalId: string | null;
  viewCount: number;
};

/** Keep the highest view_count for a repeated external_id. Blank ids stay unique. */
export function dedupeByExternalId<T extends ExternalVideo>(rows: T[]): T[] {
  const best = new Map<string, T>();
  for (const row of rows) {
    const trimmed = row.externalId?.trim() ?? "";
    const key = trimmed ? `ext:${trimmed}` : `id:${row.id}`;
    const prev = best.get(key);
    if (!prev || row.viewCount > prev.viewCount || (row.viewCount === prev.viewCount && row.id < prev.id)) {
      best.set(key, row);
    }
  }
  return [...best.values()];
}

export function topByViewCount<T extends ExternalVideo>(rows: T[], limit: number): T[] {
  return dedupeByExternalId(rows)
    .sort((a, b) => b.viewCount - a.viewCount || a.id - b.id)
    .slice(0, limit);
}

export function utcYear(iso: string | null): number | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.getUTCFullYear();
}

export function isWithinPastDays(iso: string | null, now: Date, days: number): boolean {
  if (!iso) return false;
  const published = new Date(iso).getTime();
  if (Number.isNaN(published)) return false;
  const span = Math.max(1, Math.floor(days)) * 86_400_000;
  return published >= now.getTime() - span && published <= now.getTime();
}

export type PersonRef = {
  id: number;
  name: string;
  slug: string;
  photoUrl: string | null;
};

export type PersonViewSource = {
  id: number;
  viewCount: number;
  people: PersonRef[];
};

export type PersonViewsRank = PersonRef & {
  rank: number;
  viewCount: number;
  titleCount: number;
};

export function rankPeopleByViews(items: PersonViewSource[], limit: number): PersonViewsRank[] {
  const map = new Map<number, PersonViewsRank>();
  for (const item of items) {
    const seen = new Set<number>();
    for (const person of item.people) {
      if (seen.has(person.id)) continue;
      seen.add(person.id);
      const current = map.get(person.id);
      if (current) {
        current.viewCount += item.viewCount;
        current.titleCount += 1;
      } else {
        map.set(person.id, { ...person, rank: 0, viewCount: item.viewCount, titleCount: 1 });
      }
    }
  }
  return [...map.values()]
    .sort((a, b) => b.viewCount - a.viewCount || b.titleCount - a.titleCount || a.name.localeCompare(b.name, "pl"))
    .slice(0, limit)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export type PersonSpecialSource = {
  id: number;
  people: PersonRef[];
};

export type PersonSpecialsRank = PersonRef & {
  rank: number;
  specialCount: number;
};

export function rankPeopleBySpecials(items: PersonSpecialSource[], limit: number): PersonSpecialsRank[] {
  const map = new Map<number, PersonSpecialsRank>();
  for (const item of items) {
    const seen = new Set<number>();
    for (const person of item.people) {
      if (seen.has(person.id)) continue;
      seen.add(person.id);
      const current = map.get(person.id);
      if (current) current.specialCount += 1;
      else map.set(person.id, { ...person, rank: 0, specialCount: 1 });
    }
  }
  return [...map.values()]
    .sort((a, b) => b.specialCount - a.specialCount || a.name.localeCompare(b.name, "pl"))
    .slice(0, limit)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export type ShowEpisode = {
  id: number;
  showId: number;
  viewCount: number | null;
  publishedAt: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
};

export type ShowRef = {
  id: number;
  name: string;
  slug: string;
  isActive: boolean;
};

export type ShowRank = {
  rank: number;
  id: number;
  name: string;
  slug: string;
  viewCount: number;
  episodeCount: number;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  latestDate: string | null;
};

export function rankShows(episodes: ShowEpisode[], shows: ShowRef[], limit: number): ShowRank[] {
  const active = new Map(shows.filter((show) => show.isActive).map((show) => [show.id, show]));
  const grouped = new Map<number, { views: number; count: number; latest: ShowEpisode | null }>();
  for (const episode of episodes) {
    if (!active.has(episode.showId)) continue;
    const row = grouped.get(episode.showId) ?? { views: 0, count: 0, latest: null };
    row.views += episode.viewCount ?? 0;
    row.count += 1;
    const latestAt = row.latest?.publishedAt ?? "";
    const nextAt = episode.publishedAt ?? "";
    if (!row.latest || nextAt > latestAt || (nextAt === latestAt && episode.id > row.latest.id)) {
      row.latest = episode;
    }
    grouped.set(episode.showId, row);
  }
  return [...grouped.entries()]
    .map(([showId, row]) => {
      const show = active.get(showId)!;
      return {
        rank: 0,
        id: show.id,
        name: show.name,
        slug: show.slug,
        viewCount: row.views,
        episodeCount: row.count,
        thumbnailUrl: row.latest?.thumbnailUrl ?? null,
        durationSeconds: row.latest?.durationSeconds ?? null,
        latestDate: row.latest?.publishedAt ?? null,
      };
    })
    .sort((a, b) => b.viewCount - a.viewCount || b.episodeCount - a.episodeCount || a.name.localeCompare(b.name, "pl"))
    .slice(0, limit)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export function qualifiesForPeopleViews(input: {
  contentType: string | null;
  categorySlug: string | null;
  viewCount: number | null;
  isSpecial: boolean;
}): boolean {
  return input.contentType === "video"
    && input.viewCount != null
    && input.categorySlug !== "shorts"
    && (input.categorySlug === "standup" || input.isSpecial);
}

function addUtcDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year!, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function diffUtcDays(later: string, earlier: string): number {
  const a = Date.parse(`${later}T00:00:00.000Z`);
  const b = Date.parse(`${earlier}T00:00:00.000Z`);
  return Math.round((a - b) / 86_400_000);
}
