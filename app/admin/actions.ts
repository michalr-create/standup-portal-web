"use server";

import { getAdminSupabase } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
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

export async function setItemPersonTags(itemId: number, personTagIds: number[]) {
  await requireAuth();
  const sb = getAdminSupabase();

  // Usun istniejace tagi person
  const { data: existingTags } = await sb
    .from("content_tags")
    .select("tag_id, tags!inner(tag_type)")
    .eq("content_item_id", itemId)
    .eq("tags.tag_type", "person");

  const existingTagIds = (existingTags || []).map((t) => t.tag_id);

  if (existingTagIds.length > 0) {
    await sb
      .from("content_tags")
      .delete()
      .eq("content_item_id", itemId)
      .in("tag_id", existingTagIds);
  }

  // Wstaw nowe
  if (personTagIds.length > 0) {
    const rows = personTagIds.map((tagId) => ({
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

export async function getPendingItems() {
  await requireAuth();
  const sb = getAdminSupabase();

  const { data: items, error } = await sb
    .from("content_items")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(100);

if (error || !items) return { items: [], personTags: [], allCategories: [], allShows: [] };

  // Pobierz sources, categories, shows, tagi
  const sourceIds = Array.from(new Set(items.map((i) => i.source_id).filter(Boolean)));
  const categoryIds = Array.from(new Set(items.map((i) => i.category_id).filter(Boolean)));
  const showIds = Array.from(new Set(items.map((i) => i.show_id).filter(Boolean)));
  const itemIds = items.map((i) => i.id);
  const duplicateOfIds = items.map((i) => i.possible_duplicate_of).filter(Boolean);

  const { data: sources } = sourceIds.length > 0
    ? await sb.from("sources").select("id, name").in("id", sourceIds)
    : { data: [] };

  const { data: categories } = categoryIds.length > 0
    ? await sb.from("categories").select("id, name, slug").in("id", categoryIds)
    : { data: [] };

  const { data: shows } = showIds.length > 0
    ? await sb.from("shows").select("id, name, slug").in("id", showIds)
    : { data: [] };

  const { data: contentTags } = await sb
    .from("content_tags")
    .select("content_item_id, tag_id")
    .in("content_item_id", itemIds);

  const { data: personTags } = await sb
    .from("tags")
    .select("id, name, slug, person_id")
    .eq("tag_type", "person");

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
    personTags: personTags || [],
    allCategories: categories || [],
    allShows: shows || [],
  };
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

export async function getItemsByStatus(status: string) {
  await requireAuth();
  const sb = getAdminSupabase();

  const { data: items, error } = await sb
    .from("content_items")
    .select("*")
    .eq("status", status)
    .is("merged_into_id", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !items) return { items: [], personTags: [], allCategories: [], allShows: [] };

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
    personTags: personTags || [],
    allCategories: allCategories || [],
    allShows: allShows || [],
  };
}
}
