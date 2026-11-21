"use server";

import { normalizeHomeCity } from "@/lib/home-city";
import { getServerSupabase } from "@/lib/supabase-server";

function asPositiveId(value: unknown): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return value;
  if (typeof value === "string" && /^[1-9]\d*$/.test(value)) {
    const id = Number(value);
    return Number.isSafeInteger(id) ? id : null;
  }
  return null;
}

const SAVE_ERROR = "Nie udało się zapisać. Spróbuj jeszcze raz.";
const SIGN_IN_ERROR = "Zaloguj się, żeby zapisać to na koncie.";

type Ok<T> = { ok: true } & T;
type Err = { ok: false; error: string };

export type ReminderRow = {
  eventId: number;
  title: string;
  startsAt: string;
  city: string;
  venue: string;
  ticketUrl: string;
};

async function requireUser() {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, user: null };
  return { supabase, user: data.user };
}

function ids(raw: number[], cap = 200): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  for (const value of raw) {
    const id = asPositiveId(value);
    if (id == null || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= cap) break;
  }
  return out;
}

export async function readHomeCity(): Promise<string | null> {
  const { supabase, user } = await requireUser();
  if (!user) return null;
  const { data, error } = await supabase.from("profiles").select("home_city").eq("user_id", user.id).maybeSingle();
  if (error || !data) return null;
  return normalizeHomeCity(typeof data.home_city === "string" ? data.home_city : null);
}

export async function saveHomeCity(raw: string | null): Promise<Ok<{ city: string | null }> | Err> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: SIGN_IN_ERROR };
  const trimmed = raw?.trim() ?? "";
  const city = normalizeHomeCity(raw);
  if (trimmed && !city) return { ok: false, error: "Podaj samo miasto, bez adresu." };

  const { data, error } = await supabase
    .from("profiles")
    .update({ home_city: city })
    .eq("user_id", user.id)
    .select("home_city");
  if (error || !data?.length) {
    console.error("home city", error?.code);
    return { ok: false, error: SAVE_ERROR };
  }
  return { ok: true, city };
}

export async function listCities(): Promise<string[]> {
  const { supabase, user } = await requireUser();
  if (!user) return [];
  const [events, mics] = await Promise.all([
    supabase.from("events").select("city").limit(1000),
    supabase.from("open_mics").select("city").in("status", ["active", "to_verify"]).limit(1000),
  ]);
  const names = new Set<string>();
  for (const row of [...(events.data ?? []), ...(mics.data ?? [])]) {
    const city = normalizeHomeCity(typeof row.city === "string" ? row.city : null);
    if (city) names.add(city);
  }
  return [...names].sort((a, b) => a.localeCompare(b, "pl"));
}

export async function loadMyPlans(eventIds: number[]): Promise<
  Ok<{ reminders: number[]; going: number[]; attended: number[] }> | Err
> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: true, reminders: [], going: [], attended: [] };
  const wanted = ids(eventIds);
  if (wanted.length === 0) return { ok: true, reminders: [], going: [], attended: [] };

  const [reminders, attendance] = await Promise.all([
    supabase.from("event_reminders").select("event_id").in("event_id", wanted),
    supabase.from("event_attendance").select("event_id, status").in("event_id", wanted),
  ]);
  if (reminders.error || attendance.error) {
    console.error("plans", reminders.error?.code, attendance.error?.code);
    return { ok: false, error: SAVE_ERROR };
  }

  const going: number[] = [];
  const attended: number[] = [];
  for (const row of attendance.data ?? []) {
    const id = asPositiveId(row.event_id);
    if (id == null) continue;
    if (row.status === "going") going.push(id);
    if (row.status === "attended") attended.push(id);
  }
  return {
    ok: true,
    reminders: (reminders.data ?? []).map((row) => asPositiveId(row.event_id)).filter((id): id is number => id != null),
    going,
    attended,
  };
}

async function eventIsUpcoming(
  supabase: Awaited<ReturnType<typeof getServerSupabase>>,
  eventId: number,
): Promise<boolean> {
  const { data, error } = await supabase.from("events").select("id, starts_at").eq("id", eventId).maybeSingle();
  if (error || !data) return false;
  const starts = new Date(String(data.starts_at)).getTime();
  return Number.isFinite(starts) && starts > Date.now();
}

export async function setReminder(eventId: number, on: boolean): Promise<{ ok: true } | Err> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: SIGN_IN_ERROR };
  const id = asPositiveId(eventId);
  if (id == null) return { ok: false, error: SAVE_ERROR };

  if (!on) {
    const { error } = await supabase.from("event_reminders").delete().eq("user_id", user.id).eq("event_id", id);
    if (error) {
      console.error("reminder delete", error.code);
      return { ok: false, error: SAVE_ERROR };
    }
    return { ok: true };
  }

  if (!(await eventIsUpcoming(supabase, id))) {
    return { ok: false, error: "Przypomnienie działa dla nadchodzących występów." };
  }
  const { error } = await supabase.from("event_reminders").upsert(
    [{ user_id: user.id, event_id: id }],
    { onConflict: "user_id,event_id", ignoreDuplicates: true },
  );
  if (error) {
    console.error("reminder write", error.code);
    return { ok: false, error: SAVE_ERROR };
  }
  return { ok: true };
}

export async function setAttendance(
  eventId: number,
  status: "going" | "attended" | null,
): Promise<{ ok: true } | Err> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: SIGN_IN_ERROR };
  const id = asPositiveId(eventId);
  if (id == null) return { ok: false, error: SAVE_ERROR };

  if (status == null) {
    const { error } = await supabase.from("event_attendance").delete().eq("user_id", user.id).eq("event_id", id);
    if (error) {
      console.error("attendance delete", error.code);
      return { ok: false, error: SAVE_ERROR };
    }
    return { ok: true };
  }

  if (status === "going" && !(await eventIsUpcoming(supabase, id))) {
    return { ok: false, error: "„Idę” jest dla występów, które dopiero będą." };
  }

  const { error } = await supabase.from("event_attendance").upsert(
    { user_id: user.id, event_id: id, status },
    { onConflict: "user_id,event_id" },
  );
  if (error) {
    console.error("attendance write", error.code);
    if (error.message.includes("attended_requires_past_event")) {
      return { ok: false, error: "„Byłem” jest tylko dla występów, które już się odbyły." };
    }
    return { ok: false, error: SAVE_ERROR };
  }
  return { ok: true };
}

export async function loadMyReminders(): Promise<Ok<{ reminders: ReminderRow[] }> | Err> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: true, reminders: [] };
  const { data, error } = await supabase.rpc("my_event_reminders");
  if (error || !Array.isArray(data)) {
    console.error("reminders", error?.code);
    return { ok: false, error: SAVE_ERROR };
  }
  const reminders: ReminderRow[] = [];
  for (const row of data as Record<string, unknown>[]) {
    const eventId = asPositiveId(row.event_id);
    const startsAt = typeof row.starts_at === "string" ? row.starts_at : "";
    if (eventId == null || !startsAt) continue;
    reminders.push({
      eventId,
      title: typeof row.title === "string" ? row.title : "",
      startsAt,
      city: typeof row.city === "string" ? row.city : "",
      venue: typeof row.venue === "string" ? row.venue : "",
      ticketUrl: typeof row.ticket_url === "string" ? row.ticket_url : "",
    });
  }
  return { ok: true, reminders };
}
