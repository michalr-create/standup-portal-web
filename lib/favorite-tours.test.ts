import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("favorites API adds upcoming events for the slugs it already receives", () => {
  const route = readFileSync(new URL("../app/api/favorites/route.ts", import.meta.url), "utf8");
  assert.match(route, /getUpcomingEventsForPersonSlugs\(personSlugs\)/);
  assert.match(route, /upcoming_events: await upcomingPromise/);
  assert.match(route, /NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  assert.doesNotMatch(route, /SERVICE/);

  const data = readFileSync(new URL("./data.ts", import.meta.url), "utf8");
  const start = data.indexOf("export async function getUpcomingEventsForPersonSlugs");
  assert.ok(start > 0);
  const next = data.indexOf("\nexport async function ", start + 10);
  const fn = data.slice(start, next === -1 ? undefined : next);
  const helperStart = data.indexOf("const BILLED_EVENT_STAMPS");
  assert.ok(helperStart > 0 && helperStart < start);
  const helper = data.slice(helperStart, start);

  assert.match(fn, /favoritePersonSlugs/);
  assert.match(fn, /listedRowsForPersonMatch\(now, FAVORITE_UPCOMING_SCAN_LIMIT, \{ slugs: allowed \}\)/);
  assert.match(fn, /pickFavoriteUpcomingEvents/);
  assert.match(fn, /withCoPerformers/);
  assert.match(fn, /people: roster\.map/);
  assert.match(helper, /\.gte\("starts_at", now\.toISOString\(\)\)/);
  assert.match(helper, /\.in\("status", \[\.\.\.LISTED_EVENT_STATUSES\]\)/);
  assert.match(helper, /\.in\("people\.slug", slugs\)/);
  assert.match(helper, /\.in\("event_people\.person_id", personIds\)/);
  assert.match(helper, /event_people!inner\(person_id\)/);
  assert.match(helper, /\.limit\(limit\)/);
  assert.doesNotMatch(fn, /SERVICE/);
  assert.doesNotMatch(helper, /SERVICE/);
  assert.match(data, /from "@\/lib\/supabase"/);

  assert.match(route, /getUpcomingEventsInCity\(city\)/);
  assert.match(route, /city_events: await cityPromise/);
  const cityStart = data.indexOf("export async function getUpcomingEventsInCity");
  assert.ok(cityStart > 0);
  const cityNext = data.indexOf("\nexport async function ", cityStart + 10);
  const cityFn = data.slice(cityStart, cityNext === -1 ? undefined : cityNext);
  assert.match(cityFn, /normalizeHomeCity/);
  assert.match(cityFn, /\.eq\("city", normalized\)/);
  assert.match(cityFn, /withCoPerformers/);
  assert.match(cityFn, /CITY_UPCOMING_LIMIT/);
  assert.doesNotMatch(cityFn, /SERVICE/);
});

test("ulubione renders tours only from the stored person list", () => {
  const page = readFileSync(new URL("../app/ulubione/page.tsx", import.meta.url), "utf8");
  const section = readFileSync(new URL("../app/ulubione/FavoriteTours.tsx", import.meta.url), "utf8");
  assert.match(page, /personSlugs\.length > 0 \|\| homeCity/);
  assert.match(page, /eventsForFavoritePeople\(data\.upcoming_events, personSlugs\)/);
  assert.match(page, /mergeAccountUpcoming/);
  assert.match(page, /onCityChange=\{setHomeCity\}/);
  assert.match(page, /city: homeCity/);
  assert.match(section, /Grają wkrótce/);
  assert.match(section, /Brak ogłoszonych dat u ulubionych/);
  assert.match(section, /"\/trasy"/);
  assert.match(section, /Pokaż wszystkie/);
  assert.match(section, /ACCOUNT_SECTION_PREVIEW/);
  assert.match(section, /eventPeople\(event\)/);
  assert.match(section, /standuperProfileHref\(person\.slug\)/);
  assert.match(section, /trasyHref\(\{ osoba: event\.person\.slug \}\)/);
  assert.match(section, /więcej tras/);
  assert.match(section, /target="_blank"/);
  assert.match(section, /rel="noopener noreferrer"/);
  assert.match(section, /paidExternalUrl\(event\.ticket_url\)/);
});
