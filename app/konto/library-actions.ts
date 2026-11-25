"use server";

import { favoritePersonSlugs } from "@/lib/events";
import { personSlugRenames, showSlugRenames } from "@/lib/slug-alias-lookup";
import {
  asPositiveId,
  emptyLibrary,
  normalizeIds,
  normalizeLibrary,
  type LibraryLists,
} from "@/lib/library-sync";
import { getServerSupabase } from "@/lib/supabase-server";

const SAVE_ERROR = "Nie udało się zapisać. Spróbuj jeszcze raz.";
const SIGN_IN_ERROR = "Zaloguj się, żeby zapisać to na koncie.";

type LibraryResult = { ok: true; library: LibraryLists } | { ok: false; error: string };
type ToggleResult = { ok: true } | { ok: false; error: string };

const IN_CHUNK = 80;

function chunks<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += size) out.push(items.slice(index, index + size));
  return out;
}

function embedSlug(value: unknown): string | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") return null;
  const slug = (row as { slug?: unknown }).slug;
  return typeof slug === "string" ? slug : null;
}

function embedUrl(value: unknown): string | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") return null;
  const url = (row as { url?: unknown }).url;
  return typeof url === "string" ? url : null;
}

async function requireUser() {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, user: null };
  return { supabase, user: data.user };
}

async function readLibraryForUser(
  supabase: Awaited<ReturnType<typeof getServerSupabase>>,
): Promise<LibraryLists | null> {
  const [peopleRes, showsRes, watchedRes, laterRes] = await Promise.all([
    supabase
      .from("favorite_people")
      .select("person_id, created_at, people(slug)")
      .order("created_at", { ascending: true })
      .limit(100),
    supabase
      .from("favorite_shows")
      .select("show_id, created_at, shows(slug)")
      .order("created_at", { ascending: true })
      .limit(100),
    supabase
      .from("watched_items")
      .select("content_item_id, watched_at, content_items(url)")
      .order("watched_at", { ascending: true })
      .limit(500),
    supabase
      .from("watch_later")
      .select("content_item_id, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  if (peopleRes.error || showsRes.error || watchedRes.error || laterRes.error) {
    console.error("library read", peopleRes.error?.code, showsRes.error?.code, watchedRes.error?.code, laterRes.error?.code);
    return null;
  }

  return normalizeLibrary({
    people: (peopleRes.data ?? []).map((row) => embedSlug(row.people)).filter((slug): slug is string => slug != null),
    shows: (showsRes.data ?? []).map((row) => embedSlug(row.shows)).filter((slug): slug is string => slug != null),
    watched: (watchedRes.data ?? []).map((row) => embedUrl(row.content_items)).filter((url): url is string => url != null),
    later: (laterRes.data ?? []).map((row) => asPositiveId(row.content_item_id)).filter((id): id is number => id != null),
  });
}

async function idsForSlugs(
  supabase: Awaited<ReturnType<typeof getServerSupabase>>,
  table: "people" | "shows",
  slugs: string[],
): Promise<{ ids: number[] } | null> {
  const ids: number[] = [];
  const seen = new Set<number>();
  const push = (value: unknown) => {
    const id = asPositiveId(value);
    if (id == null || seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  };
  const aliasTable = table === "people" ? "people_slug_aliases" : "show_slug_aliases";
  const aliasColumn = table === "people" ? "person_id" : "show_id";
  for (const group of chunks(slugs, IN_CHUNK)) {
    const { data, error } = await supabase.from(table).select("id, slug").in("slug", group);
    if (error) {
      console.error("library slug lookup", table, error.code);
      return null;
    }
    const found = new Set<string>();
    for (const row of data ?? []) {
      push(row.id);
      if (typeof row.slug === "string") found.add(row.slug);
    }
    const missing = group.filter((slug) => !found.has(slug));
    if (missing.length === 0) continue;
    const alias = await supabase.from(aliasTable).select(`${aliasColumn}, slug`).in("slug", missing);
    if (alias.error) {
      console.error("library slug alias", aliasTable, alias.error.code);
      continue;
    }
    for (const row of alias.data ?? []) {
      push((row as Record<string, unknown>)[aliasColumn]);
    }
  }
  return { ids };
}

export async function renameStoredFavoriteSlugs(
  people: string[],
  shows: string[],
): Promise<{ people: Record<string, string>; shows: Record<string, string> }> {
  const [personMap, showMap] = await Promise.all([
    personSlugRenames(favoritePersonSlugs(people)),
    showSlugRenames(favoritePersonSlugs(shows)),
  ]);
  return { people: personMap, shows: showMap };
}

async function contentIdsForUrls(
  supabase: Awaited<ReturnType<typeof getServerSupabase>>,
  urls: string[],
): Promise<{ ids: number[] } | null> {
  const ids: number[] = [];
  for (const group of chunks(urls, IN_CHUNK)) {
    const { data, error } = await supabase
      .from("content_items")
      .select("id, url")
      .eq("status", "approved")
      .in("url", group);
    if (error) {
      console.error("library url lookup", error.code);
      return null;
    }
    for (const row of data ?? []) {
      const id = asPositiveId(row.id);
      if (id != null) ids.push(id);
    }
  }
  return { ids };
}

async function existingContentIds(
  supabase: Awaited<ReturnType<typeof getServerSupabase>>,
  ids: number[],
): Promise<{ ids: number[] } | null> {
  const found: number[] = [];
  for (const group of chunks(ids, IN_CHUNK)) {
    const { data, error } = await supabase
      .from("content_items")
      .select("id")
      .eq("status", "approved")
      .in("id", group);
    if (error) {
      console.error("library item lookup", error.code);
      return null;
    }
    for (const row of data ?? []) {
      const id = asPositiveId(row.id);
      if (id != null) found.push(id);
    }
  }
  return { ids: found };
}

export async function loadAccountLibrary(): Promise<LibraryResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: SIGN_IN_ERROR };
  const library = await readLibraryForUser(supabase);
  if (!library) return { ok: false, error: SAVE_ERROR };
  return { ok: true, library };
}

export async function mergeAccountLibrary(input: LibraryLists): Promise<LibraryResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: SIGN_IN_ERROR };
  const lists = normalizeLibrary(input ?? emptyLibrary());

  const [people, shows, watched, later] = await Promise.all([
    idsForSlugs(supabase, "people", lists.people),
    idsForSlugs(supabase, "shows", lists.shows),
    contentIdsForUrls(supabase, lists.watched),
    existingContentIds(supabase, lists.later),
  ]);
  if (!people || !shows || !watched || !later) return { ok: false, error: SAVE_ERROR };

  const writes = [
    people.ids.length > 0
      ? supabase.from("favorite_people").upsert(
          people.ids.map((personId) => ({ user_id: user.id, person_id: personId })),
          { onConflict: "user_id,person_id", ignoreDuplicates: true },
        )
      : Promise.resolve({ error: null }),
    shows.ids.length > 0
      ? supabase.from("favorite_shows").upsert(
          shows.ids.map((showId) => ({ user_id: user.id, show_id: showId })),
          { onConflict: "user_id,show_id", ignoreDuplicates: true },
        )
      : Promise.resolve({ error: null }),
    watched.ids.length > 0
      ? supabase.from("watched_items").upsert(
          watched.ids.map((contentItemId) => ({ user_id: user.id, content_item_id: contentItemId })),
          { onConflict: "user_id,content_item_id", ignoreDuplicates: true },
        )
      : Promise.resolve({ error: null }),
    later.ids.length > 0
      ? supabase.from("watch_later").upsert(
          later.ids.map((contentItemId) => ({ user_id: user.id, content_item_id: contentItemId })),
          { onConflict: "user_id,content_item_id", ignoreDuplicates: true },
        )
      : Promise.resolve({ error: null }),
  ];

  const saved = await Promise.all(writes);
  if (saved.some((result) => result.error)) {
    console.error("library merge", saved.map((result) => result.error?.code).join(","));
    return { ok: false, error: SAVE_ERROR };
  }

  const library = await readLibraryForUser(supabase);
  if (!library) return { ok: false, error: SAVE_ERROR };
  return { ok: true, library };
}

