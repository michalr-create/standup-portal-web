import { getYouTubeId } from "./youtube.ts";
import {
  EXCLUDED_SPECIAL_ITEM_ID,
  allocateContentSlug,
  isExcludedSpecialItem,
  isPublicContentSlug,
} from "./slugify.ts";

export type SpecialCandidate = {
  id: number;
  url: string | null;
  externalId: string | null;
  description: string | null;
  durationSeconds: number | null;
  publishedAt: string | null;
};

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/** 11-character YouTube id from the watch URL, then from `external_id`. */
export function youtubeVideoId(url: string | null | undefined, externalId: string | null | undefined): string | null {
  const fromUrl = url ? getYouTubeId(url) : null;
  if (fromUrl && YOUTUBE_ID.test(fromUrl)) return fromUrl;
  const external = externalId?.trim() ?? "";
  if (YOUTUBE_ID.test(external)) return external;
  return null;
}

/** Higher is more complete. A real runtime and a non-empty description each count. */
export function specialCompleteness(item: Pick<SpecialCandidate, "durationSeconds" | "description">): number {
  const duration = item.durationSeconds != null && item.durationSeconds > 0 ? 1 : 0;
  const description = (item.description ?? "").trim().length > 0 ? 1 : 0;
  return duration + description;
}

function publishedTime(value: string | null): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const time = Date.parse(value);
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

/** Negative when `a` should be the public row. Completeness, then older date, then lower id. */
export function compareSpecialCandidates(a: SpecialCandidate, b: SpecialCandidate): number {
  const completeness = specialCompleteness(b) - specialCompleteness(a);
  if (completeness !== 0) return completeness;
  const published = publishedTime(a.publishedAt) - publishedTime(b.publishedAt);
  if (published !== 0) return published;
  return a.id - b.id;
}

export function pickCanonicalSpecial(items: readonly SpecialCandidate[]): SpecialCandidate | null {
  const pool = items.filter((item) => item.id !== EXCLUDED_SPECIAL_ITEM_ID);
  if (pool.length === 0) return null;
  return [...pool].sort(compareSpecialCandidates)[0] ?? null;
}

/**
 * Approved specials that share an 11-character YouTube id publish only the more complete row.
 * Rows without that id are their own group. Id 47 never qualifies.
 */
export function canonicalSpecialIds(items: readonly SpecialCandidate[]): Set<number> {
  const groups = new Map<string, SpecialCandidate[]>();
  for (const item of items) {
    if (isExcludedSpecialItem(item.id)) continue;
    const key = youtubeVideoId(item.url, item.externalId) ?? `row:${item.id}`;
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  const ids = new Set<number>();
  for (const group of groups.values()) {
    const winner = pickCanonicalSpecial(group);
    if (winner) ids.add(winner.id);
  }
  return ids;
}

export type SpecialSlugInput = {
  id: number;
  title: string;
  currentSlug: string | null;
  /** `undefined` on approve/tag sync. A string (possibly empty) when the editor saved the field. */
  explicitSlug?: string | null;
  eligible: boolean;
  taken: Iterable<string>;
};

export type SpecialSlugPlan =
  | { action: "keep" }
  | { action: "set"; slug: string }
  | { action: "clear" }
  | { action: "error"; error: string };

/**
 * Decide the stored slug. Empty editor input on an eligible special allocates from the raw title.
 * Cleaning the display title must not be fed into this function.
 */
export function planSpecialSlug(input: SpecialSlugInput): SpecialSlugPlan {
  if (isExcludedSpecialItem(input.id)) {
    if (typeof input.explicitSlug === "string" && input.explicitSlug.trim()) {
      return {
        action: "error",
        error: "Ten duplikat nie dostaje publicznej strony. Scal go z rekordem kanonicznym.",
      };
    }
    return input.currentSlug ? { action: "clear" } : { action: "keep" };
  }

  if (typeof input.explicitSlug === "string") {
    const raw = input.explicitSlug.trim().toLowerCase();
    if (!raw) {
      if (!input.eligible) return input.currentSlug ? { action: "clear" } : { action: "keep" };
      const allocated = allocateContentSlug(input.title, input.id, input.taken);
      if (!allocated) return { action: "error", error: "Nie udało się ułożyć unikalnego sluga." };
      return allocated === input.currentSlug ? { action: "keep" } : { action: "set", slug: allocated };
    }
    if (!isPublicContentSlug(raw)) {
      return { action: "error", error: "Slug może zawierać tylko małe litery, cyfry i myślniki." };
    }
    if (!input.eligible) {
      return { action: "error", error: "Slug strony jest tylko dla zatwierdzonego specjalu." };
    }
    for (const taken of input.taken) {
      if (taken === raw) return { action: "error", error: "Ten slug jest już zajęty." };
    }
    return raw === input.currentSlug ? { action: "keep" } : { action: "set", slug: raw };
  }

  if (!input.eligible) return input.currentSlug ? { action: "clear" } : { action: "keep" };
  if (input.currentSlug && isPublicContentSlug(input.currentSlug)) return { action: "keep" };
  const allocated = allocateContentSlug(input.title, input.id, input.taken);
  if (!allocated) return { action: "keep" };
  return { action: "set", slug: allocated };
}
