"use server";

import { revalidatePath } from "next/cache";
import {
  nextOpenMicSlug,
  slugifyOpenMicName,
  submissionFromForm,
  validateOpenMicSubmission,
  type OpenMicSubmitState,
} from "@/lib/open-mics";
import { getAdminSupabase } from "@/lib/supabase-admin";

const SAVE_ERROR = "Nie udało się zapisać zgłoszenia. Spróbuj za chwilę.";

export async function submitOpenMic(_prev: OpenMicSubmitState, formData: FormData): Promise<OpenMicSubmitState> {
  const parsed = validateOpenMicSubmission(submissionFromForm(formData));
  if (parsed.kind === "spam") return { status: "success" };
  if (parsed.kind === "error") return { status: "error", error: parsed.error };

  try {
    const sb = getAdminSupabase();
    const base = slugifyOpenMicName(parsed.row.name);
    const { data: existing, error: slugError } = await sb
      .from("open_mics")
      .select("slug")
      .like("slug", `${base}%`)
      .limit(50);
    if (slugError) {
      console.error("open mic slug lookup", slugError.code);
      return { status: "error", error: SAVE_ERROR };
    }
    const taken = (existing ?? []).map((row) => (typeof row.slug === "string" ? row.slug : ""));
    let slug = nextOpenMicSlug(base, taken);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { error } = await sb.from("open_mics").insert({
        ...parsed.row,
        slug,
        status: "pending",
      });
      if (!error) {
        revalidatePath("/open-mic");
        return { status: "success" };
      }
      if (error.code !== "23505") {
        console.error("open mic insert", error.code);
        return { status: "error", error: SAVE_ERROR };
      }
      slug = nextOpenMicSlug(base, [...taken, slug]);
    }
    return { status: "error", error: SAVE_ERROR };
  } catch {
    console.error("open mic submit failed");
    return { status: "error", error: SAVE_ERROR };
  }
}
