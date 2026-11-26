import { revalidatePath } from "next/cache";
import { getAdminSupabase } from "@/lib/supabase-admin";
import {
  canonicalSpecialIds,
  planSpecialSlug,
  youtubeVideoId,
  type SpecialCandidate,
} from "@/lib/special-slug";
import { EXCLUDED_SPECIAL_ITEM_ID, isPublicContentSlug, slugify } from "@/lib/slugify";

type Admin = ReturnType<typeof getAdminSupabase>;

type ItemRow = {
  id: number;
  title: string | null;
  url: string | null;
  external_id: string | null;
  description: string | null;
  duration_seconds: number | null;
  published_at: string | null;
  status: string | null;
  merged_into_id: number | null;
  slug: string | null;
};

function asCandidate(row: ItemRow): SpecialCandidate {
  return {
    id: row.id,
    url: row.url,
    externalId: row.external_id,
    description: row.description,
    durationSeconds: row.duration_seconds,
    publishedAt: row.published_at,
  };
}

function tagList(value: unknown): { slug?: string; tag_type?: string }[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value as { slug?: string; tag_type?: string }];
}

function rowHasSpecial(value: unknown): boolean {
  return tagList(value).some((tag) => tag.slug === "special" && tag.tag_type === "topic");
}

async function loadItem(sb: Admin, itemId: number): Promise<ItemRow | null> {
  const { data, error } = await sb
    .from("content_items")
    .select("id, title, url, external_id, description, duration_seconds, published_at, status, merged_into_id, slug")
    .eq("id", itemId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ItemRow | null) ?? null;
}

/** Approved specials that share this YouTube id, plus the row itself when it is already a special. */
async function specialGroup(sb: Admin, item: ItemRow, itemIsSpecial: boolean): Promise<SpecialCandidate[]> {
  const videoId = youtubeVideoId(item.url, item.external_id);
  if (!videoId) return itemIsSpecial ? [asCandidate(item)] : [];
  const { data, error } = await sb
    .from("content_items")
    .select("id, title, url, external_id, description, duration_seconds, published_at, status, merged_into_id, slug")
    .or(`external_id.eq.${videoId},url.match.${videoId}`)
    .eq("status", "approved")
    .is("merged_into_id", null)
    .neq("id", EXCLUDED_SPECIAL_ITEM_ID)
    .limit(20);
  if (error) throw new Error(error.message);
  const rows = ((data ?? []) as ItemRow[]).filter((row) => youtubeVideoId(row.url, row.external_id) === videoId);
  const ids = rows.map((row) => row.id);
  const specialIds = new Set<number>();
  if (ids.length > 0) {
    const { data: links, error: linkError } = await sb
      .from("content_tags")
      .select("content_item_id, tags!inner(slug, tag_type)")
      .in("content_item_id", ids);
    if (linkError) throw new Error(linkError.message);
    for (const link of links ?? []) {
      const contentId = (link as { content_item_id?: number }).content_item_id;
      const tags = (link as { tags?: unknown }).tags;
      if (typeof contentId === "number" && rowHasSpecial(tags)) specialIds.add(contentId);
    }
  }
  const pool = rows.filter((row) => specialIds.has(row.id)).map(asCandidate);
  if (itemIsSpecial && !pool.some((row) => row.id === item.id)) pool.push(asCandidate(item));
  return pool;
}

async function itemIsSpecial(sb: Admin, itemId: number): Promise<boolean> {
  const { data, error } = await sb
    .from("content_tags")
    .select("tags!inner(slug, tag_type)")
    .eq("content_item_id", itemId);
  if (error) throw new Error(error.message);
  return (data ?? []).some((row) => rowHasSpecial((row as { tags?: unknown }).tags));
}

async function takenSlugs(sb: Admin, itemId: number, slugs: string[]): Promise<string[]> {
  const unique = [...new Set(slugs.filter((slug) => isPublicContentSlug(slug)))];
  if (unique.length === 0) return [];
  const { data, error } = await sb.from("content_items").select("slug").in("slug", unique).neq("id", itemId);
  if (error) throw new Error(error.message);
  const taken: string[] = [];
  for (const row of data ?? []) {
    if (typeof row.slug === "string") taken.push(row.slug);
  }
  return taken;
}

/**
 * Fill, replace, or clear `content_items.slug` after approve, tag, or editor save.
 * `explicitSlug` is the editor field (`""` allocates or clears). Omit it on approve/tag sync.
 */
export async function syncSpecialSlug(
  itemId: number,
  explicitSlug?: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Number.isSafeInteger(itemId) || itemId <= 0) {
    return { ok: false, error: "Nieprawidłowy materiał." };
  }
  const sb = getAdminSupabase();
  const item = await loadItem(sb, itemId);
  if (!item) return { ok: false, error: "Nie znaleziono materiału." };

  const special = item.id === EXCLUDED_SPECIAL_ITEM_ID ? false : await itemIsSpecial(sb, item.id);
  const group = await specialGroup(sb, item, special);
  const canonical = canonicalSpecialIds(group.length > 0 ? group : [asCandidate(item)]);
  const eligible =
    item.status === "approved" &&
    item.merged_into_id == null &&
    special &&
    canonical.has(item.id);

  const title = item.title ?? "";
  const base = slugify(title);
  const probe = [base, base ? `${base}-${item.id}` : "", String(item.id)];
  if (typeof explicitSlug === "string" && explicitSlug.trim()) probe.push(explicitSlug.trim().toLowerCase());
  const taken = await takenSlugs(sb, item.id, probe);
  const plan = planSpecialSlug({
    id: item.id,
    title,
    currentSlug: item.slug,
    explicitSlug,
    eligible,
    taken,
  });
  if (plan.action === "error") return { ok: false, error: plan.error };
  if (plan.action === "keep") return { ok: true };

  const next = plan.action === "clear" ? null : plan.slug;
  const { error } = await sb.from("content_items").update({ slug: next }).eq("id", item.id);
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Ten slug jest już zajęty." };
    return { ok: false, error: error.message };
  }
  if (item.slug) revalidatePath(`/specjale/${item.slug}`);
  if (next) revalidatePath(`/specjale/${next}`);
  revalidatePath("/specjale");
  revalidatePath("/specjale/2026");
  revalidatePath("/specjale/najlepsze");
  revalidatePath("/sitemap.xml");
  revalidatePath("/");
  return { ok: true };
}
