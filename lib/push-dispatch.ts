import { LISTED_EVENT_STATUSES, formatEventWhen, trasyHref } from "./events.ts";
import { HOME_NOWE_SHORTS_CATEGORY_ID } from "./home-nowe.ts";
import { normalizeHomeCity } from "./home-city.ts";

/** One logical notification. At most one content push and one event push per user per run. */
export type PushKind = "new_content" | "new_event" | "event_reminder";

/** categories.id for Shorts (slug "shorts"). */
export const PUSH_SHORTS_CATEGORY_ID = HOME_NOWE_SHORTS_CATEGORY_ID;

export type PushPrefs = {
  newContentFavorites: boolean;
  /** Shorts from favourites. Off unless the account turns Shorty on. */
  notifyShorts: boolean;
  eventsHomeCity: boolean;
  eventsFavorites: boolean;
  eventReminders: boolean;
};

/** No stored row: content and event switches on, Shorty off. */
export const DEFAULT_PUSH_PREFS: PushPrefs = {
  newContentFavorites: true,
  notifyShorts: false,
  eventsHomeCity: true,
  eventsFavorites: true,
  eventReminders: true,
};

export type PushUser = {
  prefs: PushPrefs;
  personIds: ReadonlySet<number>;
  showIds: ReadonlySet<number>;
  homeCity: string | null;
};

export type ContentCandidate = {
  id: number;
  title: string;
  url: string;
  showId: number | null;
  personIds: readonly number[];
  /** null when the row has no category. Shorts are category id 4. */
  categoryId: number | null;
};

export type EventCandidate = {
  id: number;
  title: string | null;
  city: string;
  venue: string;
  startsAt: string;
  status: string;
  personIds: readonly number[];
};

export type PushMessage = {
  kind: PushKind;
  title: string;
  body: string;
  icon: string;
  /** Monochrome status-bar mask. Omitted payloads use PUSH_BADGE at send time. */
  badge?: string;
  url: string;
  refIds: string[];
};

/** Colour app icon, same file as the PWA manifest. Shown large in the shade. */
export const PUSH_ICON = "/favicon-192.png";
/** White "p." on transparency. Android uses this alpha as the status-bar mask. */
export const PUSH_BADGE = "/icons/badge-96.png";

/** JSON the service worker reads. Title and body are unchanged; badge is the mask. */
export function notificationPayload(message: Pick<PushMessage, "title" | "body" | "icon" | "url" | "badge">) {
  return {
    title: message.title,
    body: message.body,
    icon: message.icon || PUSH_ICON,
    badge: message.badge || PUSH_BADGE,
    url: message.url,
  };
}

export const CURSOR_ID = "dispatch";
export const DISPATCH_BATCH_CAP = 200;
export const DISPATCH_BUDGET_MS = 45_000;
export const DISPATCH_LEASE_MS = 2 * 60 * 1000;
export const DISPATCH_MESSAGE_CAP = 250;

/** About 24h before the event. The cron ticks every 15 minutes, so the window is ±15 min. */
export const REMINDER_LEAD_MS = 24 * 60 * 60 * 1000;
export const REMINDER_SLACK_MS = 15 * 60 * 1000;

const LISTED = new Set<string>(LISTED_EVENT_STATUSES);
const ENDPOINT_RE = /^https:\/\/\S{8,1980}$/;
const KEY_RE = /^[A-Za-z0-9\-_]{8,200}={0,2}$/;

export function asId(value: unknown): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return value;
  if (typeof value === "string" && /^[1-9]\d*$/.test(value)) {
    const id = Number(value);
    return Number.isSafeInteger(id) ? id : null;
  }
  return null;
}

export function asUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value : null;
}

export function clipText(value: string, max = 180): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

/** Polish numeral: 1 nowy, 3 nowe, 5 nowych, 12 nowych, 22 nowe. */
export function polishCount(count: number, one: string, few: string, many: string): string {
  const n = Math.abs(Math.trunc(count));
  const mod10 = n % 10;
  const mod100 = n % 100;
  let form = many;
  if (n === 1) form = one;
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) form = few;
  return `${n} ${form}`;
}

export function sentKey(kind: string, refId: string): string {
  return `${kind}:${refId}`;
}

export function sameCity(home: string | null, city: string | null): boolean {
  const left = normalizeHomeCity(home);
  const right = normalizeHomeCity(city);
  if (!left || !right) return false;
  return left.toLocaleLowerCase("pl") === right.toLocaleLowerCase("pl");
}

