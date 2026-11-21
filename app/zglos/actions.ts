"use server";

import {
  reportLimitReached,
  validateContentReport,
  warsawDayStart,
  type ReportDraft,
} from "@/lib/content-report";
import { getServerSupabase } from "@/lib/supabase-server";

const SAVE_ERROR = "Nie udało się wysłać zgłoszenia. Spróbuj jeszcze raz.";
const SIGN_IN_ERROR = "Zaloguj się, żeby wysłać zgłoszenie.";
const LIMIT_ERROR = "Możesz wysłać najwyżej 10 zgłoszeń dziennie.";

export type ReportState = { ok: true } | { ok: false; error: string };

export async function submitContentReport(input: ReportDraft): Promise<ReportState> {
  const parsed = validateContentReport(input);
  if (!parsed.ok) return parsed;

  const supabase = await getServerSupabase();
  const { data, error: authError } = await supabase.auth.getUser();
  if (authError || !data.user) return { ok: false, error: SIGN_IN_ERROR };

  if (parsed.row.kind === "wrong_meta" && parsed.row.contentItemId != null) {
    const { data: item, error } = await supabase
      .from("content_items")
      .select("id")
      .eq("id", parsed.row.contentItemId)
      .eq("status", "approved")
      .maybeSingle();
    if (error) {
      console.error("report item", error.code);
      return { ok: false, error: SAVE_ERROR };
    }
    if (!item) return { ok: false, error: "Nie znaleziono tego materiału." };
  }

  const start = warsawDayStart(new Date()).toISOString();
  const { count, error: countError } = await supabase
    .from("content_reports")
    .select("id", { count: "exact", head: true })
    .gte("created_at", start);
  if (countError) {
    console.error("report count", countError.code);
    return { ok: false, error: SAVE_ERROR };
  }
  if (reportLimitReached(count ?? 0)) return { ok: false, error: LIMIT_ERROR };

  const { error } = await supabase.from("content_reports").insert({
    user_id: data.user.id,
    kind: parsed.row.kind,
    content_item_id: parsed.row.contentItemId,
    url: parsed.row.url,
    message: parsed.row.message,
  });
  if (error) {
    console.error("report insert", error.code);
    if (error.message.includes("content_report_daily_limit")) return { ok: false, error: LIMIT_ERROR };
    return { ok: false, error: SAVE_ERROR };
  }
  return { ok: true };
}
