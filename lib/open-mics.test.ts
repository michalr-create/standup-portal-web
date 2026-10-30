import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import {
  buildOpenMicView,
  cycleWeekdays,
  cyklLabel,
  emptyOpenMicFilters,
  facetCities,
  languageBadge,
  listedOpenMicDates,
  mapsSearchHref,
  nextOpenMicDate,
  nextOpenMicSlug,
  openMicFacetRedirect,
  openMicHref,
  parseOpenMicSearchParams,
  sampleOpenMicCatalog,
  slugifyOpenMicName,
  submissionFromForm,
  toOpenMicCycle,
  toOpenMicDate,
  upcomingWarsawSlot,
  validateOpenMicSubmission,
  warsawWeekday,
  weekdaysFromRecurrence,
  type OpenMicCycle,
  type OpenMicDate,
  type OpenMicFilters,
  type OpenMicSubmissionInput,
} from "./open-mics.ts";

const NOW = new Date("2026-10-30T12:00:00.000Z");

function cycle(partial: Partial<OpenMicCycle> & Pick<OpenMicCycle, "id" | "name">): OpenMicCycle {
  return {
    slug: "cykl",
    city: "Warszawa",
    venue: "Klub",
    address: "ul. Testowa 1",
    lat: null,
    lng: null,
    recurrence_text: null,
    language: "pl",
    signup_info: null,
    signup_url: null,
    rules: null,
    audience_price_text: null,
    organizer: null,
    status: "active",
    ...partial,
  };
}

function date(partial: Partial<OpenMicDate> & Pick<OpenMicDate, "id" | "starts_at">): OpenMicDate {
  return {
    open_mic_id: 1,
    title: null,
    city: "Warszawa",
    venue: "Klub",
    provider: "kupbilecik",
    url: "https://example.com/bilet",
    status: "on_sale",
    ...partial,
  };
}

function filters(partial: Partial<OpenMicFilters> = {}): OpenMicFilters {
  return { ...emptyOpenMicFilters(), ...partial };
}

function form(partial: Partial<OpenMicSubmissionInput> = {}): OpenMicSubmissionInput {
  return {
    name: "Open mic na Pradze",
    city: "Warszawa",
    venue: "Klub",
    address: "ul. Testowa 1",
    recurrence: "co tydzień, czwartek",
    language: "pl",
    signupInfo: "napisz na maila",
    signupUrl: "",
    rules: "5 minut, 18+",
    price: "wstęp wolny",
    organizer: "Kolektyw",
    email: "ada@example.com",
    sourceUrl: "https://example.com/open-mic",
    honeypot: "",
    ...partial,
  };
}

test("weekday uses Warsaw, not UTC, and falls back to recurrence only without dates", () => {
  assert.equal(warsawWeekday("2026-11-03T18:00:00.000Z"), 2);
  assert.equal(warsawWeekday("2026-11-03T23:30:00.000Z"), 3);
  assert.equal(warsawWeekday("not-a-date"), null);

  assert.deepEqual(weekdaysFromRecurrence("najczęściej wtorki (w 2026 też piątki)"), [2, 5]);
  assert.deepEqual(weekdaysFromRecurrence("co tydzień, piątek"), [5]);
  assert.deepEqual(weekdaysFromRecurrence("co tydzień, środa"), [3]);
  assert.deepEqual(weekdaysFromRecurrence("every Tuesday"), [2]);
  assert.deepEqual(weekdaysFromRecurrence("nieustalony"), []);
  assert.deepEqual(weekdaysFromRecurrence("środowisko testowe, bez dnia"), []);
  assert.deepEqual(weekdaysFromRecurrence(null), []);

  const tuesday = date({ id: 1, starts_at: "2026-11-03T18:00:00.000Z" });
  const withDate = cycle({ id: 1, name: "Mic", recurrence_text: "co tydzień, piątek" });
  assert.deepEqual(cycleWeekdays(withDate, [tuesday]), [2]);
  assert.deepEqual(cycleWeekdays(withDate, []), [5]);
});