export function isListedStatus(status: string): boolean {
  return LISTED.has(status);
}

export function isUpcoming(startsAt: string, nowMs: number): boolean {
  const starts = Date.parse(startsAt);
  return Number.isFinite(starts) && starts > nowMs;
}

export function isShortContent(item: Pick<ContentCandidate, "categoryId">): boolean {
  return item.categoryId === PUSH_SHORTS_CATEGORY_ID;
}

/**
 * Favourite person or show, then the switch for that kind of material.
 * Shorts ignore the general content switch and require Shorty. Anything else
 * requires the general switch and is never treated as a short.
 */
export function contentMatches(item: ContentCandidate, user: PushUser): boolean {
  const favorite =
    (item.showId != null && user.showIds.has(item.showId)) ||
    item.personIds.some((id) => user.personIds.has(id));
  if (!favorite) return false;
  if (isShortContent(item)) return user.prefs.notifyShorts;
  return user.prefs.newContentFavorites;
}

export function eventMatches(event: EventCandidate, user: PushUser, nowMs: number): boolean {
  if (!isListedStatus(event.status) || !isUpcoming(event.startsAt, nowMs)) return false;
  const byPerson = user.prefs.eventsFavorites && event.personIds.some((id) => user.personIds.has(id));
  const byCity = user.prefs.eventsHomeCity && sameCity(user.homeCity, event.city);
  return byPerson || byCity;
}

export function isReminderDue(startsAt: string, nowMs: number): boolean {
  const starts = Date.parse(startsAt);
  if (!Number.isFinite(starts)) return false;
  const delta = starts - nowMs;
  return delta >= REMINDER_LEAD_MS - REMINDER_SLACK_MS && delta <= REMINDER_LEAD_MS + REMINDER_SLACK_MS;
}

export function reminderWindow(nowMs: number): { startIso: string; endIso: string } {
  return {
    startIso: new Date(nowMs + REMINDER_LEAD_MS - REMINDER_SLACK_MS).toISOString(),
    endIso: new Date(nowMs + REMINDER_LEAD_MS + REMINDER_SLACK_MS).toISOString(),
  };
}

export function reminderAllowed(event: Pick<EventCandidate, "status" | "startsAt">, prefs: PushPrefs, nowMs: number): boolean {
  if (!prefs.eventReminders) return false;
  if (!isListedStatus(event.status)) return false;
  return isReminderDue(event.startsAt, nowMs);
}

export function isNewContentRow(
  row: { status: string; mergedIntoId: number | null; approvedAt: string | null },
  cursorIso: string,
  untilIso: string,
): boolean {
  if (row.status !== "approved" || row.mergedIntoId != null || !row.approvedAt) return false;
  const at = Date.parse(row.approvedAt);
  const cursor = Date.parse(cursorIso);
  const until = Date.parse(untilIso);
  return Number.isFinite(at) && at > cursor && at <= until;
}

export function isNewEventRow(
  row: { createdAt: string; status: string; startsAt: string },
  cursorIso: string,
  untilIso: string,
  nowMs: number,
): boolean {
  if (!isListedStatus(row.status) || !isUpcoming(row.startsAt, nowMs)) return false;
  const at = Date.parse(row.createdAt);
  const cursor = Date.parse(cursorIso);
  const until = Date.parse(untilIso);
  return Number.isFinite(at) && at > cursor && at <= until;
}

/** No stored cursor: persist "now" and do not send. A later run scans after that instant. */
export function decideCursor(existingRanAt: string | null, nowIso: string): { dispatch: boolean; ranAt: string } {
  if (!existingRanAt) return { dispatch: false, ranAt: nowIso };
  return { dispatch: true, ranAt: existingRanAt };
}

/**
 * Stamps are ascending. A full batch moves the cursor to the last stamp that
 * is strictly older than the final stamp, so a tie on the boundary is scanned
 * again instead of dropped. If the whole batch shares one stamp, that stamp
 * is the watermark (otherwise a full tie would never advance).
 */
export function batchWatermark(stamps: readonly string[], cap: number, startedAt: string): string {
  if (stamps.length < cap || stamps.length === 0) return startedAt;
  const last = Date.parse(stamps[stamps.length - 1]);
  if (!Number.isFinite(last)) return startedAt;
  for (let i = stamps.length - 2; i >= 0; i -= 1) {
    const stamp = Date.parse(stamps[i]);
    if (Number.isFinite(stamp) && stamp < last) return new Date(stamp).toISOString();
  }
  return new Date(last).toISOString();
}

