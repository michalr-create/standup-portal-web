"use server";

import { getAdminSupabase } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

// =============================================
// SOURCES CRUD
// =============================================

export async function getAllSourcesAdmin() {
  await requireAuth();
  const sb = getAdminSupabase();

  const { data: sources } = await sb
    .from("sources")
    .select("*")
    .order("name");

  // Policz wpisy per source
  const { data: counts } = await sb
    .from("content_items")
    .select("source_id")
    .not("source_id", "is", null);

  const countMap = new Map<number, number>();
  for (const row of counts || []) {
    countMap.set(row.source_id, (countMap.get(row.source_id) || 0) + 1);
  }

  // Pobierz show names
  const showIds = Array.from(new Set((sources || []).map((s) => s.show_id).filter(Boolean)));
  const { data: shows } = showIds.length > 0
    ? await sb.from("shows").select("id, name").in("id", showIds)
    : { data: [] };
  const showsMap = new Map((shows || []).map((s) => [s.id, s.name]));

  // Pobierz default people per source
  const { data: defaults } = await sb
    .from("source_default_people")
    .select("source_id, person_id");

  const defaultPeopleMap = new Map<number, number[]>();
  for (const d of defaults || []) {
    if (!defaultPeopleMap.has(d.source_id)) {
      defaultPeopleMap.set(d.source_id, []);
    }
    defaultPeopleMap.get(d.source_id)!.push(d.person_id);
  }

  return (sources || []).map((s) => ({
    ...s,
    itemCount: countMap.get(s.id) || 0,
    showName: s.show_id ? showsMap.get(s.show_id) || null : null,
    defaultPersonIds: defaultPeopleMap.get(s.id) || [],
  }));
}

export async function createSource(data: {
  name: string;
  type: string;
  url: string;
  feed_url: string;
  show_id: number | null;
  is_watch_source: boolean;
  default_person_ids: number[];
}) {
  await requireAuth();
  const sb = getAdminSupabase();

  const { data: source, error } = await sb
    .from("sources")
    .insert({
      name: data.name,
      type: data.type,
      url: data.url,
      feed_url: data.feed_url,
      show_id: data.show_id,
      is_active: true,
      is_watch_source: data.is_watch_source,
    })
    .select("id")
    .single();

  if (error || !source) {
    return { error: error?.message || "Blad tworzenia source" };
  }

  // Dodaj default people
  if (data.default_person_ids.length > 0) {
    const rows = data.default_person_ids.map((pid) => ({
      source_id: source.id,
      person_id: pid,
    }));
    await sb.from("source_default_people").insert(rows);
  }

  revalidatePath("/admin/zrodla");
  return { success: true, id: source.id };
}

export async function toggleSourceActive(sourceId: number, isActive: boolean) {
  await requireAuth();
  const sb = getAdminSupabase();

  await sb
    .from("sources")
    .update({ is_active: isActive })
    .eq("id", sourceId);

  revalidatePath("/admin/zrodla");
}

// =============================================
// METADATA FETCHING
// =============================================

export async function fetchUrlMetadata(url: string) {
  await requireAuth();

  try {
    // YouTube video
    if (url.includes("youtube.com/watch") || url.includes("youtu.be/") || url.includes("youtube.com/shorts/")) {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const resp = await fetch(oembedUrl);
      if (resp.ok) {
        const data = await resp.json();
        // Wyciagnij video ID dla miniaturki
        let videoId = "";
        const match = url.match(/(?:v=|\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (match) videoId = match[1];

        return {
          title: data.title || "",
          description: "",
          thumbnail_url: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : (data.thumbnail_url || ""),
          author: data.author_name || "",
          published_at: null,
        };
      }
    }

    // Fallback: OpenGraph z dowolnej strony
    const resp = await fetch(url, {
      headers: { "User-Agent": "parska-bot/1.0" },
      redirect: "follow",
    });

    if (!resp.ok) {
      return { title: "", description: "", thumbnail_url: "", author: "", published_at: null };
    }

    const html = await resp.text();

    const getMetaContent = (html: string, property: string): string => {
      const patterns = [
        new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, "i"),
        new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`, "i"),
        new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*)["']`, "i"),
        new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${property}["']`, "i"),
      ];
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) return match[1];
      }
      return "";
    };

    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);

    return {
      title: getMetaContent(html, "og:title") || (titleMatch ? titleMatch[1] : ""),
      description: getMetaContent(html, "og:description") || getMetaContent(html, "description"),
      thumbnail_url: getMetaContent(html, "og:image"),
      author: getMetaContent(html, "og:site_name"),
      published_at: null,
    };
  } catch (e) {
    console.error("Blad pobierania metadanych:", e);
    return { title: "", description: "", thumbnail_url: "", author: "", published_at: null };
  }
}