test("filters combine city, weekday, and language; cancelled and unmatched dates stay out", () => {
  const warsaw = cycle({ id: 1, name: "Resort", recurrence_text: "piątki", language: "pl", city: "Warszawa" });
  const english = cycle({
    id: 2,
    name: "Friday Night",
    recurrence_text: "wtorki",
    language: "en",
    city: "Warszawa",
  });
  const krakow = cycle({
    id: 3,
    name: "Lab",
    city: "Kraków",
    language: "pl/en",
    status: "to_verify",
    recurrence_text: "środy",
  });
  const quiet = cycle({ id: 4, name: "Bez dat", city: "Gdańsk", recurrence_text: "co tydzień, niedziela", language: "pl" });
  const cycles = [warsaw, english, krakow, quiet];
  const dates = [
    date({ id: 1, open_mic_id: 1, starts_at: "2026-11-03T18:00:00.000Z", city: "Warszawa" }),
    date({ id: 2, open_mic_id: 2, starts_at: "2026-11-06T19:00:00.000Z", city: "Warszawa", status: "sold_out" }),
    date({ id: 3, open_mic_id: 3, starts_at: "2026-11-04T18:00:00.000Z", city: "Kraków", status: "unknown" }),
    date({ id: 4, open_mic_id: 1, starts_at: "2026-11-10T18:00:00.000Z", status: "cancelled" }),
    date({ id: 5, open_mic_id: 1, starts_at: "2026-10-01T18:00:00.000Z" }),
    date({ id: 6, open_mic_id: null, starts_at: "2026-11-06T19:00:00.000Z", city: "Gdańsk" }),
    date({ id: 7, open_mic_id: 99, starts_at: "2026-11-06T19:00:00.000Z" }),
  ];

  const all = buildOpenMicView(cycles, dates, filters(), NOW);
  assert.deepEqual(all.cycles.map((item) => item.id), [1, 3, 2, 4]);
  assert.deepEqual(all.dates.map((item) => item.id), [1, 3, 2]);
  assert.equal(all.catalogCount, 4);
  assert.deepEqual(facetCities(cycles, listedOpenMicDates(cycles, dates, NOW)), ["Gdańsk", "Kraków", "Warszawa"]);
  assert.equal(nextOpenMicDate(warsaw, all.dates)?.id, 1);
  assert.equal(languageBadge("pl/en"), "PL/EN");

  const friday = buildOpenMicView(cycles, dates, filters({ dzien: 5 }), NOW);
  assert.deepEqual(friday.cycles.map((item) => item.id), [2]);
  assert.deepEqual(friday.dates.map((item) => item.id), [2]);

  const city = buildOpenMicView(cycles, dates, filters({ miasto: "kraków" }), NOW);
  assert.deepEqual(city.cycles.map((item) => item.id), [3]);
  assert.deepEqual(city.dates.map((item) => item.id), [3]);

  const polish = buildOpenMicView(cycles, dates, filters({ jezyk: "pl" }), NOW);
  assert.deepEqual(polish.cycles.map((item) => item.id), [1, 4]);

  const both = buildOpenMicView(cycles, dates, filters({ miasto: "Warszawa", jezyk: "en", dzien: 5 }), NOW);
  assert.deepEqual(both.cycles.map((item) => item.name), ["Friday Night"]);
  assert.equal(both.dates[0]?.status, "sold_out");

  const none = buildOpenMicView(cycles, dates, filters({ miasto: "Poznań" }), NOW);
  assert.equal(none.cycles.length, 0);
  assert.equal(none.dates.length, 0);
  assert.equal(none.catalogCount, 4);
});

test("sample catalog stays upcoming and drops cancelled plus unmatched dates", () => {
  const sample = sampleOpenMicCatalog(NOW);
  const view = buildOpenMicView(sample.cycles, sample.dates, filters(), NOW);
  assert.equal(view.cycles.length, 4);
  assert.ok(view.dates.length >= 3);
  assert.ok(view.dates.every((item) => item.status !== "cancelled"));
  assert.ok(view.dates.every((item) => item.open_mic_id != null));
  assert.ok(view.dates.every((item) => Date.parse(item.starts_at) >= NOW.getTime()));
  assert.equal(view.cycles.some((item) => item.status === "to_verify"), true);
  const tuesday = upcomingWarsawSlot(NOW, 2, 19, 0);
  assert.equal(warsawWeekday(tuesday), 2);
  assert.ok(Date.parse(tuesday) >= NOW.getTime());
});