export function nextCursorIso(input: {
  startedAt: string;
  contentStamps: readonly string[];
  eventStamps: readonly string[];
  cap: number;
  finishedUsers: boolean;
  previous: string;
}): string {
  if (!input.finishedUsers) return input.previous;
  const contentMark = batchWatermark(input.contentStamps, input.cap, input.startedAt);
  const eventMark = batchWatermark(input.eventStamps, input.cap, input.startedAt);
  const nextMs = Math.min(Date.parse(contentMark), Date.parse(eventMark));
  const prevMs = Date.parse(input.previous);
  const chosen = Math.max(
    Number.isFinite(nextMs) ? nextMs : prevMs,
    Number.isFinite(prevMs) ? prevMs : nextMs,
  );
  return new Date(chosen).toISOString();
}

export function withinBudget(startedMs: number, nowMs: number, budgetMs = DISPATCH_BUDGET_MS): boolean {
  return nowMs - startedMs < budgetMs;
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const n = Math.max(1, Math.floor(size));
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += n) out.push(items.slice(i, i + n));
  return out;
}

export function safePushUrl(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback;
  const trimmed = raw.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.startsWith("/\\")) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.protocol === "https:") return url.href;
  } catch {
    // Not a URL. Callers keep the in-app fallback.
  }
  return fallback;
}

export function classifyPushResult(statusCode: number | null): "ok" | "gone" | "fail" {
  if (statusCode != null && statusCode >= 200 && statusCode < 300) return "ok";
  if (statusCode === 404 || statusCode === 410) return "gone";
  return "fail";
}

/** After this many consecutive failures the endpoint is dropped so one dead device cannot hold the cursor. */
export const PUSH_GIVE_UP_AFTER = 8;

export function nextFailureCount(current: number): number {
  if (!Number.isFinite(current) || current < 0) return 1;
  return Math.min(Math.floor(current) + 1, 1_000_000);
}

export function pushTtlSeconds(kind: PushKind): number {
  if (kind === "event_reminder") return 6 * 60 * 60;
  return 24 * 60 * 60;
}

export function prefsFromRow(row: object | null): PushPrefs {
  if (!row) return { ...DEFAULT_PUSH_PREFS };
  const record = row as Record<string, unknown>;
  return {
    newContentFavorites: record.new_content_favorites !== false,
    notifyShorts: record.notify_shorts === true,
    eventsHomeCity: record.events_home_city !== false,
    eventsFavorites: record.events_favorites !== false,
    eventReminders: record.event_reminders !== false,
  };
}

export function parsePushPrefs(body: unknown): PushPrefs | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  const newContentFavorites = record.newContentFavorites;
  const notifyShorts = record.notifyShorts;
  const eventsHomeCity = record.eventsHomeCity;
  const eventsFavorites = record.eventsFavorites;
  const eventReminders = record.eventReminders;
  if (
    typeof newContentFavorites !== "boolean" ||
    typeof notifyShorts !== "boolean" ||
    typeof eventsHomeCity !== "boolean" ||
    typeof eventsFavorites !== "boolean" ||
    typeof eventReminders !== "boolean"
  ) {
    return null;
  }
  return { newContentFavorites, notifyShorts, eventsHomeCity, eventsFavorites, eventReminders };
}

export function parsePushSubscription(body: unknown): { endpoint: string; p256dh: string; auth: string } | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  const endpoint = typeof record.endpoint === "string" ? record.endpoint.trim() : "";
  const keys = record.keys;
  if (!keys || typeof keys !== "object" || Array.isArray(keys)) return null;
  const keyRecord = keys as Record<string, unknown>;
  const p256dh = typeof keyRecord.p256dh === "string" ? keyRecord.p256dh.trim() : "";
  const auth = typeof keyRecord.auth === "string" ? keyRecord.auth.trim() : "";
  if (!ENDPOINT_RE.test(endpoint) || !KEY_RE.test(p256dh) || !KEY_RE.test(auth)) return null;
  return { endpoint, p256dh, auth };
}

export function parsePushEndpoint(body: unknown): string | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const endpoint = (body as Record<string, unknown>).endpoint;
  if (typeof endpoint !== "string") return null;
  const trimmed = endpoint.trim();
  return ENDPOINT_RE.test(trimmed) ? trimmed : null;
}

