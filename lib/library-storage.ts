import {
  emptyLibrary,
  normalizeIds,
  normalizeUrlList,
  type LibraryLists,
} from "./library-sync.ts";
import { favoritePersonSlugs } from "./events.ts";

/** Same keys the portal already used for logged-out favourites and watch marks. */
export const LIBRARY_STORAGE_KEYS = {
  people: "parska_fav_persons",
  shows: "parska_fav_shows",
  watched: "parska_watched",
  later: "parska_watch_later",
  syncedUser: "parska_library_synced_user",
} as const;

export type KeyValueStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

const USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readJson(store: KeyValueStore, key: string): unknown {
  try {
    const raw = store.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as unknown;
  } catch {
    return [];
  }
}

export function readLibrary(store: KeyValueStore): LibraryLists {
  return {
    people: favoritePersonSlugs(readJson(store, LIBRARY_STORAGE_KEYS.people)),
    shows: favoritePersonSlugs(readJson(store, LIBRARY_STORAGE_KEYS.shows)),
    watched: normalizeUrlList(readJson(store, LIBRARY_STORAGE_KEYS.watched)),
    later: normalizeIds(readJson(store, LIBRARY_STORAGE_KEYS.later)),
  };
}

export function writeLibrary(store: KeyValueStore, lists: LibraryLists): void {
  const people = favoritePersonSlugs(lists.people);
  const shows = favoritePersonSlugs(lists.shows);
  const watched = normalizeUrlList(lists.watched);
  const later = normalizeIds(lists.later);
  store.setItem(LIBRARY_STORAGE_KEYS.people, JSON.stringify(people));
  store.setItem(LIBRARY_STORAGE_KEYS.shows, JSON.stringify(shows));
  store.setItem(LIBRARY_STORAGE_KEYS.watched, JSON.stringify(watched));
  store.setItem(LIBRARY_STORAGE_KEYS.later, JSON.stringify(later));
}

export function readSyncedUser(store: KeyValueStore): string | null {
  try {
    const value = store.getItem(LIBRARY_STORAGE_KEYS.syncedUser)?.trim() ?? "";
    return USER_ID.test(value) ? value.toLowerCase() : null;
  } catch {
    return null;
  }
}

export function writeSyncedUser(store: KeyValueStore, userId: string): void {
  if (!USER_ID.test(userId)) return;
  store.setItem(LIBRARY_STORAGE_KEYS.syncedUser, userId.toLowerCase());
}

export function memoryStore(seed: Record<string, string> = {}): KeyValueStore & { data: Map<string, string> } {
  const data = new Map(Object.entries(seed));
  return {
    data,
    getItem(key) {
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
  };
}

export function libraryOrEmpty(store: KeyValueStore | null): LibraryLists {
  return store ? readLibrary(store) : emptyLibrary();
}
