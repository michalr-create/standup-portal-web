import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  DEFAULT_PUSH_PREFS,
  aggregateContent,
  aggregateEvents,
  batchWatermark,
  classifyPushResult,
  contentMatches,
  decideCursor,
  eventMatches,
  isNewContentRow,
  isNewEventRow,
  isReminderDue,
  nextCursorIso,
  parsePushEndpoint,
  parsePushSubscription,
  planUserNotifications,
  polishCount,
  reminderAllowed,
  safePushUrl,
  sentKey,
  type ContentCandidate,
  type EventCandidate,
  type PushPrefs,
  type PushUser,
} from "./push-dispatch.ts";

const NOW = Date.parse("2026-11-21T12:00:00.000Z");
const LEAD = 24 * 60 * 60 * 1000;
const SLACK = 15 * 60 * 1000;
const CURSOR = "2026-11-21T11:00:00.000Z";
const UNTIL = "2026-11-21T12:00:00.000Z";

function prefs(overrides: Partial<PushPrefs> = {}): PushPrefs {
  return { ...DEFAULT_PUSH_PREFS, ...overrides };
}

function user(overrides: Partial<PushUser> = {}): PushUser {
  return {
    prefs: prefs(),
    personIds: new Set([7]),
    showIds: new Set([3]),
    homeCity: "Kraków",
    ...overrides,
  };
}

function content(overrides: Partial<ContentCandidate> = {}): ContentCandidate {
  return {
    id: 1,
    title: "Wentyl",
    url: "https://www.youtube.com/watch?v=abc",
    showId: null,
    personIds: [7],
    ...overrides,
  };
}

function event(overrides: Partial<EventCandidate> = {}): EventCandidate {
  return {
    id: 10,
    title: "Wentyl w klubie",
    city: "Kraków",
    venue: "Klub",
    startsAt: new Date(NOW + 48 * 60 * 60 * 1000).toISOString(),
    status: "on_sale",
    personIds: [7],
    ...overrides,
  };
}

function at(delta: number): string {
  return new Date(NOW + delta).toISOString();
}

test("content matches a favorite person or a favorite show, and the switch can turn it off", () => {
  const reader = user();
  assert.equal(contentMatches(content(), reader), true);
  assert.equal(contentMatches(content({ personIds: [9], showId: 3 }), reader), true);
  assert.equal(contentMatches(content({ personIds: [9], showId: 4 }), reader), false);
  assert.equal(contentMatches(content(), user({ prefs: prefs({ newContentFavorites: false }) })), false);
});

test("one new item names it, several collapse into one push to /ulubione", () => {
  const one = aggregateContent([content({ id: 4, title: "Parkowanie" })]);
  assert.equal(one?.title, "Nowy materiał: Parkowanie");
  assert.equal(one?.url, "https://www.youtube.com/watch?v=abc");
  assert.deepEqual(one?.refIds, ["4"]);

  const many = aggregateContent([
    content({ id: 3, title: "C" }),
    content({ id: 1, title: "A" }),
    content({ id: 2, title: "B" }),
  ]);
  assert.equal(many?.title, "3 nowe materiały od Twoich ulubionych");
  assert.equal(many?.url, "/ulubione");
  assert.deepEqual(many?.refIds, ["1", "2", "3"]);
  assert.equal(aggregateContent([]) , null);
});

test("polish plurals follow 3 / 5 / 12 / 22", () => {
  const phrase = (n: number) => polishCount(n, "nowy materiał", "nowe materiały", "nowych materiałów");
  assert.equal(phrase(1), "1 nowy materiał");
  assert.equal(phrase(3), "3 nowe materiały");
  assert.equal(phrase(5), "5 nowych materiałów");
  assert.equal(phrase(12), "12 nowych materiałów");
  assert.equal(phrase(14), "14 nowych materiałów");
  assert.equal(phrase(21), "21 nowych materiałów");
  assert.equal(phrase(22), "22 nowe materiały");
  assert.equal(aggregateContent([content({ id: 1 }), content({ id: 2 }), content({ id: 3 }), content({ id: 4 }), content({ id: 5 })])?.title,
    "5 nowych materiałów od Twoich ulubionych");
});

