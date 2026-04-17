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
// QUICK FETCH (RSS — ostatnie 15)
// =============================================

export async function quickFetchSource(sourceId: number) {
  await requireAuth();
  const sb = getAdminSupabase();

  const { data: source } = await sb
    .from("sources")
    .select("*")
    .eq("id", sourceId)
    .single();

  if (!source || !source.feed_url) {
    return { error: "Zrodlo nie ma feed_url", inserted: 0 };
  }

  // Dynamiczny import feedparser nie dziala w Next.js server actions,
  // wiec parsujemy RSS recznie przez fetch + regex
  try {
    const resp = await fetch(source.feed_url);
    if (!resp.ok) return { error: `HTTP ${resp.status}`, inserted: 0 };
    const xml = await resp.text();

    const entries = parseYouTubeRSS(xml);
    const result = await insertNewItems(sb, source, entries);

    await sb
      .from("sources")
      .update({ last_checked_at: new Date().toISOString() })
      .eq("id", sourceId);

    revalidatePath("/admin/zrodla");
    revalidatePath("/admin");
    return { inserted: result.inserted, total: entries.length };
  } catch (e) {
    return { error: String(e), inserted: 0 };
  }
}

function parseYouTubeRSS(xml: string) {
  const entries: {
    external_id: string;
    title: string;
    description: string;
    url: string;
    thumbnail_url: string;
    published_at: string;
    content_type: string;
  }[] = [];

  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];

    const videoId = entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1];
    if (!videoId) continue;

    const title = entry.match(/<title>(.*?)<\/title>/)?.[1] || "";
    const published = entry.match(/<published>(.*?)<\/published>/)?.[1] || "";
    const description = entry.match(/<media:description>([\s\S]*?)<\/media:description>/)?.[1] || "";
    const link = entry.match(/<link rel="alternate" href="(.*?)"/)?.[1] || `https://www.youtube.com/watch?v=${videoId}`;

    const isShort = link.includes("/shorts/");
    const url = isShort ? link : `https://www.youtube.com/watch?v=${videoId}`;

    entries.push({
      external_id: videoId,
      title: decodeXmlEntities(title),
      description: decodeXmlEntities(description).slice(0, 2000),
      url,
      thumbnail_url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      published_at: published,
      content_type: isShort ? "short" : "video",
    });
  }

  return entries;
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

// =============================================
// FULL IMPORT (YouTube Data API — wszystkie filmy)
// =============================================

