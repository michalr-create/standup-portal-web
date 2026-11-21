"use server";

import { requireAuth } from "@/lib/admin-auth";
import { getAdminSupabase } from "@/lib/supabase-admin";

/** Approved, unmerged rows currently marked Polecane. */
export async function listFeaturedIds(): Promise<number[]> {
  await requireAuth();
  const sb = getAdminSupabase();
  const { data, error } = await sb
    .from("content_items")
    .select("id")
    .eq("status", "approved")
    .eq("is_featured", true)
    .is("merged_into_id", null);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.id);
}
