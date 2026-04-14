import { supabase } from "@/lib/supabase";

export type Item = {
  id: number;
  title: string;
  url: string;
  thumbnail_url: string | null;
  published_at: string | null;
  source_id: number;
  sourceName: string;
  comedianName: string;
  comedianSlug: string | null;
};

export type Comedian = {
  id: number;
  name: string;
  slug: string;
};

async function hydrateItems(rawItems: {
  id: number;
  title: string;
  url: string;
  thumbnail_url: string | null;
  published_at: string | null;
  source_id: number;
}[]): Promise<Item[]> {
  if (rawItems.length === 0) return [];

  const sourceIds = Array.from(new Set(rawItems.map((i) => i.source_id)));

  const { data: sources } = await supabase
    .from("sources")
    .select("id, name, comedian_id")
    .in("id", sourceIds);

  const comedianIds = Array.from(
    new Set(
      (sources || [])
        .map((s) => s.comedian_id)
        .filter((id): id is number => id !== null)
    )
  );

  const { data: comedians } =
    comedianIds.length > 0
      ? await supabase
          .from("comedians")
          .select("id, name, slug")
          .in("id", comedianIds)
      : { data: [] };

  const sourcesMap = new Map((sources || []).map((s) => [s.id, s]));
  const comediansMap = new Map((comedians || []).map((c) => [c.id, c]));

  return rawItems.map((item) => {
    const source = sourcesMap.get(item.source_id);
    const comedian = source?.comedian_id
      ? comediansMap.get(source.comedian_id)
      : null;

    return {
      id: item.id,
      title: item.title,
      url: item.url,
      thumbnail_url: item.thumbnail_url,
      published_at: item.published_at,
      source_id: item.source_id,
      sourceName: source?.name || "",
      comedianName: comedian?.name || source?.name || "",
      comedianSlug: comedian?.slug || null,
    };
  });
}

export async function getAllApprovedItems(): Promise<Item[]> {
  const { data: items, error } = await supabase
    .from("content_items")
    .select("id, title, url, thumbnail_url, published_at, source_id")
    .eq("status", "approved")
    .order("published_at", { ascending: false })
    .limit(200);

  if (error || !items) {
    console.error("Blad pobierania items:", error);
    return [];
  }

  return hydrateItems(items);
}

export async function getItemsByComedianSlug(slug: string): Promise<Item[]> {
  const { data: comedian } = await supabase
    .from("comedians")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (!comedian) return [];

  const { data: sources } = await supabase
    .from("sources")
    .select("id")
    .eq("comedian_id", comedian.id);

  if (!sources || sources.length === 0) return [];

  const sourceIds = sources.map((s) => s.id);

  const { data: items, error } = await supabase
    .from("content_items")
    .select("id, title, url, thumbnail_url, published_at, source_id")
    .eq("status", "approved")
    .in("source_id", sourceIds)
    .order("published_at", { ascending: false })
    .limit(200);

  if (error || !items) return [];

  return hydrateItems(items);
}

export async function getComedianBySlug(slug: string): Promise<Comedian | null> {
  const { data, error } = await supabase
    .from("comedians")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function getAllComedians(): Promise<Comedian[]> {
  const { data, error } = await supabase
    .from("comedians")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("name");

  if (error || !data) return [];
  return data;
}
