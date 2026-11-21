import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminSupabase } from "./supabase-admin.ts";
import {
  CURSOR_ID,
  DISPATCH_BATCH_CAP,
  DISPATCH_BUDGET_MS,
  DISPATCH_LEASE_MS,
  DISPATCH_MESSAGE_CAP,
  asId,
  asUuid,
  chunk,
  classifyPushResult,
  isNewContentRow,
  isNewEventRow,
  nextCursorIso,
  nextFailureCount,
  planUserNotifications,
  PUSH_GIVE_UP_AFTER,
  prefsFromRow,
  reminderWindow,
  sentKey,
  withinBudget,
  type ContentCandidate,
  type EventCandidate,
  type PushMessage,
  type PushUser,
} from "./push-dispatch.ts";
import { configureVapid, deliverPush, type PushEndpoint } from "./push-send.ts";

export type DispatchSummary = {
  ok: true;
  seeded: boolean;
  busy: boolean;
  sent: number;
  failed: number;
  removed: number;
  deferred: boolean;
};

type SubscriptionRow = PushEndpoint & {
  userId: string;
  failureCount: number;
};

type Deliver = (subscription: PushEndpoint, message: PushMessage) => Promise<{ statusCode: number | null }>;

function rowsOf(data: unknown): Record<string, unknown>[] {
  if (!Array.isArray(data)) return [];
  return data.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object" && !Array.isArray(row));
}

function textOf(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function personIdsFromEmbed(value: unknown, primary: unknown): number[] {
  const ids = new Set<number>();
  const head = asId(primary);
  if (head != null) ids.add(head);
  const list = Array.isArray(value) ? value : value ? [value] : [];
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const id = asId((entry as Record<string, unknown>).person_id);
    if (id != null) ids.add(id);
  }
  return [...ids];
}

function readSubscription(row: Record<string, unknown>): SubscriptionRow | null {
  const userId = asUuid(row.user_id);
  const endpoint = textOf(row.endpoint);
  const p256dh = textOf(row.p256dh);
  const auth = textOf(row.auth);
  if (!userId || !endpoint || !p256dh || !auth) return null;
  const failureCount = typeof row.failure_count === "number" ? row.failure_count : 0;
  return { userId, endpoint, p256dh, auth, failureCount };
}

