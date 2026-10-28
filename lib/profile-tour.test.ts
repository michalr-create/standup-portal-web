import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PROFILE_TOUR_LIMIT } from "./events.ts";

test("profile tour preview stays inside the 5–8 nearest dates", () => {
  assert.ok(PROFILE_TOUR_LIMIT >= 5 && PROFILE_TOUR_LIMIT <= 8);
});

test("profile query filters one person and does not scan the tour catalog", () => {
  const data = readFileSync(new URL("./data.ts", import.meta.url), "utf8");
  const start = data.indexOf("export async function getUpcomingEventsForPerson(");
  assert.ok(start > 0);
  const next = data.indexOf("\nexport async function ", start + 10);
  const fn = data.slice(start, next === -1 ? undefined : next);

  assert.match(fn, /\.eq\("person_id", personId\)/);
  assert.match(fn, /\.gte\("starts_at", now\.toISOString\(\)\)/);
  assert.match(fn, /\.in\("status", \[\.\.\.LISTED_EVENT_STATUSES\]\)/);
  assert.match(fn, /\.order\("starts_at", \{ ascending: true \}\)/);
  assert.match(fn, /\.order\("id", \{ ascending: true \}\)/);
  assert.match(fn, /\.limit\(PROFILE_TOUR_LIMIT\)/);
  assert.match(fn, /withCoPerformers/);
  assert.doesNotMatch(fn, /getTrasyListing|listUpcomingFacets|FACET_/);
  assert.doesNotMatch(fn, /SERVICE/);
  assert.match(data, /from "@\/lib\/supabase"/);
});

test("standuper profile lists nearest dates above the film sections", () => {
  const page = readFileSync(new URL("../app/standuper/[slug]/page.tsx", import.meta.url), "utf8");
  const section = readFileSync(new URL("../app/standuper/[slug]/ProfileTour.tsx", import.meta.url), "utf8");

  assert.match(page, /getUpcomingEventsForPerson\(person\.id, now\)/);
  assert.match(page, /<ProfileTour slug=\{person\.slug\} events=\{tourEvents\} now=\{now\} \/>/);
  const tourAt = page.indexOf("<ProfileTour");
  const filmsAt = page.indexOf('label: "Specjale"');
  assert.ok(tourAt > 0 && filmsAt > tourAt);
  assert.match(page, /profileCountLabel\(videoCount, formatCount\)/);
  assert.match(page, /<ItemsBrowser items=\{sectionItems\} \/>/);
  assert.doesNotMatch(page, /getTrasyListing/);

  assert.match(section, /if \(events\.length === 0\) return null/);
  assert.match(section, />\s*Trasa\s*</);
  assert.match(section, /Wszystkie terminy/);
  assert.match(section, /trasyHref\(\{ osoba: slug \}\)/);
  assert.match(section, /formatRelativeWhen\(event\.starts_at, now\)/);
  assert.match(section, /formatEventWhen\(event\.starts_at\)/);
  assert.match(section, /formatPrice\(event\.price_from, event\.currency\)/);
  assert.match(section, /\{event\.city\}/);
  assert.match(section, /\{event\.venue\}/);
  assert.match(section, /paidExternalUrl\(event\.ticket_url\)/);
  assert.match(section, /target="_blank"/);
  assert.match(section, /rel="noopener noreferrer"/);
  assert.match(section, /Bilety/);
  assert.match(section, /eventPeople\(event\)/);
  assert.match(section, /roster\.length > 1/);
  assert.match(section, /comedian\.name/);
  assert.doesNotMatch(section, /event\.person|person\.name/);
});
