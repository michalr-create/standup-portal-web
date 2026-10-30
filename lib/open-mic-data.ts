import {
  sampleOpenMicCatalog,
  toOpenMicCycle,
  toOpenMicDate,
  type OpenMicCycle,
  type OpenMicDate,
} from "@/lib/open-mics";
import { supabase } from "@/lib/supabase";

/**
 * Public columns only. submitted_by_email is revoked from anon and must
 * not appear here: PostgREST rejects a select that asks for it, and the
 * address is contact data for moderators.
 */
export const OPEN_MIC_CYCLE_COLUMNS =
  "id, name, slug, city, venue, address, lat, lng, recurrence_text, language, signup_info, signup_url, rules, audience_price_text, organizer, status";

export const OPEN_MIC_DATE_COLUMNS =
  "id, open_mic_id, title, starts_at, city, venue, provider, url, status, moderation_status";

export type OpenMicCatalog = {
  ok: boolean;
  cycles: OpenMicCycle[];
  dates: OpenMicDate[];
};

function previewCatalog(now: Date): OpenMicCatalog | null {
  // next dev only. next build sets NODE_ENV=production, so a leftover env
  // var cannot bake fixture rows into the deployed page.
  if (process.env.NODE_ENV === "production") return null;
  if (process.env.OPEN_MIC_PREVIEW === "empty") return { ok: true, cycles: [], dates: [] };
  if (process.env.OPEN_MIC_PREVIEW === "sample") {
    const sample = sampleOpenMicCatalog(now);
    return { ok: true, cycles: sample.cycles, dates: sample.dates };
  }
  return null;
}

export async function getOpenMicCatalog(now = new Date()): Promise<OpenMicCatalog> {
  const preview = previewCatalog(now);
  if (preview) return preview;

  try {
    const [cycleRes, dateRes] = await Promise.all([
      supabase
        .from("open_mics")
        .select(OPEN_MIC_CYCLE_COLUMNS)
        .in("status", ["active", "to_verify"])
        .order("name", { ascending: true })
        .limit(1000),
      supabase
        .from("open_mic_dates")
        .select(OPEN_MIC_DATE_COLUMNS)
        .eq("moderation_status", "approved")
        .in("status", ["on_sale", "sold_out", "unknown"])
        .gte("starts_at", now.toISOString())
        .order("starts_at", { ascending: true })
        .order("id", { ascending: true })
        .limit(1000),
    ]);

    if (cycleRes.error || dateRes.error) {
      console.error("Błąd pobierania open miców:", cycleRes.error?.code ?? dateRes.error?.code);
      return { ok: false, cycles: [], dates: [] };
    }

    const cycles = (cycleRes.data ?? []).flatMap((row) => {
      const cycle = toOpenMicCycle(row);
      return cycle ? [cycle] : [];
    });
    const dates = (dateRes.data ?? []).flatMap((row) => {
      const date = toOpenMicDate(row);
      return date ? [date] : [];
    });
    return { ok: true, cycles, dates };
  } catch {
    console.error("Błąd pobierania open miców");
    return { ok: false, cycles: [], dates: [] };
  }
}
