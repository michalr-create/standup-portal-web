import { favoritePersonSlugs } from "./events.ts";
import { PUBLIC_SLUG } from "./slugify.ts";

/** Personal lists kept in localStorage and, once merged, on the account. */
export type LibraryLists = {
  people: string[];
  shows: string[];
  watched: string[];
  later: number[];
};

export const WATCHED_CAP = 500;
export const LATER_CAP = 200;

export type LibrarySyncPlan =
  | { kind: "local" }
  | { kind: "merge"; reason: "first-login" }
  | { kind: "account"; reason: "already-merged" | "other-account" };

export function emptyLibrary(): LibraryLists {
  return { people: [], shows: [], watched: [], later: [] };
}

/**
 * First login on this browser unions localStorage into the account.
 * After that the account wins, including when another account was the last
 * one to sync here (its cache must not be copied onto the new login).
 * Logged-out browsing stays on localStorage.
 */
export function planLibrarySync(input: {
  userId: string | null;
  syncedUserId: string | null;
}): LibrarySyncPlan {
  if (!input.userId) return { kind: "local" };
  if (!input.syncedUserId) return { kind: "merge", reason: "first-login" };
  if (input.syncedUserId === input.userId) return { kind: "account", reason: "already-merged" };
  return { kind: "account", reason: "other-account" };
}

export function normalizeUrlList(raw: unknown, cap = WATCHED_CAP): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of raw) {
    if (typeof value !== "string") continue;
    const url = value.trim();
    if (!url || url.length > 500 || seen.has(url)) continue;
    if (!/^https?:\/\//i.test(url)) continue;
    seen.add(url);
    out.push(url);
    if (out.length >= cap) break;
  }
  return out;
}

export function normalizeIds(raw: unknown, cap = LATER_CAP): number[] {
  if (!Array.isArray(raw)) return [];
  const out: number[] = [];
  const seen = new Set<number>();
  for (const value of raw) {
    const id = asPositiveId(value);
    if (id == null || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= cap) break;
  }
  return out;
}

export function asPositiveId(value: unknown): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return value;
  if (typeof value === "string" && /^[1-9]\d*$/.test(value)) {
    const id = Number(value);
    return Number.isSafeInteger(id) ? id : null;
  }
  return null;
}

export function normalizeLibrary(lists: LibraryLists): LibraryLists {
  return {
    people: favoritePersonSlugs(lists.people),
    shows: favoritePersonSlugs(lists.shows),
    watched: normalizeUrlList(lists.watched),
    later: normalizeIds(lists.later),
  };
}

/** Union, local order first, then remote-only values. No duplicates. */
export function mergeUnique(local: readonly string[], remote: readonly string[], cap: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of [...local, ...remote]) {
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
    if (out.length >= cap) break;
  }
  return out;
}

export function mergeIds(local: readonly number[], remote: readonly number[], cap = LATER_CAP): number[] {
  return mergeUnique(
    local.map(String),
    remote.map(String),
    cap,
  ).map((value) => Number(value));
}

export function mergeLibraries(local: LibraryLists, remote: LibraryLists): LibraryLists {
  const left = normalizeLibrary(local);
  const right = normalizeLibrary(remote);
  return {
    people: mergeUnique(left.people, right.people, 100),
    shows: mergeUnique(left.shows, right.shows, 100),
    watched: mergeUnique(left.watched, right.watched, WATCHED_CAP),
    later: mergeIds(left.later, right.later),
  };
}

export function resolveLibrary(
  plan: LibrarySyncPlan,
  local: LibraryLists,
  remote: LibraryLists,
): LibraryLists {
  if (plan.kind === "local") return normalizeLibrary(local);
  if (plan.kind === "merge") return mergeLibraries(local, remote);
  return normalizeLibrary(remote);
}

function applyStringDelta(base: readonly string[], before: readonly string[], after: readonly string[], cap: number): string[] {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  const removed = new Set(before.filter((value) => !afterSet.has(value)));
  const added = after.filter((value) => !beforeSet.has(value));
  return mergeUnique(
    base.filter((value) => !removed.has(value)),
    added,
    cap,
  );
}

/**
 * Keep `base` (usually the account), then replay only the edits that happened
 * while the request was in flight. Logged-out leftovers that were already in
 * `before` are not copied back.
 */
export function applyLibraryDelta(base: LibraryLists, before: LibraryLists, after: LibraryLists): LibraryLists {
  const nextBase = normalizeLibrary(base);
  const previous = normalizeLibrary(before);
  const current = normalizeLibrary(after);
  return {
    people: applyStringDelta(nextBase.people, previous.people, current.people, 100),
    shows: applyStringDelta(nextBase.shows, previous.shows, current.shows, 100),
    watched: applyStringDelta(nextBase.watched, previous.watched, current.watched, WATCHED_CAP),
    later: applyStringDelta(
      nextBase.later.map(String),
      previous.later.map(String),
      current.later.map(String),
      LATER_CAP,
    ).map((value) => Number(value)),
  };
}

/** Point stored favorites at the current slug. The same list comes back unchanged. */
export function applySlugRenames(
  lists: LibraryLists,
  people: Readonly<Record<string, string>>,
  shows: Readonly<Record<string, string>>,
): LibraryLists {
  const nextPeople = renameSlugList(lists.people, people);
  const nextShows = renameSlugList(lists.shows, shows);
  if (sameStrings(nextPeople, lists.people) && sameStrings(nextShows, lists.shows)) return lists;
  return { ...lists, people: nextPeople, shows: nextShows };
}

function renameSlugList(values: readonly string[], renames: Readonly<Record<string, string>>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const mapped = renames[value];
    const next = mapped && PUBLIC_SLUG.test(mapped) ? mapped : value;
    if (seen.has(next)) continue;
    seen.add(next);
    out.push(next);
  }
  return out;
}

export function sameLibrary(left: LibraryLists, right: LibraryLists): boolean {
  const a = normalizeLibrary(left);
  const b = normalizeLibrary(right);
  return (
    sameStrings(a.people, b.people) &&
    sameStrings(a.shows, b.shows) &&
    sameStrings(a.watched, b.watched) &&
    sameStrings(a.later.map(String), b.later.map(String))
  );
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}