test("already logged items drop out of the aggregate, and a single survivor is named", () => {
  const items = [
    content({ id: 1, title: "A" }),
    content({ id: 2, title: "B" }),
    content({ id: 3, title: "C", personIds: [99] }),
  ];
  const sent = new Set([sentKey("new_content", "2")]);
  const messages = planUserNotifications({
    user: user(),
    content: items,
    events: [],
    reminders: [],
    sent,
    nowMs: NOW,
  });
  assert.equal(messages.length, 1);
  assert.equal(messages[0].kind, "new_content");
  assert.equal(messages[0].title, "Nowy materiał: A");
  assert.deepEqual(messages[0].refIds, ["1"]);

  const twoLeft = planUserNotifications({
    user: user(),
    content: [content({ id: 1, title: "A" }), content({ id: 2, title: "B" }), content({ id: 8, title: "H" })],
    events: [],
    reminders: [],
    sent: new Set([sentKey("new_content", "8")]),
    nowMs: NOW,
  });
  assert.equal(twoLeft.length, 1);
  assert.equal(twoLeft[0].title, "2 nowe materiały od Twoich ulubionych");
  assert.deepEqual(twoLeft[0].refIds, ["1", "2"]);

  const none = planUserNotifications({
    user: user(),
    content: [content({ id: 1 })],
    events: [],
    reminders: [],
    sent: new Set([sentKey("new_content", "1")]),
    nowMs: NOW,
  });
  assert.deepEqual(none, []);
});

test("a run plans at most one content push and one event push", () => {
  const messages = planUserNotifications({
    user: user(),
    content: [content({ id: 1 }), content({ id: 2 })],
    events: [event({ id: 10 }), event({ id: 11, title: "Drugi" })],
    reminders: [],
    sent: new Set(),
    nowMs: NOW,
  });
  assert.deepEqual(messages.map((message) => message.kind), ["new_content", "new_event"]);
  assert.equal(messages[1].title, "2 nowe występy");
  assert.equal(messages[1].url, "/trasy?miasto=Krak%C3%B3w");
});

test("events match the home city or a favorite person, once, and only while listed and upcoming", () => {
  const reader = user({ personIds: new Set([7]) });
  assert.equal(eventMatches(event({ city: "kraków", personIds: [1] }), reader, NOW), true);
  assert.equal(eventMatches(event({ city: "Gdańsk", personIds: [7] }), reader, NOW), true);
  assert.equal(eventMatches(event({ city: "Gdańsk", personIds: [1] }), reader, NOW), false);
  assert.equal(
    eventMatches(event({ city: "Kraków", personIds: [99] }), user({ prefs: prefs({ eventsHomeCity: false }), personIds: new Set([1]) }), NOW),
    false,
  );
  assert.equal(
    eventMatches(event({ city: "Gdańsk", personIds: [7] }), user({ prefs: prefs({ eventsFavorites: false }) }), NOW),
    false,
  );
  assert.equal(eventMatches(event({ status: "cancelled" }), reader, NOW), false);
  assert.equal(eventMatches(event({ startsAt: new Date(NOW - 60_000).toISOString() }), reader, NOW), false);
  assert.equal(eventMatches(event({ city: "Zielona   Góra", personIds: [1] }), user({ homeCity: "Zielona Góra", personIds: new Set([1]) }), NOW), true);

  const bothReasons = planUserNotifications({
    user: reader,
    content: [],
    events: [event({ id: 5, city: "Kraków", personIds: [7] })],
    reminders: [],
    sent: new Set(),
    nowMs: NOW,
  });
  assert.equal(bothReasons.length, 1);
  assert.equal(bothReasons[0].title, "Nowy występ: Wentyl w klubie");
});

test("events in different cities link to the whole tour list", () => {
  const message = aggregateEvents([
    event({ id: 1, city: "Kraków" }),
    event({ id: 2, city: "Wrocław", title: "Drugi" }),
  ]);
  assert.equal(message?.url, "/trasy");
  assert.equal(message?.title, "2 nowe występy");
});

