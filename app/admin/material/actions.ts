"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/admin-auth";
import { getAdminSupabase } from "@/lib/supabase-admin";
import { syncSpecialSlug } from "@/lib/ensure-special-slug";
import {
  assembleTagIds,
  normalizeMaterialDraft,
  resolvePersonTagPlan,
  type MaterialDraft,
  type MaterialEditorData,
} from "@/lib/material-edit";

function revalidateMaterial() {
  revalidatePath("/", "layout");
  revalidatePath("/admin", "layout");
}

export async function getMaterialEditor(itemId: number): Promise<MaterialEditorData | null> {
  await requireAuth();
  if (!Number.isSafeInteger(itemId) || itemId <= 0) return null;
  const sb = getAdminSupabase();

  const { data: item, error } = await sb
    .from("content_items")
    .select("id, title, description, url, status, category_id, show_id, slug")
    .eq("id", itemId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!item) return null;

  const [categoriesRes, showsRes, peopleRes, tagsRes, assignedRes] = await Promise.all([
    sb.from("categories").select("id, name").order("display_order"),
    sb.from("shows").select("id, name, is_active").order("name"),
    sb.from("people").select("id, name, is_active").order("name"),
    sb.from("tags").select("id, name, tag_type, person_id").order("name"),
    sb.from("content_tags").select("tag_id").eq("content_item_id", itemId),
  ]);

  const failed = [categoriesRes, showsRes, peopleRes, tagsRes, assignedRes].find((result) => result.error);
  if (failed?.error) throw new Error(failed.error.message);

  const assigned = new Set((assignedRes.data ?? []).map((row) => row.tag_id));
  const tags = tagsRes.data ?? [];
  const personIds: number[] = [];
  const seenPeople = new Set<number>();
  for (const tag of tags) {
    if (tag.tag_type !== "person" || tag.person_id == null || !assigned.has(tag.id)) continue;
    if (seenPeople.has(tag.person_id)) continue;
    seenPeople.add(tag.person_id);
    personIds.push(tag.person_id);
  }

  const tagIds = tags
    .filter((tag) => tag.tag_type !== "person" && assigned.has(tag.id))
    .map((tag) => tag.id);

  return {
    item: {
      id: item.id,
      title: item.title ?? "",
      description: item.description ?? "",
      url: item.url ?? "",
      status: item.status ?? "",
      categoryId: item.category_id,
      showId: item.show_id,
      slug: item.slug ?? "",
    },
    categories: (categoriesRes.data ?? []).map((row) => ({ id: row.id, name: row.name })),
    shows: (showsRes.data ?? [])
      .filter((row) => row.is_active !== false || row.id === item.show_id)
      .map((row) => ({ id: row.id, name: row.name })),
    people: (peopleRes.data ?? [])
      .filter((row) => row.is_active !== false || personIds.includes(row.id))
      .map((row) => ({ id: row.id, name: row.name })),
    tags: tags
      .filter((tag) => tag.tag_type !== "person")
      .map((tag) => ({ id: tag.id, name: tag.name, tagType: tag.tag_type })),
    personIds,
    tagIds,
  };
}

async function ensurePersonTagIds(
  sb: ReturnType<typeof getAdminSupabase>,
  personIds: number[],
): Promise<{ ok: true; tagIds: number[] } | { ok: false; error: string }> {
  if (personIds.length === 0) return { ok: true, tagIds: [] };

  const [peopleRes, tagsRes] = await Promise.all([
    sb.from("people").select("id, name, slug").in("id", personIds),
    sb.from("tags").select("id, person_id").eq("tag_type", "person"),
  ]);
  if (peopleRes.error) return { ok: false, error: peopleRes.error.message };
  if (tagsRes.error) return { ok: false, error: tagsRes.error.message };

  const plan = resolvePersonTagPlan(
    peopleRes.data ?? [],
    (tagsRes.data ?? []).map((tag) => ({ id: tag.id, personId: tag.person_id })),
    personIds,
  );
  if (!plan.ok) return plan;

  const tagIds: number[] = [];
  for (const slot of plan.slots) {
    if (slot.kind === "tag") {
      tagIds.push(slot.tagId);
      continue;
    }
    const person = slot.person;
    const inserted = await sb
      .from("tags")
      .insert({
        name: person.name,
        slug: person.slug,
        tag_type: "person",
        person_id: person.id,
      })
      .select("id")
      .maybeSingle();

    if (!inserted.error && inserted.data) {
      tagIds.push(inserted.data.id);
      continue;
    }

    const existing = await sb
      .from("tags")
      .select("id, person_id")
      .eq("tag_type", "person")
      .eq("slug", person.slug)
      .maybeSingle();

    if (existing.error || !existing.data) {
      return { ok: false, error: inserted.error?.message || "Nie udało się dodać tagu osoby." };
    }
    if (existing.data.person_id != null && existing.data.person_id !== person.id) {
      return { ok: false, error: `Tag osoby „${person.name}” jest już zajęty.` };
    }
    if (existing.data.person_id == null) {
      const attached = await sb.from("tags").update({ person_id: person.id }).eq("id", existing.data.id);
      if (attached.error) return { ok: false, error: attached.error.message };
    }
    tagIds.push(existing.data.id);
  }

  return { ok: true, tagIds };
}