test("search params, city canonicalization, and maps links", () => {
  assert.equal(openMicHref({}), "/open-mic");
  assert.equal(openMicHref({ miasto: "Kraków", dzien: 3, jezyk: "pl/en" }), "/open-mic?miasto=Krak%C3%B3w&dzien=3&jezyk=pl%2Fen");

  const parsed = parseOpenMicSearchParams({ miasto: "  Kraków  ", dzien: "3", jezyk: "PL/EN" });
  assert.equal(parsed.redirectHref, "/open-mic?miasto=Krak%C3%B3w&dzien=3&jezyk=pl%2Fen");
  assert.equal(parsed.filters.dzien, 3);
  assert.equal(parsed.filters.jezyk, "pl/en");

  const junk = parseOpenMicSearchParams({ miasto: "<script>", dzien: "9", jezyk: "de" });
  assert.equal(junk.redirectHref, "/open-mic");
  assert.deepEqual(junk.filters, emptyOpenMicFilters());

  const clean = parseOpenMicSearchParams({ miasto: "Gdańsk", dzien: "1", jezyk: "en" });
  assert.equal(clean.redirectHref, null);

  assert.equal(openMicFacetRedirect(filters({ miasto: "warszawa" }), ["Kraków", "Warszawa"]), "/open-mic?miasto=Warszawa");
  assert.equal(openMicFacetRedirect(filters({ miasto: "Poznań", dzien: 2 }), ["Warszawa"]), "/open-mic?dzien=2");
  assert.equal(openMicFacetRedirect(filters({ miasto: "Warszawa" }), ["Warszawa"]), null);

  assert.equal(
    mapsSearchHref({ address: "ul. Bielańska 1", city: "Warszawa", lat: null, lng: null }),
    "https://www.google.com/maps/search/?api=1&query=ul.%20Biela%C5%84ska%201%2C%20Warszawa",
  );
  assert.equal(
    mapsSearchHref({ address: "ul. Bielańska 1", city: "Warszawa", lat: 52.2, lng: 21 }),
    "https://www.google.com/maps/search/?api=1&query=52.2,21",
  );
  assert.equal(mapsSearchHref({ address: "  ", city: null, lat: null, lng: null }), null);
});

test("row parsers keep public cycles and approved dates only", () => {
  assert.equal(toOpenMicCycle({ id: 1, name: "Mic", slug: "mic", status: "pending" }), null);
  assert.equal(toOpenMicCycle({ id: 1, name: "Mic", slug: "mic", status: "rejected" }), null);
  const kept = toOpenMicCycle({
    id: "2",
    name: " Lab ",
    slug: "lab",
    status: "to_verify",
    language: "en",
    city: "Kraków",
    lat: "50.06",
    lng: 19.94,
    submitted_by_email: "secret@example.com",
  });
  assert.equal(kept?.status, "to_verify");
  assert.equal(kept?.language, "en");
  assert.equal(kept?.lat, 50.06);
  assert.equal("submitted_by_email" in (kept ?? {}), false);

  assert.equal(
    toOpenMicDate({
      id: 1,
      open_mic_id: 2,
      starts_at: "2026-11-03T18:00:00.000Z",
      provider: "kupbilecik",
      status: "on_sale",
      moderation_status: "pending",
    }),
    null,
  );
  const approved = toOpenMicDate({
    id: 4,
    open_mic_id: null,
    starts_at: "2026-11-03T18:00:00.000Z",
    provider: "other",
    status: "sold_out",
    moderation_status: "approved",
    url: " https://example.com/x ",
  });
  assert.equal(approved?.open_mic_id, null);
  assert.equal(approved?.status, "sold_out");
  assert.equal(approved?.url, "https://example.com/x");
});

test("submission validation, slug, and honeypot", () => {
  assert.equal(slugifyOpenMicName("Piątkowy Stand-up – Środa"), "piatkowy-stand-up-sroda");
  assert.equal(slugifyOpenMicName("   "), "open-mic");
  assert.equal(nextOpenMicSlug("lab", []), "lab");
  assert.equal(nextOpenMicSlug("lab", ["lab", "lab-2"]), "lab-3");

  const ok = validateOpenMicSubmission(form());
  assert.equal(ok.kind, "valid");
  if (ok.kind === "valid") {
    assert.equal(ok.row.submitted_by_email, "ada@example.com");
    assert.deepEqual(ok.row.source_urls, ["https://example.com/open-mic"]);
    assert.equal(ok.row.language, "pl");
    assert.equal("status" in ok.row, false);
  }

  assert.equal(validateOpenMicSubmission(form({ honeypot: "http://spam" })).kind, "spam");
  assert.equal(validateOpenMicSubmission(form({ email: "nie-mail" })).kind, "error");
  assert.equal(validateOpenMicSubmission(form({ name: "x" })).kind, "error");
  assert.equal(validateOpenMicSubmission(form({ signupUrl: "javascript:alert(1)" })).kind, "error");
  assert.equal(validateOpenMicSubmission(form({ sourceUrl: "notafile" })).kind, "error");
  assert.equal(validateOpenMicSubmission(form({ language: "de" })).kind, "error");
  assert.equal(validateOpenMicSubmission(form({ rules: "a".repeat(1001) })).kind, "error");

  const data = new FormData();
  data.set("name", "Mic");
  data.set("email", "a@b.co");
  data.set("hp_leave_blank", "");
  assert.equal(submissionFromForm(data).name, "Mic");
  assert.equal(submissionFromForm(data).honeypot, "");

  assert.equal(cyklLabel(1), "cykl");
  assert.equal(cyklLabel(2), "cykle");
  assert.equal(cyklLabel(5), "cykli");
  assert.equal(cyklLabel(12), "cykli");
  assert.equal(cyklLabel(22), "cykle");
});