export function eventPushLabel(event: Pick<EventCandidate, "title" | "city" | "venue">): string {
  const title = event.title?.trim() ?? "";
  if (title) return title;
  const place = [event.city.trim(), event.venue.trim()].filter(Boolean).join(" · ");
  return place || "Występ";
}

function sharedCity(events: readonly { city: string }[]): string | null {
  const names = events.map((event) => event.city.trim()).filter(Boolean);
  if (names.length !== events.length || names.length === 0) return null;
  const key = names[0].toLocaleLowerCase("pl");
  if (!names.every((name) => name.toLocaleLowerCase("pl") === key)) return null;
  return names[0];
}

export function aggregateContent(items: readonly ContentCandidate[]): PushMessage | null {
  if (items.length === 0) return null;
  const ordered = [...items].sort((a, b) => a.id - b.id);
  const refIds = ordered.map((item) => String(item.id));
  if (ordered.length === 1) {
    const title = ordered[0].title.trim();
    return {
      kind: "new_content",
      title: clipText(title ? `Nowy materiał: ${title}` : "Nowy materiał"),
      body: "",
      icon: PUSH_ICON,
      url: safePushUrl(ordered[0].url, "/ulubione"),
      refIds,
    };
  }
  return {
    kind: "new_content",
    title: `${polishCount(ordered.length, "nowy materiał", "nowe materiały", "nowych materiałów")} od Twoich ulubionych`,
    body: "",
    icon: PUSH_ICON,
    url: "/ulubione",
    refIds,
  };
}

export function aggregateEvents(items: readonly EventCandidate[]): PushMessage | null {
  if (items.length === 0) return null;
  const ordered = [...items].sort((a, b) => a.id - b.id);
  const refIds = ordered.map((item) => String(item.id));
  const city = sharedCity(ordered);
  const url = city ? trasyHref({ miasto: city }) : "/trasy";
  if (ordered.length === 1) {
    return {
      kind: "new_event",
      title: clipText(`Nowy występ: ${eventPushLabel(ordered[0])}`),
      body: "",
      icon: PUSH_ICON,
      url,
      refIds,
    };
  }
  return {
    kind: "new_event",
    title: polishCount(ordered.length, "nowy występ", "nowe występy", "nowych występów"),
    body: "",
    icon: PUSH_ICON,
    url,
    refIds,
  };
}

export function reminderMessage(event: EventCandidate): PushMessage {
  const place = [event.city.trim(), event.venue.trim()].filter(Boolean).join(" · ");
  const when = formatEventWhen(event.startsAt);
  const city = event.city.trim();
  return {
    kind: "event_reminder",
    title: clipText(`Przypomnienie: ${eventPushLabel(event)}`),
    body: clipText([when, place].filter(Boolean).join(" · ")),
    icon: PUSH_ICON,
    url: city ? trasyHref({ miasto: city }) : "/trasy",
    refIds: [String(event.id)],
  };
}

export function planUserNotifications(input: {
  user: PushUser;
  content: readonly ContentCandidate[];
  events: readonly EventCandidate[];
  reminders: readonly EventCandidate[];
  sent: ReadonlySet<string>;
  nowMs: number;
}): PushMessage[] {
  const messages: PushMessage[] = [];
  const due = input.reminders.filter((event) => {
    if (!reminderAllowed(event, input.user.prefs, input.nowMs)) return false;
    return !input.sent.has(sentKey("event_reminder", String(event.id)));
  });
  due.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt) || a.id - b.id);
  const seenReminders = new Set<number>();
  for (const event of due) {
    if (seenReminders.has(event.id)) continue;
    seenReminders.add(event.id);
    messages.push(reminderMessage(event));
  }

  // Checked here, at send time, so a short still waiting in this cursor window
  // (including a retry of a deferred run) is dropped for accounts that have not opted in.
  const freshContent = input.content.filter(
    (item) => contentMatches(item, input.user) && !input.sent.has(sentKey("new_content", String(item.id))),
  );
  const contentMessage = aggregateContent(freshContent);
  if (contentMessage) messages.push(contentMessage);

  const freshEvents = input.events.filter(
    (event) => eventMatches(event, input.user, input.nowMs) && !input.sent.has(sentKey("new_event", String(event.id))),
  );
  const eventMessage = aggregateEvents(freshEvents);
  if (eventMessage) messages.push(eventMessage);

  return messages;
}
