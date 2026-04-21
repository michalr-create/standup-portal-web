import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const { person_slugs = [], show_slugs = [] }: { person_slugs: string[]; show_slugs: string[] } =
    await req.json();

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const peopleDetails: { slug: string; name: string }[] = [];
  const showDetails: { slug: string; name: string }[] = [];
  const itemIdSet = new Set<number>();

  // ── Person slugs → tag IDs → content_item_ids ──────────────────────────
  if (person_slugs.length > 0) {
    const { data: people } = await sb
      .from("people")
      .select("id, name, slug")
      .in("slug", person_slugs);

    if (people?.length) {
      peopleDetails.push(...people.map((p) => ({ slug: p.slug, name: p.name })));
      const personIds = people.map((p) => p.id);

      const { data: tags } = await sb
        .from("tags")
        .select("id")
        .eq("tag_type", "person")
        .in("person_id", personIds);

      if (tags?.length) {
        const tagIds = tags.map((t) => t.id);
        const { data: ct } = await sb
          .from("content_tags")
          .select("content_item_id")
          .in("tag_id", tagIds)
          .limit(500);
        (ct || []).forEach((r) => itemIdSet.add(r.content_item_id));
      }
    }
  }

  // ── Show slugs → show IDs ──────────────────────────────────────────────
  let showIds: number[] = [];
  if (show_slugs.length > 0) {
    const { data: shows } = await sb
      .from("shows")
      .select("id, name, slug")
      .in("slug", show_slugs);

    if (shows?.length) {
      showDetails.push(...shows.map((s) => ({ slug: s.slug, name: s.name })));
      showIds = shows.map((s) => s.id);
    }
  }

  if (itemIdSet.size === 0 && showIds.length === 0) {
    return NextResponse.json({ items: [], people: peopleDetails, shows: showDetails });
  }

  // ── Fetch items ────────────────────────────────────────────────────────
  const baseSelect = "id, title, url, thumbnail_url, published_at, duration_seconds, show_id, category_id";

  const [personItemsRes, showItemsRes] = await Promise.all([
    itemIdSet.size > 0
      ? sb
          .from("content_items")
          .select(baseSelect)
          .eq("status", "approved")
          .is("merged_into_id", null)
          .in("id", Array.from(itemIdSet))
          .order("published_at", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] }),
    showIds.length > 0
      ? sb
          .from("content_items")
          .select(baseSelect)
          .eq("status", "approved")
          .is("merged_into_id", null)
          .in("show_id", showIds)
          .order("published_at", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] }),
  ]);

  const seen = new Set<number>();
  const merged: Record<string, unknown>[] = [];
  for (const item of [...(personItemsRes.data || []), ...(showItemsRes.data || [])]) {
    if (!seen.has(item.id)) { seen.add(item.id); merged.push(item); }
  }
  const top10 = merged
    .sort((a, b) =>
      new Date(String(b.published_at)).getTime() - new Date(String(a.published_at)).getTime()
    )
    .slice(0, 10);

  // ── Enrich with showName / categoryName ───────────────────────────────
  const uniqueShowIds = [...new Set(top10.map((i) => i.show_id as number | null).filter(Boolean))] as number[];
  const uniqueCatIds = [...new Set(top10.map((i) => i.category_id as number | null).filter(Boolean))] as number[];

  const [showsRes, catsRes] = await Promise.all([
    uniqueShowIds.length > 0
      ? sb.from("shows").select("id, name").in("id", uniqueShowIds)
      : Promise.resolve({ data: [] }),
    uniqueCatIds.length > 0
      ? sb.from("categories").select("id, name").in("id", uniqueCatIds)
      : Promise.resolve({ data: [] }),
  ]);

  const showNameMap = new Map((showsRes.data || []).map((s) => [s.id, s.name]));
  const catNameMap = new Map((catsRes.data || []).map((c) => [c.id, c.name]));

  const items = top10.map((item) => ({
    ...item,
    status: "approved",
    content_type: null,
    source_id: 0,
    is_featured: false,
    showName: item.show_id ? (showNameMap.get(item.show_id as number) ?? null) : null,
    categoryName: item.category_id ? (catNameMap.get(item.category_id as number) ?? null) : null,
    people: [],
    tags: [],
  }));

  return NextResponse.json({ items, people: peopleDetails, shows: showDetails });
}