test("reminder window is 24h ± 15 minutes and skips cancelled or disabled prefs", () => {
  assert.equal(isReminderDue(at(LEAD), NOW), true);
  assert.equal(isReminderDue(at(LEAD - SLACK), NOW), true);
  assert.equal(isReminderDue(at(LEAD + SLACK), NOW), true);
  assert.equal(isReminderDue(at(LEAD - SLACK - 1), NOW), false);
  assert.equal(isReminderDue(at(LEAD + SLACK + 1), NOW), false);
  assert.equal(isReminderDue(at(23 * 60 * 60 * 1000), NOW), false);
  assert.equal(isReminderDue("not-a-date", NOW), false);

  const due = event({ startsAt: at(LEAD), status: "sold_out" });
  assert.equal(reminderAllowed(due, prefs(), NOW), true);
  assert.equal(reminderAllowed({ ...due, status: "cancelled" }, prefs(), NOW), false);
  assert.equal(reminderAllowed(due, prefs({ eventReminders: false }), NOW), false);
});

test("reminders are one push per event and already sent ones are skipped", () => {
  const first = event({ id: 1, title: "Pierwszy", startsAt: at(LEAD), city: "Kraków", venue: "Klub" });
  const second = event({ id: 2, title: "Drugi", startsAt: at(LEAD + 60_000), city: "Kraków", venue: "Sala" });
  const messages = planUserNotifications({
    user: user(),
    content: [],
    events: [],
    reminders: [second, first, first],
    sent: new Set([sentKey("event_reminder", "2")]),
    nowMs: NOW,
  });
  assert.equal(messages.length, 1);
  assert.equal(messages[0].kind, "event_reminder");
  assert.equal(messages[0].title, "Przypomnienie: Pierwszy");
  assert.match(messages[0].body, /Kraków · Klub/);
  assert.equal(messages[0].url, "/trasy?miasto=Krak%C3%B3w");
  assert.deepEqual(messages[0].refIds, ["1"]);
});

test("the cursor window keeps new approved rows and drops merged, pending, and older ones", () => {
  assert.equal(
    isNewContentRow({ status: "approved", mergedIntoId: null, approvedAt: "2026-11-21T11:30:00.000Z" }, CURSOR, UNTIL),
    true,
  );
  assert.equal(
    isNewContentRow({ status: "approved", mergedIntoId: null, approvedAt: CURSOR }, CURSOR, UNTIL),
    false,
  );
  assert.equal(
    isNewContentRow({ status: "pending", mergedIntoId: null, approvedAt: "2026-11-21T11:30:00.000Z" }, CURSOR, UNTIL),
    false,
  );
  assert.equal(
    isNewContentRow({ status: "approved", mergedIntoId: 9, approvedAt: "2026-11-21T11:30:00.000Z" }, CURSOR, UNTIL),
    false,
  );
  assert.equal(
    isNewContentRow({ status: "approved", mergedIntoId: null, approvedAt: "2026-11-21T12:30:00.000Z" }, CURSOR, UNTIL),
    false,
  );

  const fresh = { createdAt: "2026-11-21T11:30:00.000Z", status: "on_sale", startsAt: at(LEAD) };
  assert.equal(isNewEventRow(fresh, CURSOR, UNTIL, NOW), true);
  assert.equal(isNewEventRow({ ...fresh, createdAt: CURSOR }, CURSOR, UNTIL, NOW), false);
  assert.equal(isNewEventRow({ ...fresh, status: "unknown" }, CURSOR, UNTIL, NOW), false);
  assert.equal(isNewEventRow({ ...fresh, startsAt: new Date(NOW - 1000).toISOString() }, CURSOR, UNTIL, NOW), false);
});

test("a missing cursor is stored as now and does not dispatch", () => {
  assert.deepEqual(decideCursor(null, UNTIL), { dispatch: false, ranAt: UNTIL });
  assert.deepEqual(decideCursor(CURSOR, UNTIL), { dispatch: true, ranAt: CURSOR });
});

