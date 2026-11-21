import { NextRequest, NextResponse } from "next/server";
import { parsePushPrefs, prefsFromRow } from "@/lib/push-dispatch";
import { getServerSupabase } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireUser() {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, user: null };
  return { supabase, user: data.user };
}

export async function GET() {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await supabase
    .from("notification_prefs")
    .select("new_content_favorites, notify_shorts, events_home_city, events_favorites, event_reminders")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    console.error("push prefs", error.code);
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
  const prefs = prefsFromRow(data);
  return NextResponse.json({
    newContentFavorites: prefs.newContentFavorites,
    notifyShorts: prefs.notifyShorts,
    eventsHomeCity: prefs.eventsHomeCity,
    eventsFavorites: prefs.eventsFavorites,
    eventReminders: prefs.eventReminders,
  });
}

export async function PUT(req: NextRequest) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const prefs = parsePushPrefs(body);
  if (!prefs) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const row = {
    new_content_favorites: prefs.newContentFavorites,
    notify_shorts: prefs.notifyShorts,
    events_home_city: prefs.eventsHomeCity,
    events_favorites: prefs.eventsFavorites,
    event_reminders: prefs.eventReminders,
  };
  const updated = await supabase.from("notification_prefs").update(row).eq("user_id", user.id).select("user_id");
  if (updated.error) {
    console.error("push prefs", updated.error.code);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
  if (!updated.data?.length) {
    const inserted = await supabase.from("notification_prefs").insert({ user_id: user.id, ...row });
    if (inserted.error && inserted.error.code !== "23505") {
      console.error("push prefs", inserted.error.code);
      return NextResponse.json({ error: "save_failed" }, { status: 500 });
    }
    if (inserted.error?.code === "23505") {
      const retry = await supabase.from("notification_prefs").update(row).eq("user_id", user.id);
      if (retry.error) return NextResponse.json({ error: "save_failed" }, { status: 500 });
    }
  }
  return NextResponse.json({
    newContentFavorites: prefs.newContentFavorites,
    notifyShorts: prefs.notifyShorts,
    eventsHomeCity: prefs.eventsHomeCity,
    eventsFavorites: prefs.eventsFavorites,
    eventReminders: prefs.eventReminders,
  });
}