test("open mics stay off tours, and the public query hides the contact email", () => {
  for (const file of ["../app/trasy/page.tsx", "../app/trasy/EventCard.tsx", "./events.ts", "./data.ts"]) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.equal(source.includes("open_mics"), false, file);
    assert.equal(source.includes("open_mic_dates"), false, file);
  }
  const query = readFileSync(new URL("./open-mic-data.ts", import.meta.url), "utf8");
  assert.equal(query.includes('from("events")'), false);
  assert.match(
    query,
    /OPEN_MIC_CYCLE_COLUMNS =\n  "id, name, slug, city, venue, address, lat, lng, recurrence_text, language, signup_info, signup_url, rules, audience_price_text, organizer, status"/,
  );
  assert.match(query, /OPEN_MIC_DATE_COLUMNS =\n  "id, open_mic_id, title, starts_at, city, venue, provider, url, status, moderation_status"/);

  const action = readFileSync(new URL("../app/open-mic/actions.ts", import.meta.url), "utf8");
  assert.match(action, /status:\s*"pending"/);
  assert.doesNotMatch(action, /formData\.get\(\s*"status"\s*\)/);

  const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(home, /href="\/open-mic"/);
  assert.match(home, /Open mic/);
  assert.match(home, /Trasy i bilety/);
  assert.doesNotMatch(home, /Zobacz nowe/);

  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /href: "\/open-mic", label: "Open mic"/);
  assert.match(layout, /tourLink=\{\{ href: "\/trasy", label: "Trasy" \}\}/);
  const drawer = readFileSync(new URL("../app/components/MobileDrawer.tsx", import.meta.url), "utf8");
  assert.match(drawer, /function withTourLink/);
  assert.match(drawer, /links\.map/);

  const sitemap = readFileSync(new URL("../app/sitemap.ts", import.meta.url), "utf8");
  assert.match(sitemap, /\/open-mic\/dodaj/);
  assert.match(sitemap, /\/open-mic"/);
});

test("open mic migration is additive, public-read only, and keeps contact email off the anon grant", () => {
  const files = readdirSync(new URL("../supabase/migrations/", import.meta.url)).filter((name) =>
    name.endsWith("_create_open_mics.sql"),
  );
  assert.equal(files.length, 1);
  const sql = readFileSync(new URL(`../supabase/migrations/${files[0]}`, import.meta.url), "utf8");
  const lower = sql.toLowerCase();
  assert.match(lower, /create table if not exists public\.open_mics/);
  assert.match(lower, /create table if not exists public\.open_mic_dates/);
  assert.match(lower, /generated by default as identity primary key/);
  assert.match(lower, /language is null or language in \('pl', 'en', 'pl\/en'\)/);
  assert.match(lower, /status in \('pending', 'active', 'to_verify', 'inactive', 'rejected'\)/);
  assert.match(lower, /status in \('on_sale', 'sold_out', 'cancelled', 'unknown'\)/);
  assert.match(lower, /provider in \('kupbilecik', 'other'\)/);
  assert.match(lower, /moderation_status in \('pending', 'approved', 'rejected'\)/);
  assert.match(lower, /references public\.open_mics \(id\) on delete cascade/);
  assert.match(lower, /unique \(provider, external_id\)/);
  assert.match(lower, /open_mics_city_idx/);
  assert.match(lower, /open_mics_status_idx/);
  assert.match(lower, /open_mic_dates_city_idx/);
  assert.match(lower, /open_mic_dates_status_idx/);
  assert.match(lower, /open_mic_dates_starts_at_idx/);
  assert.match(lower, /enable row level security/);
  assert.match(lower, /status in \('active', 'to_verify'\)/);
  assert.match(lower, /moderation_status = 'approved'/);
  assert.match(lower, /do potwierdzenia/);
  assert.doesNotMatch(lower, /alter table public\.events/);
  assert.doesNotMatch(lower, /for insert/);
  assert.doesNotMatch(lower, /for update/);
  assert.doesNotMatch(lower, /for delete/);
  assert.doesNotMatch(lower, /for all/);
  const grantStart = lower.indexOf("grant select (");
  const grantEnd = lower.indexOf(") on table public.open_mics");
  assert.ok(grantStart >= 0 && grantEnd > grantStart);
  const grant = lower.slice(grantStart, grantEnd);
  assert.equal(grant.includes("submitted_by_email"), false);
  assert.match(lower, /submitted_by_email text/);
});
