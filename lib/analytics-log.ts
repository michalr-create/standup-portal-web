import { getAdminSupabase } from "./supabase-admin.ts";
import { validateAnalyticsEvent } from "./analytics-events.ts";

/** Insert one validated event. Callers must already know analytics consent is on. */
export async function insertAnalyticsEvent(name: unknown, props: unknown): Promise<{ ok: boolean }> {
  const validated = validateAnalyticsEvent(name, props);
  if (!validated.ok) return { ok: false };
  try {
    const supabase = getAdminSupabase();
    const { error } = await supabase.from("analytics_events").insert({
      name: validated.event.name,
      props: validated.event.props,
    });
    return { ok: !error };
  } catch {
    return { ok: false };
  }
}
