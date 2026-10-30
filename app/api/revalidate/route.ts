import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import {
  SPECJALE_CACHE_TAG,
  assembleContentPaths,
  collectRevalidateRefs,
  explicitPaths,
  numericId,
  type RevalidateRefs,
  type ResolvedSlugs,
} from "@/lib/revalidate-content";
import { secretsMatch } from "@/lib/revalidate-secret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Db = Awaited<ReturnType<typeof getServerSupabase>>;

function logFailure(scope: string, error: unknown) {
  const message = error instanceof Error ? error.message : "error";
  console.error("revalidate", scope, message);
}

async function lookupSlugs(supabase: Db, table: "categories" | "shows", ids: number[]): Promise<string[]> {
  if (ids.length === 0) return [];
  try {
    const { data, error } = await supabase.from(table).select("slug").in("id", ids);
    if (error) {
      logFailure(table, error.message);
      return [];
    }
    const slugs: string[] = [];
    for (const row of data ?? []) {
      if (typeof row.slug === "string") slugs.push(row.slug);
    }
    return slugs;
  } catch (error) {
    logFailure(table, error);
    return [];
  }
}

function readTag(value: unknown): { slug: string | null; tagType: string | null; personId: number | null } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const slug = typeof record.slug === "string" ? record.slug : null;
  const tagType = typeof record.tag_type === "string" ? record.tag_type : null;
  const personId = numericId(record.person_id);
  if (!slug && personId == null) return null;
  return { slug, tagType, personId };
}

function readEmbeddedTags(data: unknown): { slug: string | null; tagType: string | null; personId: number | null }[] {
  if (!Array.isArray(data)) return [];
  const tags: { slug: string | null; tagType: string | null; personId: number | null }[] = [];
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const embedded = (row as { tags?: unknown }).tags;
    const list = Array.isArray(embedded) ? embedded : embedded ? [embedded] : [row];
    for (const entry of list) {
      const tag = readTag(entry);
      if (tag) tags.push(tag);
    }
  }
  return tags;
}

async function lookupTags(
  supabase: Db,
  itemIds: number[],
  tagIds: number[],
): Promise<{ personSlugs: string[]; tagSlugs: string[] }> {
  const found: { slug: string | null; tagType: string | null; personId: number | null }[] = [];

  if (itemIds.length > 0) {
    try {
      const { data, error } = await supabase
        .from("content_tags")
        .select("tags!inner(slug, tag_type, person_id)")
        .in("content_item_id", itemIds);
      if (error) logFailure("content_tags", error.message);
      else found.push(...readEmbeddedTags(data));
    } catch (error) {
      logFailure("content_tags", error);
    }
  }

  if (tagIds.length > 0) {
    try {
      const { data, error } = await supabase
        .from("tags")
        .select("slug, tag_type, person_id")
        .in("id", tagIds);
      if (error) logFailure("tags", error.message);
      else found.push(...readEmbeddedTags(data));
    } catch (error) {
      logFailure("tags", error);
    }
  }

  const personIds = [...new Set(found.map((tag) => tag.personId).filter((id): id is number => id != null))];
  const personSlugById = new Map<number, string>();
  if (personIds.length > 0) {
    try {
      const { data, error } = await supabase.from("people").select("id, slug").in("id", personIds);
      if (error) logFailure("people", error.message);
      else {
        for (const row of data ?? []) {
          const id = numericId(row.id);
          if (id != null && typeof row.slug === "string") personSlugById.set(id, row.slug);
        }
      }
    } catch (error) {
      logFailure("people", error);
    }
  }

  const personSlugs: string[] = [];
  const tagSlugs: string[] = [];
  for (const tag of found) {
    if (tag.tagType === "person") {
      const slug = (tag.personId != null ? personSlugById.get(tag.personId) : null) ?? tag.slug;
      if (slug) personSlugs.push(slug);
    } else if (tag.slug) {
      tagSlugs.push(tag.slug);
    }
  }
  return { personSlugs, tagSlugs };
}

async function resolveRefs(refs: RevalidateRefs): Promise<ResolvedSlugs> {
  const empty: ResolvedSlugs = {
    categorySlugs: [],
    showSlugs: [],
    personSlugs: [],
    tagSlugs: [],
    hasShow: refs.showIds.length > 0,
  };
  let supabase: Db;
  try {
    supabase = await getServerSupabase();
  } catch (error) {
    logFailure("client", error);
    return empty;
  }

  const categoryIds = new Set(refs.categoryIds);
  const showIds = new Set(refs.showIds);
  if (refs.itemIds.length > 0) {
    try {
      const { data, error } = await supabase
        .from("content_items")
        .select("category_id, show_id")
        .in("id", refs.itemIds);
      if (error) logFailure("content_items", error.message);
      else {
        for (const row of data ?? []) {
          const categoryId = numericId(row.category_id);
          const showId = numericId(row.show_id);
          if (categoryId) categoryIds.add(categoryId);
          if (showId) showIds.add(showId);
        }
      }
    } catch (error) {
      logFailure("content_items", error);
    }
  }

  const [categorySlugs, showSlugs, tags] = await Promise.all([
    lookupSlugs(supabase, "categories", [...categoryIds]),
    lookupSlugs(supabase, "shows", [...showIds]),
    lookupTags(supabase, refs.itemIds, refs.tagIds),
  ]);

  return {
    categorySlugs,
    showSlugs,
    personSlugs: tags.personSlugs,
    tagSlugs: tags.tagSlugs,
    hasShow: showIds.size > 0,
  };
}

function revalidateOne(path: string) {
  if (path === "/") {
    revalidatePath("/", "layout");
    revalidatePath("/", "page");
    return;
  }
  revalidatePath(path);
  if (path === "/specjale") revalidateTag(SPECJALE_CACHE_TAG);
}

export async function POST(req: NextRequest) {
  const expected = process.env.REVALIDATE_SECRET ?? "";
  const provided = req.headers.get("x-revalidate-secret") ?? "";
  if (!expected || !secretsMatch(provided, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const paths = new Set<string>(explicitPaths(record));
  const refs = collectRevalidateRefs(record);
  if (refs.kind === "content") {
    try {
      const resolved = await resolveRefs(refs);
      for (const path of assembleContentPaths(refs, resolved)) paths.add(path);
    } catch (error) {
      logFailure("resolve", error);
      for (const path of assembleContentPaths(refs, {
        categorySlugs: [],
        showSlugs: [],
        personSlugs: [],
        tagSlugs: [],
        hasShow: refs.showIds.length > 0,
      })) {
        paths.add(path);
      }
    }
  }

  const revalidated: string[] = [];
  for (const path of [...paths].sort()) {
    try {
      revalidateOne(path);
      revalidated.push(path);
    } catch (error) {
      logFailure(path, error);
    }
  }

  return NextResponse.json({ revalidated });
}
