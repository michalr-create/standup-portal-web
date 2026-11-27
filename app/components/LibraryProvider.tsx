"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  loadAccountLibrary,
  mergeAccountLibrary,
  renameStoredFavoriteSlugs,
  setFavorite,
  setWatchLater,
} from "@/app/konto/library-actions";
import {
  applyLibraryDelta,
  applySlugRenames,
  emptyLibrary,
  planLibrarySync,
  resolveLibrary,
  sameLibrary,
  type LibraryLists,
} from "@/lib/library-sync";
import { favoritePersonSlugs } from "@/lib/events";
import { hasConsent, CONSENT_CHANGED_EVENT } from "@/lib/consent";
import {
  clearAccountLibrary,
  libraryOrEmpty,
  readLibrary,
  readSyncedUser,
  writeLibrary,
  writeSyncedUser,
  type KeyValueStore,
} from "@/lib/library-storage";

type LibraryController = {
  ready: boolean;
  signedIn: boolean;
  people: string[];
  shows: string[];
  later: number[];
  toggleFavorite: (type: "person" | "show", slug: string) => void;
  toggleWatchLater: (contentItemId: number) => void;
};

const LibraryContext = createContext<LibraryController | null>(null);

export function useLibrary(): LibraryController {
  const value = useContext(LibraryContext);
  if (!value) {
    throw new Error("LibraryProvider is missing");
  }
  return value;
}

export function useLibraryOptional(): LibraryController | null {
  return useContext(LibraryContext);
}

function browserStore(): KeyValueStore | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function replaceList(lists: LibraryLists, key: "people" | "shows", value: string, on: boolean): LibraryLists {
  const current = lists[key];
  const has = current.includes(value);
  if (on === has) return lists;
  return { ...lists, [key]: on ? [...current, value] : current.filter((item) => item !== value) };
}