export async function fullFetchSource(
  sourceId: number,
  pageToken: string | null
): Promise<{
  inserted: number;
  skipped: number;
  hasMore: boolean;
  nextPageToken: string | null;
  error?: string;
}> {
  await requireAuth();
  const sb = getAdminSupabase();

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return { inserted: 0, skipped: 0, hasMore: false, nextPageToken: null, error: "Brak YOUTUBE_API_KEY" };
  }

  const { data: source } = await sb
    .from("sources")
    .select("*")
    .eq("id", sourceId)
    .single();

  if (!source) {
    return { inserted: 0, skipped: 0, hasMore: false, nextPageToken: null, error: "Zrodlo nie znalezione" };
  }

  // Wyciagnij channel_id z feed_url
  const channelIdMatch = source.feed_url?.match(/channel_id=([A-Za-z0-9_-]+)/);
  if (!channelIdMatch) {
    return { inserted: 0, skipped: 0, hasMore: false, nextPageToken: null, error: "Nie znaleziono channel_id w feed_url" };
  }

  const channelId = channelIdMatch[1];
  // Uploads playlist = channel_id z "UC" zamienione na "UU"
  const uploadsPlaylistId = "UU" + channelId.slice(2);

  try {
    let apiUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=50&key=${apiKey}`;
    if (pageToken) {
      apiUrl += `&pageToken=${pageToken}`;
    }

    const resp = await fetch(apiUrl);
    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      const errorMsg = (errorData as { error?: { message?: string } })?.error?.message || `HTTP ${resp.status}`;
      return { inserted: 0, skipped: 0, hasMore: false, nextPageToken: null, error: errorMsg };
    }

    const data = await resp.json() as {
      items: {
        snippet: {
          title: string;
          description: string;
          publishedAt: string;
          resourceId: { videoId: string };
          thumbnails?: { high?: { url: string } };
        };
      }[];
      nextPageToken?: string;
    };

    const entries = (data.items || []).map((item) => {
      const videoId = item.snippet.resourceId.videoId;
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      return {
        external_id: videoId,
        title: item.snippet.title,
        description: (item.snippet.description || "").slice(0, 2000),
        url,
        thumbnail_url: item.snippet.thumbnails?.high?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        published_at: item.snippet.publishedAt,
        content_type: "video" as const,
      };
    });

    const result = await insertNewItems(sb, source, entries);

    await sb
      .from("sources")
      .update({ last_checked_at: new Date().toISOString() })
      .eq("id", sourceId);

    const hasMore = !!data.nextPageToken;

    if (!hasMore) {
      revalidatePath("/admin/zrodla");
      revalidatePath("/admin");
    }

    return {
      inserted: result.inserted,
      skipped: result.skipped,
      hasMore,
      nextPageToken: data.nextPageToken || null,
    };
  } catch (e) {
    return { inserted: 0, skipped: 0, hasMore: false, nextPageToken: null, error: String(e) };
  }
}

// =============================================
// SHARED: wstawianie nowych wpisow z auto-tagami
// =============================================

async function insertNewItems(
  sb: ReturnType<typeof getAdminSupabase>,
  source: { id: number; show_id: number | null; type: string },
  entries: {
    external_id: string;
    title: string;
    description: string;
    url: string;
    thumbnail_url: string;
    published_at: string;
    content_type: string;
  }[]
) {
  if (entries.length === 0) return { inserted: 0, skipped: 0 };

  // Pobierz istniejace external_ids
  const { data: existing } = await sb
    .from("content_items")
    .select("external_id")
    .eq("source_id", source.id);

  const existingIds = new Set((existing || []).map((e) => e.external_id));

  const newEntries = entries.filter((e) => !existingIds.has(e.external_id));
  if (newEntries.length === 0) return { inserted: 0, skipped: entries.length };

  // Kategoria
  let categoryId: number | null = null;

  if (source.show_id) {
    const { data: show } = await sb
      .from("shows")
      .select("category_id")
      .eq("id", source.show_id)
      .single();
    categoryId = show?.category_id || null;
  }

  if (!categoryId) {
    const slug = source.type === "youtube" ? "standup" : source.type === "podcast" ? "formaty" : null;
    if (slug) {
      const { data: cat } = await sb
        .from("categories")
        .select("id")
        .eq("slug", slug)
        .single();
      categoryId = cat?.id || null;
    }
  }

  // Shorts kategoria
  const { data: shortsCat } = await sb
    .from("categories")
    .select("id")
    .eq("slug", "shorts")
    .single();

  const shortsCategoryId = shortsCat?.id || null;

  // Wstaw wpisy
  const rows = newEntries.map((e) => {
    const isShort = e.url.includes("/shorts/") || e.content_type === "short";
    return {
      source_id: source.id,
      external_id: e.external_id,
      title: e.title,
      description: e.description,
      url: e.url,
      thumbnail_url: e.thumbnail_url,
      published_at: e.published_at,
      content_type: isShort ? "short" : e.content_type,
      status: "pending",
      category_id: isShort && shortsCategoryId ? shortsCategoryId : categoryId,
      show_id: source.show_id,
    };
  });

  const { data: inserted } = await sb
    .from("content_items")
    .insert(rows)
    .select("id");

  // Auto-tagi person
  const { data: defaults } = await sb
    .from("source_default_people")
    .select("person_id")
    .eq("source_id", source.id);

  const personIds = (defaults || []).map((d) => d.person_id);

  if (personIds.length > 0 && inserted && inserted.length > 0) {
    const { data: personTags } = await sb
      .from("tags")
      .select("id")
      .eq("tag_type", "person")
      .in("person_id", personIds);

    const tagIds = (personTags || []).map((t) => t.id);

    if (tagIds.length > 0) {
      const contentTagRows: { content_item_id: number; tag_id: number }[] = [];
      for (const item of inserted) {
        for (const tagId of tagIds) {
          contentTagRows.push({ content_item_id: item.id, tag_id: tagId });
        }
      }
      // Wstawiaj partiami po 500 (limit Supabase)
      for (let i = 0; i < contentTagRows.length; i += 500) {
        await sb.from("content_tags").insert(contentTagRows.slice(i, i + 500));
      }
    }
  }

  return { inserted: inserted?.length || 0, skipped: entries.length - newEntries.length };
}
