import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PROFILE_TOUR_COUNT_CAP } from "./events.ts";

test("profile tour count reads one person's dates and does not scan the catalog", () => {
  assert.ok(PROFILE_TOUR_COUNT_CAP >= 50);
  const data = readFileSync(new URL("./data.ts", import.meta.url), "utf8");
  const start = data.indexOf("export async function countUpcomingEventsForPerson(");
  assert.ok(start > 0);
  const next = data.indexOf("\nexport async function ", start + 10);
  const fn = data.slice(start, next === -1 ? undefined : next);
  const helperStart = data.indexOf("const BILLED_EVENT_STAMPS");
  assert.ok(helperStart > 0 && helperStart < start);
  const helper = data.slice(helperStart, start);

  assert.match(fn, /listedRowsForPersonMatch\(now, PROFILE_TOUR_COUNT_CAP, \{ personId \}\)/);
  assert.match(fn, /mergeTourEvents\(rowsToTourEvents\(rows\)\)/);
  assert.doesNotMatch(fn, /withCoPerformers|getTrasyListing|listUpcomingFacets|FACET_/);
  assert.doesNotMatch(fn, /SERVICE/);
  assert.match(helper, /\.eq\("person_id", personId\)/);
  assert.match(helper, /\.eq\("event_people\.person_id", personId\)/);
  assert.match(helper, /event_people!inner\(person_id\)/);
  assert.match(helper, /\.gte\("starts_at", now\.toISOString\(\)\)/);
  assert.match(helper, /\.in\("status", \[\.\.\.LISTED_EVENT_STATUSES\]\)/);
  assert.match(helper, /\.order\("starts_at", \{ ascending: true \}\)/);
  assert.match(helper, /\.order\("id", \{ ascending: true \}\)/);
  assert.match(helper, /\.limit\(limit\)/);
  assert.doesNotMatch(helper, /SERVICE/);
  assert.match(data, /from "@\/lib\/supabase"/);
  assert.doesNotMatch(data, /export async function getUpcomingEventsForPerson\(/);
});

test("standuper profile links to filtered trasy and scrolls one row per category", () => {
  const page = readFileSync(new URL("../app/standuper/[slug]/page.tsx", import.meta.url), "utf8");
  const section = readFileSync(new URL("../app/standuper/[slug]/ProfileTour.tsx", import.meta.url), "utf8");

  assert.match(page, /countUpcomingEventsForPerson\(person\.id, now\)/);
  assert.match(page, /<ProfileTour slug=\{person\.slug\} count=\{tourCount\} \/>/);
  const tourAt = page.indexOf("<ProfileTour");
  const rowsAt = page.indexOf("blocks.map");
  assert.ok(tourAt > 0 && rowsAt > tourAt);
  assert.match(page, /profileCountLabel\(videoCount, formatCount\)/);
  assert.match(page, /profileVideoCount\(blocks\)/);
  assert.match(page, /buildProfileBlocks\(/);
  assert.match(page, /const personPromise = getPersonBySlug\(slug\)/);
  assert.match(page, /const itemsPromise = getItemsByPersonSlug\(slug, 999\)/);
  assert.equal(page.match(/getItemsByPersonSlug\(/g)?.length, 1);
  assert.match(page, /Promise\.all\(\[/);
  assert.doesNotMatch(page, /getTrasyListing|getUpcomingEventsForPerson|ProgramCatalog/);
  assert.match(page, /<SectionHead/);
  assert.match(page, /Poka\\u017c wszystkie \\u2192/);
  assert.match(page, /categoryBrowseHref\(block\.listingPath, \{ osoba: person\.slug \}\)/);
  assert.match(page, /<ScrollRow items=\{block\.items\} \/>/);
  assert.doesNotMatch(page, /showCategoryBadge/);
  assert.match(page, /<FormatCard/);
  assert.match(page, /snap-x snap-mandatory/);

  assert.match(section, /profileTourLabel\(count\)/);
  assert.match(section, /if \(!label\) return null/);
  assert.match(section, /trasyHref\(\{ osoba: slug \}\)/);
  assert.match(section, /\{label\}/);
  assert.doesNotMatch(section, /formatEventWhen|Bilety|TourRow|events\.map|Wszystkie terminy/);
});