export default function LibraryProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<LibraryLists>(emptyLibrary);
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signedInRef = useRef(false);
  const snapshotRef = useRef(snapshot);
  const runId = useRef(0);
  const mutationGen = useRef(0);
  snapshotRef.current = snapshot;

  const commit = useCallback((next: LibraryLists) => {
    snapshotRef.current = next;
    setSnapshot(next);
    const store = browserStore();
    if (store && (signedInRef.current || hasConsent("functional"))) writeLibrary(store, next);
  }, []);

  const fail = useCallback((message: string, generation: number) => {
    if (mutationGen.current !== generation) return;
    setError(message);
    void loadAccountLibrary().then((fresh) => {
      if (mutationGen.current !== generation || !fresh.ok) return;
      commit(fresh.library);
    });
  }, [commit]);

  useEffect(() => {
    const store = browserStore();
    if (store && hasConsent("functional")) setSnapshot(readLibrary(store));

    const supabaseModule = import("@/lib/supabase-browser");
    let unsubscribe = () => {};
    let cancelled = false;

    void supabaseModule.then(({ getBrowserSupabase }) => {
      if (cancelled) return;
      const supabase = getBrowserSupabase();

      const run = (userId: string | null, event: string) => {
        if (cancelled) return;
        const id = ++runId.current;
        const currentStore = browserStore();
        if (!userId) {
          signedInRef.current = false;
          setSignedIn(false);
          // INITIAL_SESSION covers a hard reload after the sign-out route.
          // SIGNED_OUT covers a session that ends in this tab. Other null
          // events must not wipe a cache that a later session event still needs.
          const sessionEnded = event === "INITIAL_SESSION" || event === "SIGNED_OUT";
          if (currentStore && sessionEnded && clearAccountLibrary(currentStore)) {
            snapshotRef.current = emptyLibrary();
            setSnapshot(emptyLibrary());
          } else {
            commit(libraryOrEmpty(currentStore));
          }
          void (async () => {
            const base = snapshotRef.current;
            let next = base;
            try {
              const renames = await renameStoredFavoriteSlugs(base.people, base.shows);
              if (cancelled || runId.current !== id) return;
              next = applySlugRenames(snapshotRef.current, renames.people, renames.shows);
            } catch {
              next = snapshotRef.current;
            }
            if (cancelled || runId.current !== id) return;
            if (next !== snapshotRef.current) commit(next);
            setReady(true);
          })();
          return;
        }

        signedInRef.current = true;
        setSignedIn(true);
        const plan = planLibrarySync({
          userId,
          syncedUserId: currentStore ? readSyncedUser(currentStore) : null,
        });
        const localAtStart = libraryOrEmpty(browserStore());
        const generationAtStart = mutationGen.current;

        void (async () => {
          const remote = await loadAccountLibrary();
          if (cancelled || runId.current !== id) return;
          if (!remote.ok) {
            setError(remote.error);
            setReady(true);
            return;
          }

          let resolved = resolveLibrary(plan, localAtStart, remote.library);
          if (plan.kind === "merge") {
            const saved = await mergeAccountLibrary(resolved);
            if (cancelled || runId.current !== id) return;
            if (!saved.ok) {
              setError(saved.error);
              setReady(true);
              return;
            }
            resolved = saved.library;
          }

          const during = libraryOrEmpty(browserStore());
          resolved = applyLibraryDelta(resolved, localAtStart, during);
          if (plan.kind === "merge" && !sameLibrary(resolved, remote.library)) {
            const again = await mergeAccountLibrary(resolved);
            if (cancelled || runId.current !== id) return;
            if (again.ok) {
              resolved = applyLibraryDelta(again.library, during, libraryOrEmpty(browserStore()));
            }
          } else if (
            plan.kind === "account" &&
            mutationGen.current !== generationAtStart &&
            !sameLibrary(resolved, remote.library)
          ) {
            const again = await mergeAccountLibrary(resolved);
            if (!cancelled && runId.current === id && again.ok) {
              resolved = applyLibraryDelta(again.library, during, libraryOrEmpty(browserStore()));
            }
          }

          if (cancelled || runId.current !== id) return;
          try {
            const renames = await renameStoredFavoriteSlugs(resolved.people, resolved.shows);
            if (cancelled || runId.current !== id) return;
            resolved = applySlugRenames(resolved, renames.people, renames.shows);
          } catch {
            // The account list is already on current slugs when the alias read fails.
          }
          if (cancelled || runId.current !== id) return;
          const markerStore = browserStore();
          if (markerStore) {
            writeLibrary(markerStore, resolved);
            writeSyncedUser(markerStore, userId);
          }
          snapshotRef.current = resolved;
          setSnapshot(resolved);
          setReady(true);
        })();
      };

      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        const userId = session?.user.id ?? null;
        setTimeout(() => run(userId, event), 0);
      });
      unsubscribe = () => data.subscription.unsubscribe();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [commit]);

  useEffect(() => {
    const onConsent = () => {
      if (signedInRef.current) return;
      const currentStore = browserStore();
      if (!currentStore) return;
      const next = hasConsent("functional") ? readLibrary(currentStore) : emptyLibrary();
      snapshotRef.current = next;
      setSnapshot(next);
    };
    document.addEventListener(CONSENT_CHANGED_EVENT, onConsent);
    return () => document.removeEventListener(CONSENT_CHANGED_EVENT, onConsent);
  }, []);

  const toggleFavorite = useCallback((type: "person" | "show", slug: string) => {
    const clean = favoritePersonSlugs([slug])[0];
    if (!clean) return;
    const key = type === "person" ? "people" : "shows";
    const previous = snapshotRef.current;
    const on = !previous[key].includes(clean);
    const next = replaceList(previous, key, clean, on);
    if (next === previous) return;
    const generation = ++mutationGen.current;
    commit(next);
    if (!signedInRef.current) return;
    void setFavorite(type, clean, on).then((result) => {
      if (!result.ok) fail(result.error, generation);
    });
  }, [commit, fail]);

  const toggleWatchLater = useCallback((contentItemId: number) => {
    if (!Number.isSafeInteger(contentItemId) || contentItemId <= 0) return;
    const previous = snapshotRef.current;
    const on = !previous.later.includes(contentItemId);
    const later = on
      ? [contentItemId, ...previous.later.filter((id) => id !== contentItemId)]
      : previous.later.filter((id) => id !== contentItemId);
    const generation = ++mutationGen.current;
    commit({ ...previous, later });
    if (!signedInRef.current) return;
    void setWatchLater(contentItemId, on).then((result) => {
      if (!result.ok) fail(result.error, generation);
    });
  }, [commit, fail]);

  const value = useMemo<LibraryController>(() => ({
    ready,
    signedIn,
    people: snapshot.people,
    shows: snapshot.shows,
    later: snapshot.later,
    toggleFavorite,
    toggleWatchLater,
  }), [ready, signedIn, snapshot, toggleFavorite, toggleWatchLater]);

  return (
    <LibraryContext.Provider value={value}>
      {children}
      {error && (
        <div
          role="alert"
          className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-semibold"
          style={{ background: "var(--ink-2)", color: "var(--paper)", border: "1px solid var(--coral)" }}
        >
          <span>{error}</span>
          <button
            type="button"
            className="inline-flex min-h-11 shrink-0 items-center rounded-full px-3 font-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]"
            style={{ color: "var(--coral)" }}
            onClick={() => setError(null)}
          >
            Zamknij
          </button>
        </div>
      )}
    </LibraryContext.Provider>
  );
}