test("an unfinished run keeps the cursor, a full batch does not skip the boundary tie", () => {
  assert.equal(
    nextCursorIso({
      startedAt: UNTIL,
      contentStamps: [],
      eventStamps: [],
      cap: 3,
      finishedUsers: false,
      previous: CURSOR,
    }),
    CURSOR,
  );
  assert.equal(
    nextCursorIso({
      startedAt: UNTIL,
      contentStamps: [],
      eventStamps: [],
      cap: 3,
      finishedUsers: true,
      previous: CURSOR,
    }),
    UNTIL,
  );

  const stamps = [
    "2026-11-21T11:10:00.000Z",
    "2026-11-21T11:20:00.000Z",
    "2026-11-21T11:30:00.000Z",
    "2026-11-21T11:30:00.000Z",
  ];
  assert.equal(batchWatermark(stamps, 4, UNTIL), "2026-11-21T11:20:00.000Z");
  assert.equal(
    nextCursorIso({
      startedAt: UNTIL,
      contentStamps: stamps,
      eventStamps: [],
      cap: 4,
      finishedUsers: true,
      previous: CURSOR,
    }),
    "2026-11-21T11:20:00.000Z",
  );
  assert.equal(
    batchWatermark(["2026-11-21T11:30:00.000Z", "2026-11-21T11:30:00.000Z"], 2, UNTIL),
    "2026-11-21T11:30:00.000Z",
  );
});

test("push results: 2xx succeeds, 404 and 410 drop the subscription, anything else counts as failure", () => {
  assert.equal(classifyPushResult(201), "ok");
  assert.equal(classifyPushResult(200), "ok");
  assert.equal(classifyPushResult(404), "gone");
  assert.equal(classifyPushResult(410), "gone");
  assert.equal(classifyPushResult(500), "fail");
  assert.equal(classifyPushResult(429), "fail");
  assert.equal(classifyPushResult(null), "fail");
});

test("subscription bodies must be https endpoints with keys, and push urls stay https or in-app", () => {
  const keys = { p256dh: "A".repeat(80), auth: "B".repeat(22) };
  assert.deepEqual(
    parsePushSubscription({ endpoint: "https://push.example/abc12345", keys }),
    { endpoint: "https://push.example/abc12345", p256dh: keys.p256dh, auth: keys.auth },
  );
  assert.equal(parsePushSubscription({ endpoint: "http://push.example/abc12345", keys }), null);
  assert.equal(parsePushEndpoint({ endpoint: "https://push.example/abc12345" }), "https://push.example/abc12345");
  assert.equal(parsePushEndpoint({ endpoint: "javascript:alert(1)" }), null);
  assert.equal(safePushUrl("https://www.youtube.com/watch?v=abc", "/ulubione"), "https://www.youtube.com/watch?v=abc");
  assert.equal(safePushUrl("http://example.com/a", "/ulubione"), "/ulubione");
  assert.equal(safePushUrl("/ulubione", "/trasy"), "/ulubione");
  assert.equal(safePushUrl("//evil.example", "/ulubione"), "/ulubione");
});

test("dispatch route is the secret-protected service-role scan and does not send mail", () => {
  const route = readFileSync(new URL("../app/api/push/dispatch/route.ts", import.meta.url), "utf8");
  const run = readFileSync(new URL("./push-run.ts", import.meta.url), "utf8");
  const admin = readFileSync(new URL("./supabase-admin.ts", import.meta.url), "utf8");
  assert.match(route, /x-push-dispatch-secret/);
  assert.match(route, /PUSH_DISPATCH_SECRET/);
  assert.match(route, /secretsMatch/);
  assert.match(route, /runPushDispatch/);
  assert.match(run, /getAdminSupabase/);
  assert.match(run, /acquire_push_lease/);
  assert.match(run, /notification_log/);
  assert.match(run, /failure_count/);
  assert.match(admin, /SUPABASE_SERVICE_KEY/);
  assert.doesNotMatch(route, /ANON_KEY/);
  assert.doesNotMatch(run, /ANON_KEY/);
  assert.doesNotMatch(run, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(`${route}\n${run}`, /nodemailer|resend|sendMail/i);

  const testRoute = readFileSync(new URL("../app/api/push/test/route.ts", import.meta.url), "utf8");
  assert.match(testRoute, /getCurrentUser/);
  assert.doesNotMatch(testRoute, /notification_log/);
  assert.doesNotMatch(testRoute, /ANON_KEY/);
});