// =============================================
// MANUAL ENTRY
// =============================================

export async function createManualEntry(data: {
  url: string;
  title: string;
  description: string;
  thumbnail_url: string;
  category_id: number | null;
  show_id: number | null;
  person_tag_ids: number[];
  content_type: string;
  published_at: string | null;
}) {
  await requireAuth();
  const sb = getAdminSupabase();

  // Sprawdz duplikat URL
  const { data: existing } = await sb
    .from("content_items")
    .select("id, title")
    .eq("url", data.url)
    .limit(1);

  if (existing && existing.length > 0) {
    return { error: `Ten URL juz istnieje w bazie: "${existing[0].title}"` };
  }

  // Znajdz source Manual entry
  const { data: manualSource } = await sb
    .from("sources")
    .select("id")
    .eq("type", "manual")
    .limit(1)
    .single();

  if (!manualSource) {
    return { error: "Brak source Manual entry w bazie" };
  }

  // Okresl content_type jesli nie podany
  let contentType = data.content_type;
  if (!contentType) {
    if (data.url.includes("youtube.com") || data.url.includes("youtu.be")) {
      contentType = data.url.includes("/shorts/") ? "short" : "video";
    } else if (data.url.includes("spotify.com") || data.url.includes("podcasts.apple.com")) {
      contentType = "podcast_episode";
    } else {
      contentType = "video";
    }
  }

  const { data: item, error } = await sb
    .from("content_items")
    .insert({
      source_id: manualSource.id,
      external_id: `manual_${Date.now()}`,
      url: data.url,
      title: data.title,
      description: data.description || "",
      thumbnail_url: data.thumbnail_url || "",
      category_id: data.category_id,
      show_id: data.show_id,
      content_type: contentType,
      published_at: data.published_at || new Date().toISOString(),
      status: "approved",
      is_manual: true,
    })
    .select("id")
    .single();

  if (error || !item) {
    return { error: error?.message || "Blad tworzenia wpisu" };
  }

  // Dodaj tagi person
  if (data.person_tag_ids.length > 0) {
    const rows = data.person_tag_ids.map((tagId) => ({
      content_item_id: item.id,
      tag_id: tagId,
    }));
    await sb.from("content_tags").insert(rows);
  }

  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true, id: item.id };
}
// =============================================
// SOURCE UPDATE
// =============================================

export async function updateSourceDefaultPeople(sourceId: number, personIds: number[]) {
  await requireAuth();
  const sb = getAdminSupabase();

  // Usun istniejace
  await sb
    .from("source_default_people")
    .delete()
    .eq("source_id", sourceId);

  // Wstaw nowe
  if (personIds.length > 0) {
    const rows = personIds.map((pid) => ({
      source_id: sourceId,
      person_id: pid,
    }));
    await sb.from("source_default_people").insert(rows);
  }

  revalidatePath("/admin/zrodla");
}

export async function updateSource(sourceId: number, data: {
  name?: string;
  show_id?: number | null;
  is_watch_source?: boolean;
}) {
  await requireAuth();
  const sb = getAdminSupabase();

  await sb
    .from("sources")
    .update(data)
    .eq("id", sourceId);

  revalidatePath("/admin/zrodla");
}

// =============================================
// PEOPLE CRUD (quick)
// =============================================

export async function createPerson(data: {
  name: string;
  slug: string;
  role: string;
}) {
  await requireAuth();
  const sb = getAdminSupabase();

  // Sprawdz czy slug nie jest zajety
  const { data: existing } = await sb
    .from("people")
    .select("id")
    .eq("slug", data.slug)
    .limit(1);

  if (existing && existing.length > 0) {
    return { error: `Slug "${data.slug}" jest juz zajety` };
  }

  const { data: person, error } = await sb
    .from("people")
    .insert({
      name: data.name,
      slug: data.slug,
      role: data.role || "standuper",
      is_active: true,
    })
    .select("id, name, slug")
    .single();

  if (error || !person) {
    return { error: error?.message || "Blad tworzenia osoby" };
  }

  // Auto-tworzenie tagu person
  await sb.from("tags").insert({
    name: person.name,
    slug: person.slug,
    tag_type: "person",
    person_id: person.id,
  });

  revalidatePath("/admin/zrodla");
  revalidatePath("/admin/standuperzy");
  revalidatePath("/admin");
  return { success: true, person };
}

export async function getAllPeopleAdmin() {
  await requireAuth();
  const sb = getAdminSupabase();

  const { data } = await sb
    .from("people")
    .select("id, name, slug, role, is_active")
    .order("name");

  return data || [];
}
