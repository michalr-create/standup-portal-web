"use server";

import { getAdminSupabase } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function bulkUpdateAndApprove(
  itemIds: number[],
  categoryId: number | null | undefined,
  showId: number | null | undefined
) {
  await requireAuth();
  if (itemIds.length === 0) return;
  const sb = getAdminSupabase();

  const update: Record<string, unknown> = { status: "approved" };
  if (categoryId !== undefined) update.category_id = categoryId;
  if (showId !== undefined) update.show_id = showId;

  await sb.from("content_items").update(update).in("id", itemIds);

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function approveItem(itemId: number) {
  await requireAuth();
  const sb = getAdminSupabase();

  await sb
    .from("content_items")
    .update({ status: "approved" })
    .eq("id", itemId);

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function rejectItem(itemId: number) {
  await requireAuth();
  const sb = getAdminSupabase();

  await sb
    .from("content_items")
    .update({ status: "rejected" })
    .eq("id", itemId);

  revalidatePath("/admin");
}

export async function updateItemCategory(itemId: number, categoryId: number | null) {
  await requireAuth();
  const sb = getAdminSupabase();

  await sb
    .from("content_items")
    .update({ category_id: categoryId })
    .eq("id", itemId);

  revalidatePath("/admin");
}

export async function updateItemShow(itemId: number, showId: number | null) {
  await requireAuth();
  const sb = getAdminSupabase();

  await sb
    .from("content_items")
    .update({ show_id: showId })
    .eq("id", itemId);

  revalidatePath("/admin");
}

export async function setItemTags(itemId: number, tagIds: number[]) {
  await requireAuth();
  const sb = getAdminSupabase();

  // Usun wszystkie istniejace tagi
  await sb
    .from("content_tags")
    .delete()
    .eq("content_item_id", itemId);

  // Wstaw nowe
  if (tagIds.length > 0) {
    const rows = tagIds.map((tagId) => ({
      content_item_id: itemId,
      tag_id: tagId,
    }));
    await sb.from("content_tags").insert(rows);
  }

  revalidatePath("/admin");
}

export async function mergeItems(keepId: number, mergeId: number) {
  await requireAuth();
  const sb = getAdminSupabase();

  // Pobierz lub stworz episode_group_id dla keepId
  const { data: keepItem } = await sb
    .from("content_items")
    .select("episode_group_id")
    .eq("id", keepId)
    .single();

  const groupId = keepItem?.episode_group_id || `grp_${keepId}`;

  // Ustaw group na keepId jesli nie mial
  if (!keepItem?.episode_group_id) {
    await sb
      .from("content_items")
      .update({ episode_group_id: groupId })
      .eq("id", keepId);
  }

  // Oznacz mergeId jako merged
  await sb
    .from("content_items")
    .update({
      episode_group_id: groupId,
      merged_into_id: keepId,
      status: "approved",
    })
    .eq("id", mergeId);

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function dismissDuplicate(itemId: number) {
  await requireAuth();
  const sb = getAdminSupabase();

  await sb
    .from("content_items")
    .update({ possible_duplicate_of: null })
    .eq("id", itemId);

  revalidatePath("/admin");
}

const PAGE_SIZE = 50;

export async function getStatusCounts() {
  await requireAuth();
  const sb = getAdminSupabase();
  const [pending, approved, rejected, featured] = await Promise.all([
    sb.from("content_items").select("*", { count: "exact", head: true }).eq("status", "pending").is("merged_into_id", null),
    sb.from("content_items").select("*", { count: "exact", head: true }).eq("status", "approved").is("merged_into_id", null),
    sb.from("content_items").select("*", { count: "exact", head: true }).eq("status", "rejected").is("merged_into_id", null),
    sb.from("content_items").select("*", { count: "exact", head: true }).eq("status", "approved").eq("is_featured", true).is("merged_into_id", null),
  ]);
  return {
    pending: pending.count || 0,
    approved: approved.count || 0,
    rejected: rejected.count || 0,
    featured: featured.count || 0,
  };
}

export async function getPendingItems(search = "", page = 0) {
  await requireAuth();
  const sb = getAdminSupabase();
  const offset = page * PAGE_SIZE;

  let query = sb
    .from("content_items")
    .select("*", { count: "exact" })
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (search.trim()) query = query.ilike("title", `%${search.trim()}%`);

  const { data: items, count, error } = await query;

if (error || !items) return { items: [], totalCount: 0, personTags: [], allCategories: [], allShows: [] };

  // Pobierz sources, categories, shows, tagi
  const sourceIds = Array.from(new Set(items.map((i) => i.source_id).filter(Boolean)));
  const itemIds = items.map((i) => i.id);
  const duplicateOfIds = items.map((i) => i.possible_duplicate_of).filter(Boolean);

  const { data: sources } = sourceIds.length > 0
    ? await sb.from("sources").select("id, name").in("id", sourceIds)
    : { data: [] };

  const { data: categories } = await sb
    .from("categories")
    .select("id, name, slug")
    .order("display_order");

  const { data: shows } = await sb
    .from("shows")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("name");

  const { data: contentTags } = await sb
    .from("content_tags")
    .select("content_item_id, tag_id")
    .in("content_item_id", itemIds);

  const { data: personTags } = await sb
    .from("tags")
    .select("id, name, slug, person_id")
    .eq("tag_type", "person");

  const { data: contentTagsList } = await sb
    .from("tags")
    .select("id, name, slug, tag_type")
    .neq("tag_type", "person")
    .order("tag_type")
    .order("name");

  // Pobierz tytuly duplikatow
  const { data: duplicates } = duplicateOfIds.length > 0
    ? await sb.from("content_items").select("id, title, url").in("id", duplicateOfIds)
    : { data: [] };

  const sourcesMap = new Map((sources || []).map((s) => [s.id, s]));
  const categoriesMap = new Map((categories || []).map((c) => [c.id, c]));
  const showsMap = new Map((shows || []).map((s) => [s.id, s]));
  const duplicatesMap = new Map((duplicates || []).map((d) => [d.id, d]));

  // Map: item_id -> tag_ids
  const itemTagMap = new Map<number, number[]>();
  for (const ct of contentTags || []) {
    if (!itemTagMap.has(ct.content_item_id)) {
      itemTagMap.set(ct.content_item_id, []);
    }
    itemTagMap.get(ct.content_item_id)!.push(ct.tag_id);
  }

  return {
    items: items.map((item) => ({
      ...item,
      sourceName: sourcesMap.get(item.source_id)?.name || "Nieznane",
      categoryName: categoriesMap.get(item.category_id)?.name || null,
      showName: showsMap.get(item.show_id)?.name || null,
      assignedTagIds: itemTagMap.get(item.id) || [],
      duplicateOf: item.possible_duplicate_of
        ? duplicatesMap.get(item.possible_duplicate_of) || null
        : null,
    })),
    totalCount: count || 0,
    personTags: personTags || [],
    contentTags: contentTagsList || [],
    allCategories: categories || [],
    allShows: shows || [],
  };
}
  export async function revertToPending(itemId: number) {
  await requireAuth();
  const sb = getAdminSupabase();

  await sb
    .from("content_items")
    .update({ status: "pending" })
    .eq("id", itemId);

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function getItemsByStatus(status: string, search = "", page = 0, categoryId: number | null = null) {
  await requireAuth();
  const sb = getAdminSupabase();
  const offset = page * PAGE_SIZE;

  let query = sb
    .from("content_items")
    .select("*", { count: "exact" })
    .eq("status", status)
    .is("merged_into_id", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (search.trim()) query = query.ilike("title", `%${search.trim()}%`);
  if (categoryId != null) query = query.eq("category_id", categoryId);

  const { data: items, count, error } = await query;

  if (error || !items) return { items: [], totalCount: 0, personTags: [], allCategories: [], allShows: [] };

  const itemIds = items.map((i) => i.id);
  const sourceIds = Array.from(new Set(items.map((i) => i.source_id).filter(Boolean)));

  const { data: sources } = sourceIds.length > 0
    ? await sb.from("sources").select("id, name").in("id", sourceIds)
    : { data: [] };

  const { data: contentTags } = itemIds.length > 0
    ? await sb.from("content_tags").select("content_item_id, tag_id").in("content_item_id", itemIds)
    : { data: [] };

  const { data: personTags } = await sb
    .from("tags")
    .select("id, name, slug, person_id")
    .eq("tag_type", "person");

  const { data: contentTagsList } = await sb
    .from("tags")
    .select("id, name, slug, tag_type")
    .neq("tag_type", "person")
    .order("tag_type")
    .order("name");

  const { data: allCategories } = await sb
    .from("categories")
    .select("id, name, slug")
    .order("display_order");

  const { data: allShows } = await sb
    .from("shows")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("name");

  const duplicateOfIds = items.map((i) => i.possible_duplicate_of).filter(Boolean);
  const { data: duplicates } = duplicateOfIds.length > 0
    ? await sb.from("content_items").select("id, title, url").in("id", duplicateOfIds)
    : { data: [] };

  const sourcesMap = new Map((sources || []).map((s) => [s.id, s]));
  const duplicatesMap = new Map((duplicates || []).map((d) => [d.id, d]));

  const itemTagMap = new Map<number, number[]>();
  for (const ct of contentTags || []) {
    if (!itemTagMap.has(ct.content_item_id)) {
      itemTagMap.set(ct.content_item_id, []);
    }
    itemTagMap.get(ct.content_item_id)!.push(ct.tag_id);
  }

  return {
    items: items.map((item) => ({
      ...item,
      sourceName: sourcesMap.get(item.source_id)?.name || "Nieznane",
      categoryName: null,
      showName: null,
      assignedTagIds: itemTagMap.get(item.id) || [],
      duplicateOf: item.possible_duplicate_of
        ? duplicatesMap.get(item.possible_duplicate_of) || null
        : null,
    })),
    totalCount: count || 0,
    personTags: personTags || [],
    contentTags: contentTagsList || [],
    allCategories: allCategories || [],
    allShows: allShows || [],
  };
}
export async function toggleFeatured(itemId: number, isFeatured: boolean) {
  await requireAuth();
  const sb = getAdminSupabase();

  await sb
    .from("content_items")
    .update({ is_featured: isFeatured })
    .eq("id", itemId);

  revalidatePath("/admin");
  revalidatePath("/");
}
export async function getFeaturedItems(search = "", page = 0) {
  await requireAuth();
  const sb = getAdminSupabase();
  const offset = page * PAGE_SIZE;

  let query = sb
    .from("content_items")
    .select("*", { count: "exact" })
    .eq("status", "approved")
    .eq("is_featured", true)
    .is("merged_into_id", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (search.trim()) query = query.ilike("title", `%${search.trim()}%`);

  const { data: items, count } = await query;

  if (!items) return { items: [], totalCount: 0, personTags: [], contentTags: [], allCategories: [], allShows: [] };

  const itemIds = items.map((i) => i.id);
  const sourceIds = Array.from(new Set(items.map((i) => i.source_id).filter(Boolean)));

  const { data: sources } = sourceIds.length > 0
    ? await sb.from("sources").select("id, name").in("id", sourceIds)
    : { data: [] };

  const { data: contentTagsData } = itemIds.length > 0
    ? await sb.from("content_tags").select("content_item_id, tag_id").in("content_item_id", itemIds)
    : { data: [] };

  const { data: personTags } = await sb
    .from("tags")
    .select("id, name, slug, person_id")
    .eq("tag_type", "person");

  const { data: contentTagsList } = await sb
    .from("tags")
    .select("id, name, slug, tag_type")
    .neq("tag_type", "person")
    .order("tag_type")
    .order("name");

  const { data: allCategories } = await sb
    .from("categories")
    .select("id, name, slug")
    .order("display_order");

  const { data: allShows } = await sb
    .from("shows")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("name");

  const sourcesMap = new Map((sources || []).map((s) => [s.id, s]));

  const itemTagMap = new Map<number, number[]>();
  for (const ct of contentTagsData || []) {
    if (!itemTagMap.has(ct.content_item_id)) {
      itemTagMap.set(ct.content_item_id, []);
    }
    itemTagMap.get(ct.content_item_id)!.push(ct.tag_id);
  }

  return {
    items: items.map((item) => ({
      ...item,
      sourceName: sourcesMap.get(item.source_id)?.name || "Nieznane",
      categoryName: null,
      showName: null,
      assignedTagIds: itemTagMap.get(item.id) || [],
      duplicateOf: null,
    })),
    totalCount: count || 0,
    personTags: personTags || [],
    contentTags: contentTagsList || [],
    allCategories: allCategories || [],
    allShows: allShows || [],
  };
}