export async function updateMaterial(
  itemId: number,
  draft: MaterialDraft,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAuth();
  if (typeof itemId !== "number" || !Number.isSafeInteger(itemId) || itemId <= 0) {
    return { ok: false, error: "Nieprawidłowy materiał." };
  }
  if (draft == null || typeof draft !== "object") {
    return { ok: false, error: "Nieprawidłowe dane." };
  }

  const parsed = normalizeMaterialDraft(draft);
  if (!parsed.ok) return parsed;
  const value = parsed.value;
  const sb = getAdminSupabase();

  const { data: item, error: itemError } = await sb
    .from("content_items")
    .select("id")
    .eq("id", itemId)
    .maybeSingle();
  if (itemError) return { ok: false, error: itemError.message };
  if (!item) return { ok: false, error: "Nie znaleziono materiału." };

  if (value.categoryId != null) {
    const { data, error } = await sb.from("categories").select("id").eq("id", value.categoryId).maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "Nieznana kategoria." };
  }

  if (value.showId != null) {
    const { data, error } = await sb.from("shows").select("id").eq("id", value.showId).maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "Nieznany format." };
  }

  if (value.tagIds.length > 0) {
    const { data, error } = await sb.from("tags").select("id, tag_type").in("id", value.tagIds);
    if (error) return { ok: false, error: error.message };
    if ((data ?? []).length !== value.tagIds.length) return { ok: false, error: "Nieznany tag." };
    if ((data ?? []).some((tag) => tag.tag_type === "person")) {
      return { ok: false, error: "Standuperów przypisuje się w polu standuperów." };
    }
  }

  const personTags = await ensurePersonTagIds(sb, value.personIds);
  if (!personTags.ok) return personTags;

  const { error: updateError } = await sb
    .from("content_items")
    .update({
      title: value.title,
      description: value.description.length > 0 ? value.description : null,
      category_id: value.categoryId,
      show_id: value.showId,
    })
    .eq("id", itemId);
  if (updateError) return { ok: false, error: updateError.message };

  const nextTagIds = assembleTagIds(personTags.tagIds, value.tagIds);
  const { data: currentTags, error: currentTagsError } = await sb
    .from("content_tags")
    .select("tag_id")
    .eq("content_item_id", itemId);
  if (currentTagsError) return { ok: false, error: currentTagsError.message };

  const currentIds = new Set((currentTags ?? []).map((row) => row.tag_id));
  const nextIds = new Set(nextTagIds);
  const toAdd = nextTagIds.filter((tagId) => !currentIds.has(tagId));
  const toRemove = [...currentIds].filter((tagId) => !nextIds.has(tagId));

  if (toAdd.length > 0) {
    const { error: insertError } = await sb.from("content_tags").insert(
      toAdd.map((tagId) => ({ content_item_id: itemId, tag_id: tagId })),
    );
    if (insertError) return { ok: false, error: insertError.message };
  }
  if (toRemove.length > 0) {
    const { error: deleteError } = await sb
      .from("content_tags")
      .delete()
      .eq("content_item_id", itemId)
      .in("tag_id", toRemove);
    if (deleteError) return { ok: false, error: deleteError.message };
  }

  const slugResult = await syncSpecialSlug(itemId, value.slug);
  if (!slugResult.ok) return slugResult;

  revalidateMaterial();
  return { ok: true };
}