async function loadSubscriptions(client: SupabaseClient): Promise<SubscriptionRow[]> {
  const pageSize = 1000;
  const all: SubscriptionRow[] = [];
  for (let from = 0; from < 20_000; from += pageSize) {
    const { data, error } = await client
      .from("push_subscriptions")
      .select("user_id, endpoint, p256dh, auth, failure_count")
      .order("created_at", { ascending: true })
      .order("endpoint", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const page = rowsOf(data).map(readSubscription).filter((row): row is SubscriptionRow => row != null);
    all.push(...page);
    if (!data || data.length < pageSize) break;
  }
  return all;
}

async function loadIdSets(
  client: SupabaseClient,
  table: "favorite_people" | "favorite_shows",
  column: "person_id" | "show_id",
  userIds: readonly string[],
): Promise<Map<string, Set<number>>> {
  const map = new Map<string, Set<number>>();
  for (const part of chunk(userIds, 100)) {
    const { data, error } = await client.from(table).select(`user_id, ${column}`).in("user_id", part);
    if (error) throw error;
    for (const row of rowsOf(data)) {
      const userId = asUuid(row.user_id);
      const id = asId(row[column]);
      if (!userId || id == null) continue;
      const set = map.get(userId) ?? new Set<number>();
      set.add(id);
      map.set(userId, set);
    }
  }
  return map;
}

async function loadProfiles(
  client: SupabaseClient,
  userIds: readonly string[],
): Promise<{ cities: Map<string, string | null>; prefs: Map<string, PushUser["prefs"]> }> {
  const cities = new Map<string, string | null>();
  const prefs = new Map<string, PushUser["prefs"]>();
  for (const part of chunk(userIds, 100)) {
    const [profileResult, prefResult] = await Promise.all([
      client.from("profiles").select("user_id, home_city").in("user_id", part),
      client
        .from("notification_prefs")
        .select("user_id, new_content_favorites, notify_shorts, events_home_city, events_favorites, event_reminders")
        .in("user_id", part),
    ]);
    if (profileResult.error) throw profileResult.error;
    if (prefResult.error) throw prefResult.error;
    for (const row of rowsOf(profileResult.data)) {
      const userId = asUuid(row.user_id);
      if (!userId) continue;
      cities.set(userId, typeof row.home_city === "string" ? row.home_city : null);
    }
    for (const row of rowsOf(prefResult.data)) {
      const userId = asUuid(row.user_id);
      if (!userId) continue;
      prefs.set(userId, prefsFromRow(row));
    }
  }
  return { cities, prefs };
}

async function loadContent(
  client: SupabaseClient,
  cursor: string,
  untilIso: string,
): Promise<{ items: ContentCandidate[]; stamps: string[] }> {
  const { data, error } = await client
    .from("content_items")
    .select("id, title, url, show_id, category_id, is_paid, approved_at, status, merged_into_id")
    .eq("status", "approved")
    .is("merged_into_id", null)
    .gt("approved_at", cursor)
    .lte("approved_at", untilIso)
    .order("approved_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(DISPATCH_BATCH_CAP);
  if (error) throw error;
  const raw = rowsOf(data);
  const stamps = raw
    .map((row) => textOf(row.approved_at))
    .filter((stamp) => Number.isFinite(Date.parse(stamp)))
    .sort((a, b) => Date.parse(a) - Date.parse(b));
  const ids = raw.map((row) => asId(row.id)).filter((id): id is number => id != null);
  const people = new Map<number, number[]>();
  for (const part of chunk(ids, 100)) {
    const tagged = await client
      .from("content_tags")
      .select("content_item_id, tags!inner(person_id, tag_type)")
      .in("content_item_id", part)
      .eq("tags.tag_type", "person");
    if (tagged.error) throw tagged.error;
    for (const row of rowsOf(tagged.data)) {
      const itemId = asId(row.content_item_id);
      if (itemId == null) continue;
      const current = people.get(itemId) ?? [];
      current.push(...personIdsFromEmbed(row.tags, null));
      people.set(itemId, current);
    }
  }
  const items: ContentCandidate[] = [];
  for (const row of raw) {
    const id = asId(row.id);
    const approvedAt = textOf(row.approved_at);
    if (id == null) continue;
    if (
      !isNewContentRow(
        {
          status: textOf(row.status),
          mergedIntoId: asId(row.merged_into_id),
          approvedAt: approvedAt || null,
        },
        cursor,
        untilIso,
      )
    ) {
      continue;
    }
    items.push({
      id,
      title: textOf(row.title),
      url: textOf(row.url),
      showId: asId(row.show_id),
      personIds: [...new Set(people.get(id) ?? [])],
      categoryId: asId(row.category_id),
      isPaid: row.is_paid === true,
    });
  }
  return { items, stamps };
}

function toEvent(row: Record<string, unknown>): EventCandidate | null {
  const id = asId(row.id);
  const startsAt = textOf(row.starts_at);
  if (id == null || !startsAt) return null;
  return {
    id,
    title: typeof row.title === "string" ? row.title : null,
    city: textOf(row.city),
    venue: textOf(row.venue),
    startsAt,
    status: textOf(row.status),
    personIds: personIdsFromEmbed(row.event_people, row.person_id),
  };
}

async function loadEvents(
  client: SupabaseClient,
  cursor: string,
  untilIso: string,
  nowMs: number,
): Promise<{ items: EventCandidate[]; stamps: string[] }> {
  const { data, error } = await client
    .from("events")
    .select("id, title, city, venue, starts_at, status, created_at, person_id, event_people(person_id)")
    .gt("created_at", cursor)
    .lte("created_at", untilIso)
    .in("status", ["on_sale", "sold_out"])
    .gt("starts_at", untilIso)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(DISPATCH_BATCH_CAP);
  if (error) throw error;
  const raw = rowsOf(data);
  const stamps = raw
    .map((row) => textOf(row.created_at))
    .filter((stamp) => Number.isFinite(Date.parse(stamp)))
    .sort((a, b) => Date.parse(a) - Date.parse(b));
  const items: EventCandidate[] = [];
  for (const row of raw) {
    const createdAt = textOf(row.created_at);
    const candidate = toEvent(row);
    if (!candidate) continue;
    if (!isNewEventRow({ createdAt, status: candidate.status, startsAt: candidate.startsAt }, cursor, untilIso, nowMs)) {
      continue;
    }
    items.push(candidate);
  }
  return { items, stamps };
}

async function loadReminders(
  client: SupabaseClient,
  nowMs: number,
  subscribers: ReadonlySet<string>,
): Promise<Map<string, EventCandidate[]>> {
  const window = reminderWindow(nowMs);
  const { data, error } = await client
    .from("events")
    .select("id, title, city, venue, starts_at, status, person_id, event_people(person_id), event_reminders(user_id)")
    .gte("starts_at", window.startIso)
    .lte("starts_at", window.endIso)
    .in("status", ["on_sale", "sold_out"])
    .order("starts_at", { ascending: true })
    .limit(500);
  if (error) throw error;
  const byUser = new Map<string, EventCandidate[]>();
  for (const row of rowsOf(data)) {
    const event = toEvent(row);
    if (!event) continue;
    const links = Array.isArray(row.event_reminders) ? row.event_reminders : row.event_reminders ? [row.event_reminders] : [];
    for (const link of links) {
      if (!link || typeof link !== "object") continue;
      const userId = asUuid((link as Record<string, unknown>).user_id);
      if (!userId || !subscribers.has(userId)) continue;
      const bucket = byUser.get(userId) ?? [];
      if (!bucket.some((item) => item.id === event.id)) bucket.push(event);
      byUser.set(userId, bucket);
    }
  }
  return byUser;
}

async function loadSent(
  client: SupabaseClient,
  refIds: readonly string[],
): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>();
  for (const part of chunk([...new Set(refIds)], 100)) {
    if (part.length === 0) continue;
    const { data, error } = await client
      .from("notification_log")
      .select("user_id, kind, ref_id")
      .in("ref_id", part);
    if (error) throw error;
    for (const row of rowsOf(data)) {
      const userId = asUuid(row.user_id);
      if (!userId || typeof row.kind !== "string" || typeof row.ref_id !== "string") continue;
      const set = map.get(userId) ?? new Set<string>();
      set.add(sentKey(row.kind, row.ref_id));
      map.set(userId, set);
    }
  }
  return map;
}

async function logSent(client: SupabaseClient, userId: string, message: PushMessage, sentAt: string): Promise<void> {
  const rows = message.refIds.map((refId) => ({
    user_id: userId,
    kind: message.kind,
    ref_id: refId,
    sent_at: sentAt,
  }));
  if (rows.length === 0) return;
  const { error } = await client.from("notification_log").upsert(rows, {
    onConflict: "user_id,kind,ref_id",
    ignoreDuplicates: true,
  });
  if (error) throw error;
}

const emptySummary = (overrides: Partial<DispatchSummary>): DispatchSummary => ({
  ok: true,
  seeded: false,
  busy: false,
  sent: 0,
  failed: 0,
  removed: 0,
  deferred: false,
  ...overrides,
});

export async function runPushDispatch(deps?: {
  now?: () => Date;
  client?: SupabaseClient;
  deliver?: Deliver;
  budgetMs?: number;
}): Promise<DispatchSummary> {
  configureVapid();
  const now = deps?.now ?? (() => new Date());
  const client = deps?.client ?? getAdminSupabase();
  const deliver = deps?.deliver ?? deliverPush;
  const budgetMs = deps?.budgetMs ?? DISPATCH_BUDGET_MS;
  const started = now();
  const startedIso = started.toISOString();

  const inserted = await client.from("push_cursor").insert({ id: CURSOR_ID, ran_at: startedIso });
  if (!inserted.error) return emptySummary({ seeded: true });
  if (inserted.error.code !== "23505") throw inserted.error;

  const leaseUntil = new Date(started.getTime() + DISPATCH_LEASE_MS).toISOString();
  const leased = await client.rpc("acquire_push_lease", { p_lease_until: leaseUntil });
  if (leased.error) throw leased.error;
  const cursor = typeof leased.data === "string" ? leased.data : null;
  if (!cursor) return emptySummary({ busy: true });

  let release = true;
  try {
    const summary = await scanAndSend({ client, deliver, budgetMs, started, cursor });
    const nextCursor = summary.deferred ? cursor : summary.nextCursor;
    const saved = await client
      .from("push_cursor")
      .update({ ran_at: nextCursor, lease_until: null })
      .eq("id", CURSOR_ID);
    if (saved.error) throw saved.error;
    release = false;
    return emptySummary({
      sent: summary.sent,
      failed: summary.failed,
      removed: summary.removed,
      deferred: summary.deferred,
    });
  } finally {
    if (release) {
      const cleared = await client.from("push_cursor").update({ lease_until: null }).eq("id", CURSOR_ID);
      if (cleared.error) console.error("push lease", cleared.error.code);
    }
  }
}

async function scanAndSend(input: {
  client: SupabaseClient;
  deliver: Deliver;
  budgetMs: number;
  started: Date;
  cursor: string;
}): Promise<{ sent: number; failed: number; removed: number; deferred: boolean; nextCursor: string }> {
  const { client, deliver, budgetMs, started, cursor } = input;
  const startedMs = started.getTime();
  const startedIso = started.toISOString();
  const subscriptions = await loadSubscriptions(client);
  const userIds = [...new Set(subscriptions.map((row) => row.userId))];

  if (userIds.length === 0) {
    return { sent: 0, failed: 0, removed: 0, deferred: false, nextCursor: startedIso };
  }

  const subscribers = new Set(userIds);
  const [people, shows, profileData, content, events, reminders] = await Promise.all([
    loadIdSets(client, "favorite_people", "person_id", userIds),
    loadIdSets(client, "favorite_shows", "show_id", userIds),
    loadProfiles(client, userIds),
    loadContent(client, cursor, startedIso),
    loadEvents(client, cursor, startedIso, startedMs),
    loadReminders(client, startedMs, subscribers),
  ]);

  const refIds = [
    ...content.items.map((item) => String(item.id)),
    ...events.items.map((item) => String(item.id)),
    ...[...reminders.values()].flat().map((item) => String(item.id)),
  ];
  const sentLog = await loadSent(client, refIds);
  const devices = new Map<string, SubscriptionRow[]>();
  for (const subscription of subscriptions) {
    const list = devices.get(subscription.userId) ?? [];
    list.push(subscription);
    devices.set(subscription.userId, list);
  }

  const jobs: { userId: string; messages: PushMessage[] }[] = [];
  for (const userId of userIds) {
    const messages = planUserNotifications({
      user: {
        prefs: profileData.prefs.get(userId) ?? prefsFromRow(null),
        personIds: people.get(userId) ?? new Set<number>(),
        showIds: shows.get(userId) ?? new Set<number>(),
        homeCity: profileData.cities.get(userId) ?? null,
      },
      content: content.items,
      events: events.items,
      reminders: reminders.get(userId) ?? [],
      sent: sentLog.get(userId) ?? new Set<string>(),
      nowMs: startedMs,
    });
    if (messages.length > 0) jobs.push({ userId, messages });
  }

  let sent = 0;
  let failed = 0;
  let removed = 0;
  let deferred = false;
  let stop = false;
  let attemptedMessages = 0;

  for (const job of jobs) {
    if (stop) break;
    for (const message of job.messages) {
      if (!withinBudget(startedMs, Date.now(), budgetMs) || attemptedMessages >= DISPATCH_MESSAGE_CAP) {
        deferred = true;
        stop = true;
        break;
      }
      attemptedMessages += 1;
      const outcome = await sendMessage({
        client,
        deliver,
        devices: devices.get(job.userId) ?? [],
        message,
        startedMs,
        budgetMs,
      });
      removed += outcome.removed;
      if (outcome.status === "sent") sent += 1;
      else if (outcome.status === "retry") {
        // A live endpoint failed. Keep the cursor so the next tick can try again.
        failed += 1;
        deferred = true;
      } else if (outcome.status === "deferred") {
        deferred = true;
        stop = true;
        break;
      }
    }
  }

  const nextCursor = nextCursorIso({
    startedAt: startedIso,
    contentStamps: content.stamps,
    eventStamps: events.stamps,
    cap: DISPATCH_BATCH_CAP,
    finishedUsers: !deferred,
    previous: cursor,
  });
  return { sent, failed, removed, deferred, nextCursor };
}

async function sendMessage(input: {
  client: SupabaseClient;
  deliver: Deliver;
  devices: SubscriptionRow[];
  message: PushMessage;
  startedMs: number;
  budgetMs: number;
}): Promise<{ status: "sent" | "retry" | "skipped" | "deferred"; removed: number }> {
  const { client, deliver, devices, message, startedMs, budgetMs } = input;
  const userId = devices[0]?.userId ?? null;
  let delivered = false;
  let retry = false;
  let removed = 0;
  for (const device of devices) {
    if (!withinBudget(startedMs, Date.now(), budgetMs)) {
      if (delivered && userId) await logSent(client, userId, message, new Date().toISOString());
      return { status: delivered ? "sent" : "deferred", removed };
    }
    let statusCode: number | null = null;
    try {
      const result = await deliver(device, message);
      statusCode = result.statusCode;
    } catch {
      statusCode = null;
    }
    const kind = classifyPushResult(statusCode);
    if (kind === "gone") {
      removed += 1;
      const deleted = await client.from("push_subscriptions").delete().eq("endpoint", device.endpoint);
      if (deleted.error) throw deleted.error;
      continue;
    }
    if (kind === "ok") {
      delivered = true;
      device.failureCount = 0;
      const marked = await client
        .from("push_subscriptions")
        .update({ last_success_at: new Date().toISOString(), failure_count: 0 })
        .eq("endpoint", device.endpoint);
      if (marked.error) throw marked.error;
      continue;
    }
    console.error("push send failed", statusCode);
    device.failureCount = nextFailureCount(device.failureCount);
    if (device.failureCount >= PUSH_GIVE_UP_AFTER) {
      removed += 1;
      const deleted = await client.from("push_subscriptions").delete().eq("endpoint", device.endpoint);
      if (deleted.error) throw deleted.error;
      continue;
    }
    retry = true;
    const marked = await client
      .from("push_subscriptions")
      .update({ failure_count: device.failureCount })
      .eq("endpoint", device.endpoint);
    if (marked.error) throw marked.error;
  }
  if (delivered && userId) {
    await logSent(client, userId, message, new Date().toISOString());
    return { status: "sent", removed };
  }
  if (retry) return { status: "retry", removed };
  return { status: "skipped", removed };
}
