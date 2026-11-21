import type { Item } from "./data.ts";
import { getYouTubeId } from "./youtube.ts";

/** Homepage query that opens one approved item in VideoModal. */
export const FILM_QUERY = "film";
/** YouTube id so the player can start before the item request returns. */
export const FILM_VIDEO_QUERY = "v";
/** How the visitor arrived. Push notifications send `push`. */
export const FILM_SOURCE_QUERY = "zrodlo";
export const FILM_SOURCE_PUSH = "push";

const SHARE_VIDEO_ID = /^[A-Za-z0-9_-]{1,64}$/;

export function parseFilmId(value: string | null | undefined): number | null {
  if (!value || !/^[1-9]\d{0,15}$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

/** Raw YouTube id safe to put in an embed URL. Rejects spaces, slashes, and queries. */
export function parseShareVideoId(value: string | null | undefined): string | null {
  if (!value || !SHARE_VIDEO_ID.test(value)) return null;
  return value;
}

export function filmDeepLink(id: number, videoId: string): string {
  return `/?${FILM_QUERY}=${id}&${FILM_VIDEO_QUERY}=${encodeURIComponent(videoId)}&${FILM_SOURCE_QUERY}=${FILM_SOURCE_PUSH}`;
}

/**
 * In-app player for one unpaid YouTube video.
 * Paid items and anything that is not YouTube keep their own URL.
 */
export function contentPlayerPath(item: { id: number; url: string; isPaid: boolean }): string | null {
  if (item.isPaid) return null;
  if (!Number.isSafeInteger(item.id) || item.id <= 0) return null;
  const videoId = getYouTubeId(item.url.trim());
  if (!videoId || parseShareVideoId(videoId) !== videoId) return null;
  return filmDeepLink(item.id, videoId);
}

/** Drop the deep-link params and keep the rest of the address, including the hash. */
export function withoutFilmQuery(href: string): string {
  const url = new URL(href, "http://localhost");
  url.searchParams.delete(FILM_QUERY);
  url.searchParams.delete(FILM_VIDEO_QUERY);
  url.searchParams.delete(FILM_SOURCE_QUERY);
  const query = url.searchParams.toString();
  return `${url.pathname}${query ? `?${query}` : ""}${url.hash}`;
}

function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function personOf(value: unknown): { name: string; slug: string } | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.name !== "string" || !row.name.trim()) return null;
  return { name: row.name, slug: typeof row.slug === "string" ? row.slug : "" };
}

/** A catalog row from `/api/film/:id`. Incomplete JSON is not an item. */
export function readFilmItem(value: unknown): Item | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const id = typeof row.id === "number" && Number.isSafeInteger(row.id) && row.id > 0 ? row.id : null;
  if (id == null || typeof row.title !== "string" || typeof row.url !== "string") return null;
  const people = Array.isArray(row.people)
    ? row.people.map(personOf).filter((person): person is { name: string; slug: string } => person != null)
    : [];
  return {
    id,
    title: row.title,
    url: row.url,
    thumbnail_url: text(row.thumbnail_url),
    published_at: text(row.published_at),
    source_id: typeof row.source_id === "number" ? row.source_id : 0,
    show_id: typeof row.show_id === "number" ? row.show_id : null,
    category_id: typeof row.category_id === "number" ? row.category_id : null,
    episode_group_id: text(row.episode_group_id),
    duration_seconds: typeof row.duration_seconds === "number" ? row.duration_seconds : null,
    is_paid: row.is_paid === true,
    showName: text(row.showName),
    showSlug: text(row.showSlug),
    categoryName: text(row.categoryName),
    categorySlug: text(row.categorySlug),
    people,
    tags: [],
  };
}

export function readFilmPayload(value: unknown): Item | null {
  if (!value || typeof value !== "object") return null;
  return readFilmItem((value as { item?: unknown }).item);
}

/** Placeholder until `/api/film/:id` fills in the title and the people. */
export function stubFilmItem(id: number, videoId: string): Item {
  return {
    id,
    title: "Film",
    url: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnail_url: null,
    published_at: null,
    source_id: 0,
    show_id: null,
    category_id: null,
    episode_group_id: null,
    duration_seconds: null,
    is_paid: false,
    showName: null,
    showSlug: null,
    categoryName: null,
    categorySlug: null,
    people: [],
    tags: [],
  };
}