export async function setFavorite(type: "person" | "show", slug: string, on: boolean): Promise<ToggleResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: SIGN_IN_ERROR };
  const clean = favoritePersonSlugs([slug])[0];
  if (!clean) return { ok: false, error: SAVE_ERROR };

  const table = type === "person" ? "people" : "shows";
  const { data, error } = await supabase.from(table).select("id").eq("slug", clean).maybeSingle();
  if (error) {
    console.error("favorite lookup", error.code);
    return { ok: false, error: SAVE_ERROR };
  }
  let id = asPositiveId(data?.id);
  if (id == null) {
    const aliasTable = type === "person" ? "people_slug_aliases" : "show_slug_aliases";
    const column = type === "person" ? "person_id" : "show_id";
    const alias = await supabase.from(aliasTable).select(column).eq("slug", clean).maybeSingle();
    if (alias.error) console.error("favorite alias", alias.error.code);
    else id = asPositiveId((alias.data as Record<string, unknown> | null)?.[column]);
  }
  if (id == null) return { ok: false, error: type === "person" ? "Nie znaleziono tej osoby." : "Nie znaleziono tego formatu." };

  const column = type === "person" ? "person_id" : "show_id";
  const target = type === "person" ? supabase.from("favorite_people") : supabase.from("favorite_shows");
  const result = on
    ? await target.upsert(
        [{ user_id: user.id, [column]: id }],
        { onConflict: type === "person" ? "user_id,person_id" : "user_id,show_id", ignoreDuplicates: true },
      )
    : await target.delete().eq("user_id", user.id).eq(column, id);

  if (result.error) {
    console.error("favorite write", result.error.code);
    return { ok: false, error: SAVE_ERROR };
  }
  return { ok: true };
}

export async function setWatchLater(contentItemId: number, on: boolean): Promise<ToggleResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: SIGN_IN_ERROR };
  const id = asPositiveId(contentItemId);
  if (id == null) return { ok: false, error: SAVE_ERROR };

  if (!on) {
    const { error } = await supabase.from("watch_later").delete().eq("user_id", user.id).eq("content_item_id", id);
    if (error) {
      console.error("watch later delete", error.code);
      return { ok: false, error: SAVE_ERROR };
    }
    return { ok: true };
  }

  const existing = await existingContentIds(supabase, normalizeIds([id]));
  if (!existing) return { ok: false, error: SAVE_ERROR };
  if (existing.ids.length === 0) return { ok: false, error: "Nie znaleziono tego materiału." };

  const { error } = await supabase.from("watch_later").upsert(
    [{ user_id: user.id, content_item_id: id }],
    { onConflict: "user_id,content_item_id", ignoreDuplicates: true },
  );
  if (error) {
    console.error("watch later write", error.code);
    return { ok: false, error: SAVE_ERROR };
  }
  return { ok: true };
}
