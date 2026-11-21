"use server";

import { revalidatePath } from "next/cache";
import { isReportStatus, type ReportStatus } from "@/lib/content-report";
import { requireAuth } from "@/lib/admin-auth";
import { getServerSupabase } from "@/lib/supabase-server";

const SAVE_ERROR = "Nie udało się zmienić statusu.";

export async function setReportStatus(
  id: number,
  status: string,
): Promise<{ ok: true; status: ReportStatus } | { ok: false; error: string }> {
  if (!Number.isSafeInteger(id) || id <= 0 || !isReportStatus(status)) {
    return { ok: false, error: SAVE_ERROR };
  }
  await requireAuth();
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("content_reports")
    .update({ status })
    .eq("id", id)
    .select("status");
  if (error || !data?.length || data[0]?.status !== status) {
    console.error("report status", error?.code);
    return { ok: false, error: SAVE_ERROR };
  }
  revalidatePath("/admin/zgloszenia");
  return { ok: true, status };
}
