import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import {
  eventFacets,
  eventsForFavoritePeople,
  FAVORITE_PERSON_SLUG_CAP,
  FAVORITE_UPCOMING_LIMIT,
  facetRedirect,
  favoritePersonSlugs,
  filterUpcomingEvents,
  formatEventWhen,
  formatPrice,
  groupEventsByMonth,
  parseTrasySearchParams,
  peopleSelectOptions,
  pickFavoriteUpcomingEvents,
  providerLabel,
  terminLabel,
  topFacetCities,
  toTourEvent,
  trasyHref,
  warsawDayBounds,
  type EventRow,
  type TourEvent,
  type TrasyFilters,
} from "./events.ts";

const NOW = new Date("2026-11-01T12:00:00.000Z");

function tour(overrides: Partial<TourEvent> = {}): TourEvent {
  const event: TourEvent = {
    id: 1,
    person_id: 3,
    title: "Wentyl",
    starts_at: "2026-11-12T18:00:00.000Z",
    city: "Kraków",
    venue: "Studio",
    venue_address: "ul. Przykładowa 1",
    price_from: 70,
    currency: "PLN",
    status: "on_sale",
    ticket_url: "https://example.com/bilet",
    ticket_provider: "kupbilecik",
    links: [],
    person: { name: "Abelard Giza", slug: "abelard-giza", photo_url: null },
    ...overrides,
  };
  if (!overrides.links) {
    event.links = [{
      ticket_url: event.ticket_url,
      ticket_provider: event.ticket_provider,
      external_id: `ext-${event.id}`,
      is_primary: true,
    }];
  }
  return event;
}

const openFilters: TrasyFilters = { osoba: "", miasto: "", od: "", doDnia: "", bilety: "", portal: "" };

test("warsaw day bounds follow CET and CEST", () => {
  const winter = warsawDayBounds("2026-11-12");
  assert.equal(winter?.start.toISOString(), "2026-11-11T23:00:00.000Z");
  assert.equal(winter?.end.toISOString(), "2026-11-12T23:00:00.000Z");

  const summer = warsawDayBounds("2026-07-12");
  assert.equal(summer?.start.toISOString(), "2026-07-11T22:00:00.000Z");
  assert.equal(summer?.end.toISOString(), "2026-07-12T22:00:00.000Z");
  assert.equal(warsawDayBounds("2026-02-31"), null);
});

test("search params stay canonical", () => {
  assert.equal(trasyHref(), "/trasy");
  assert.equal(
    trasyHref({ osoba: "abelard-giza", miasto: "Kraków", od: "2026-11-12", doDnia: "2026-11-20", bilety: "dostepne", portal: "ebilet" }),
    "/trasy?osoba=abelard-giza&miasto=Krak%C3%B3w&od=2026-11-12&do=2026-11-20&bilety=dostepne&portal=ebilet",
  );

  const messy = parseTrasySearchParams({
    osoba: "Abelard-Giza",
    miasto: "  Zielona   Góra  ",
    od: "2026-11-12",
    do: "2026-11-01",
    bilety: "sold_out",
  });
  assert.equal(messy.filters.osoba, "abelard-giza");
  assert.equal(messy.filters.miasto, "Zielona Góra");
  assert.equal(messy.filters.od, "2026-11-12");
  assert.equal(messy.filters.doDnia, "");
  assert.equal(messy.filters.bilety, "");
  assert.equal(
    messy.redirectHref,
    "/trasy?osoba=abelard-giza&miasto=Zielona+G%C3%B3ra&od=2026-11-12",
  );

  const kept = parseTrasySearchParams({ bilety: "wyprzedane", miasto: "Łódź", portal: "Biletomat" });
  assert.equal(kept.redirectHref, "/trasy?miasto=%C5%81%C3%B3d%C5%BA&bilety=wyprzedane&portal=biletomat");
  assert.equal(kept.filters.bilety, "wyprzedane");
  assert.equal(kept.filters.miasto, "Łódź");
  assert.equal(kept.filters.portal, "biletomat");
  assert.equal(parseTrasySearchParams({ portal: "shop" }).redirectHref, "/trasy");
});

test("page query stays with the active filters and omits the first page", () => {
  assert.equal(trasyHref({ osoba: "abelard-giza", page: 1 }), "/trasy?osoba=abelard-giza");
  assert.equal(trasyHref({ osoba: "abelard-giza", page: 2 }), "/trasy?osoba=abelard-giza&page=2");
  assert.equal(
    trasyHref({ miasto: "Kraków", bilety: "dostepne", portal: "ebilet", page: 4 }),
    "/trasy?miasto=Krak%C3%B3w&bilety=dostepne&portal=ebilet&page=4",
  );

  const explicitFirst = parseTrasySearchParams({ page: "1", miasto: "Kraków" });
  assert.equal(explicitFirst.page, 1);
  assert.equal(explicitFirst.redirectHref, "/trasy?miasto=Krak%C3%B3w");

  const second = parseTrasySearchParams({ page: "2", osoba: "abelard-giza", bilety: "dostepne" });
  assert.equal(second.page, 2);
  assert.equal(second.filters.osoba, "abelard-giza");
  assert.equal(second.filters.bilety, "dostepne");
  assert.equal(second.redirectHref, null);

  const bad = parseTrasySearchParams({ page: "0", portal: "ebilet" });
  assert.equal(bad.page, 1);
  assert.equal(bad.redirectHref, "/trasy?portal=ebilet");

  const messyPage = parseTrasySearchParams({ page: "2", osoba: "Abelard-Giza" });
  assert.equal(messyPage.page, 2);
  assert.equal(messyPage.redirectHref, "/trasy?osoba=abelard-giza&page=2");
});

test("filters keep upcoming rows and honor comedian, city, range, and availability", () => {
  const events = [
    tour(),
    tour({
      id: 2,
      starts_at: "2026-11-12T23:30:00.000Z",
      city: "Warszawa",
      status: "sold_out",
      ticket_provider: "going",
      ticket_url: "https://example.com/going",
      person: { name: "Inny", slug: "inny", photo_url: null },
    }),
    tour({ id: 3, starts_at: "2026-10-01T16:00:00.000Z" }),
    tour({
      id: 4,
      starts_at: "2026-12-02T18:00:00.000Z",
      city: "Łódź",
      links: [
        {
          ticket_url: "https://example.com/bilet-4",
          ticket_provider: "kupbilecik",
          external_id: "ext-4",
          is_primary: true,
        },
        {
          ticket_url: "https://example.com/ebilet-4",
          ticket_provider: "ebilet",
          external_id: "ebilet-4",
          is_primary: false,
        },
      ],
    }),
  ];

  assert.deepEqual(filterUpcomingEvents(events, openFilters, NOW).map((event) => event.id), [1, 2, 4]);
  assert.deepEqual(
    filterUpcomingEvents(events, { ...openFilters, osoba: "abelard-giza" }, NOW).map((event) => event.id),
    [1, 4],
  );
  assert.deepEqual(
    filterUpcomingEvents(events, { ...openFilters, miasto: "Warszawa" }, NOW).map((event) => event.id),
    [2],
  );
  assert.deepEqual(
    filterUpcomingEvents(events, { ...openFilters, bilety: "wyprzedane" }, NOW).map((event) => event.id),
    [2],
  );
  assert.deepEqual(
    filterUpcomingEvents(events, { ...openFilters, od: "2026-11-12", doDnia: "2026-11-12" }, NOW).map((event) => event.id),
    [1],
  );
  assert.deepEqual(
    filterUpcomingEvents(events, { ...openFilters, portal: "ebilet" }, NOW).map((event) => event.id),
    [4],
  );
  assert.deepEqual(
    filterUpcomingEvents(events, { ...openFilters, portal: "going" }, NOW).map((event) => event.id),
    [2],
  );

  const facets = eventFacets(filterUpcomingEvents(events, openFilters, NOW));
  assert.deepEqual(facets.cities, ["Kraków", "Łódź", "Warszawa"]);
  assert.equal(facetRedirect({ ...openFilters, osoba: "nikt" }, facets), "/trasy");
  assert.equal(facetRedirect({ ...openFilters, portal: "eventim" }, facets), "/trasy");
  assert.equal(facetRedirect({ ...openFilters, osoba: "nikt" }, facets, 3), "/trasy?page=3");
  assert.equal(facetRedirect({ ...openFilters, osoba: "abelard-giza" }, facets, 2), null);
  assert.deepEqual(facets.portals, ["eBilet", "Going", "Kupbilecik"].map((label) => {
    if (label === "eBilet") return "ebilet";
    if (label === "Going") return "going";
    return "kupbilecik";
  }));
  assert.equal(facetRedirect(openFilters, facets), null);
});

test("top city chips are the largest cities that actually appear in facets", () => {
  const ranked = [
    "Warszawa",
    "Kraków",
    "Wrocław",
    "Gdańsk",
    "Poznań",
    "Łódź",
    "Szczecin",
    "Bydgoszcz",
    "Lublin",
    "Białystok",
    "Katowice",
  ];
  const facets = ["Hel", "Sopot", ...ranked.slice().reverse(), "Zakopane"];
  const chips = topFacetCities(facets);
  assert.equal(chips.length, 10);
  assert.deepEqual(chips, ranked.slice(0, 10));
  for (const city of chips) assert.equal(facets.includes(city), true);
  assert.equal(chips.includes("Hel"), false);
  assert.equal(chips.includes("Katowice"), false);
  assert.equal(chips.includes("Zakopane"), false);
  assert.deepEqual(topFacetCities(["Hel", "Sopot", "Zakopane"]), []);
  assert.deepEqual(topFacetCities(["Łódź", "Kraków"]), ["Kraków", "Łódź"]);
  assert.equal(topFacetCities(["Warszawa"]).includes("Kraków"), false);

  assert.equal(trasyHref({ miasto: chips[0] }), "/trasy?miasto=Warszawa");
  assert.equal(trasyHref({ miasto: "" }), "/trasy");
  const parsed = parseTrasySearchParams({ miasto: "Kraków" });
  assert.equal(parsed.redirectHref, null);
  assert.equal(parsed.filters.miasto, "Kraków");
  assert.equal(trasyHref({ ...parsed.filters }), "/trasy?miasto=Krak%C3%B3w");
});

test("long standuper lists can be narrowed without dropping the current choice", () => {
  const people = Array.from({ length: 45 }, (_, index) => ({
    slug: `osoba-${index}`,
    name: index === 7 ? "Łukasz Łowicki" : `Standuper ${String(index).padStart(2, "0")}`,
  }));
  assert.equal(people.length > 40, true);
  assert.equal(peopleSelectOptions(people, "").length, 45);
  assert.equal(peopleSelectOptions(people, "   ").length, 45);
  assert.deepEqual(
    peopleSelectOptions(people, "lukasz").map((person) => person.slug),
    ["osoba-7"],
  );
  assert.deepEqual(
    peopleSelectOptions(people, "lowicki", "osoba-1").map((person) => person.slug),
    ["osoba-1", "osoba-7"],
  );
  assert.deepEqual(
    peopleSelectOptions(people, "lukasz", "osoba-7").map((person) => person.slug),
    ["osoba-7"],
  );
  assert.deepEqual(peopleSelectOptions(people, "brak", "nikt"), []);
});

test("rows normalize prices and drop events that are not publicly listed", () => {
  const row: EventRow = {
    id: 9,
    person_id: 3,
    title: "  Wentyl  ",
    starts_at: "2026-11-12T18:00:00.000Z",
    city: "Kraków",
    venue: "Studio",
    venue_address: "  ",
    price_from: "79.50",
    currency: "PLN",
    status: "on_sale",
    ticket_url: "https://kupbilecik.pl/x",
    ticket_provider: "kupbilecik",
    external_id: "kg-1",
    people: [{ name: "Abelard Giza", slug: "abelard-giza", photo_url: " https://cdn.example/a.jpg " }],
    event_ticket_links: [
      {
        ticket_url: "https://kupbilecik.pl/x",
        ticket_provider: "kupbilecik",
        external_id: "kg-1",
        is_primary: false,
      },
      {
        ticket_url: "https://ebilet.pl/x",
        ticket_provider: "ebilet",
        external_id: "eb-1",
        is_primary: false,
      },
      {
        ticket_url: "https://goingapp.pl/x",
        ticket_provider: "going",
        external_id: "go-1",
        is_primary: true,
      },
    ],
  };
  const event = toTourEvent(row);
  assert.equal(event?.title, "Wentyl");
  assert.equal(event?.price_from, 79.5);
  assert.equal(event?.venue_address, null);
  assert.equal(event?.person.photo_url, "https://cdn.example/a.jpg");
  assert.deepEqual(event?.links.map((link) => link.ticket_provider), ["kupbilecik", "going", "ebilet"]);
  assert.equal(event?.links.filter((link) => link.ticket_url === "https://kupbilecik.pl/x").length, 1);
  assert.equal(toTourEvent({ ...row, status: "cancelled" }), null);
  assert.equal(toTourEvent({ ...row, status: "unknown", people: null }), null);
  assert.equal(providerLabel("bilety24"), "Bilety24");
  assert.equal(providerLabel("other"), "Inny portal");
});

test("dates, prices, and month groups use Warsaw time and Polish copy", () => {
  const when = formatEventWhen("2026-11-12T18:00:00.000Z");
  assert.match(when, /12/);
  assert.match(when, /19:00/);
  assert.equal(formatPrice(70, "PLN"), "od 70 zł");
  assert.equal(formatPrice(79.5, "PLN"), "od 79,50 zł");
  assert.equal(formatPrice(null, "PLN"), null);
  assert.equal(terminLabel(1), "termin");
  assert.equal(terminLabel(2), "terminy");
  assert.equal(terminLabel(5), "terminów");
  assert.equal(terminLabel(12), "terminów");
  assert.equal(terminLabel(22), "terminy");

  const groups = groupEventsByMonth([
    tour(),
    tour({ id: 4, starts_at: "2026-12-02T18:00:00.000Z" }),
  ]);
  assert.deepEqual(groups.map((group) => group.key), ["2026-11", "2026-12"]);
  assert.match(groups[0].label, /2026/);
  assert.match(groups[0].label.toLowerCase(), /listopad/);
});

test("events migration exposes a public read of upcoming listings and no public writes", () => {
  const files = readdirSync(new URL("../supabase/migrations/", import.meta.url)).filter((name) =>
    name.endsWith("_create_events.sql"),
  );
  assert.equal(files.length, 1);
  const sql = readFileSync(new URL(`../supabase/migrations/${files[0]}`, import.meta.url), "utf8").toLowerCase();
  for (const column of [
    "person_id",
    "starts_at",
    "city",
    "venue",
    "venue_address",
    "price_from",
    "currency",
    "ticket_url",
    "ticket_provider",
    "external_id",
    "source_checked_at",
    "created_at",
  ]) {
    assert.match(sql, new RegExp(`\\b${column}\\b`));
  }
  assert.match(sql, /references public\.people/);
  assert.match(sql, /default 'pln'/);
  assert.match(sql, /'on_sale', 'sold_out', 'cancelled', 'unknown'/);
  assert.match(sql, /'kupbilecik', 'going', 'other'/);
  assert.match(sql, /unique \(ticket_provider, external_id\)/);
  assert.match(sql, /events_starts_at_idx/);
  assert.match(sql, /events_person_id_idx/);
  assert.match(sql, /events_city_idx/);
  assert.match(sql, /events_status_idx/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /for select/);
  assert.match(sql, /to anon, authenticated/);
  assert.match(sql, /starts_at >= now\(\)/);
  assert.doesNotMatch(sql, /for insert/);
  assert.doesNotMatch(sql, /for update/);
  assert.doesNotMatch(sql, /for delete/);
  assert.doesNotMatch(sql, /for all/);
  assert.match(sql, /revoke all on table public\.events from anon, authenticated/);
  assert.match(sql, /grant select on table public\.events to anon, authenticated/);
});

test("ticket link migration adds portals and a public read of extra links", () => {
  const files = readdirSync(new URL("../supabase/migrations/", import.meta.url)).filter((name) =>
    name.endsWith("_event_ticket_links.sql"),
  );
  assert.equal(files.length, 1);
  const sql = readFileSync(new URL(`../supabase/migrations/${files[0]}`, import.meta.url), "utf8").toLowerCase();
  for (const provider of ["kupbilecik", "going", "ebilet", "ticketmaster", "bilety24", "eventim", "biletomat", "other"]) {
    assert.match(sql, new RegExp(`'${provider}'`));
  }
  assert.match(sql, /create table public\.event_ticket_links/);
  assert.match(sql, /references public\.events \(id\) on delete cascade/);
  assert.match(sql, /is_primary boolean not null default false/);
  assert.match(sql, /unique \(ticket_provider, external_id\)/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /for select/);
  assert.match(sql, /to anon, authenticated/);
  assert.match(sql, /starts_at >= now\(\)/);
  assert.doesNotMatch(sql, /for insert/);
  assert.doesNotMatch(sql, /for update/);
  assert.doesNotMatch(sql, /for delete/);
  assert.match(sql, /revoke all on table public\.event_ticket_links from anon, authenticated/);
  assert.match(sql, /grant select on table public\.event_ticket_links to anon, authenticated/);
});

test("favorite tours are the nearest listed dates of the given people only", () => {
  assert.ok(FAVORITE_UPCOMING_LIMIT >= 8 && FAVORITE_UPCOMING_LIMIT <= 12);

  const adam = { name: "Adam Van Bendler", slug: "adam-van-bendler", photo_url: null };
  const daniel = { name: "Daniel Midas", slug: "daniel-midas", photo_url: null };
  const outsider = { name: "Kuba Wu", slug: "kuba-wu", photo_url: null };
  const events = [
    tour({ id: 1, starts_at: "2026-11-20T18:00:00.000Z", person: adam }),
    tour({ id: 2, starts_at: "2026-11-12T18:00:00.000Z", person: daniel }),
    tour({ id: 3, starts_at: "2026-11-02T18:00:00.000Z", person: outsider }),
    tour({ id: 4, starts_at: "2026-10-01T18:00:00.000Z", person: adam }),
    tour({ id: 5, starts_at: "2026-11-12T18:00:00.000Z", status: "sold_out", person: adam }),
    tour({ id: 5, starts_at: "2026-11-13T18:00:00.000Z", person: daniel }),
    tour({ id: 6, starts_at: "2026-11-01T12:00:00.000Z", person: adam }),
    { ...tour({ id: 7, person: adam }), status: "cancelled" } as TourEvent,
  ];

  const picked = pickFavoriteUpcomingEvents(
    events,
    [" Adam-Van-Bendler ", "daniel-midas", "not a slug"],
    NOW,
  );
  assert.deepEqual(picked.map((event) => event.id), [6, 2, 5, 1]);
  assert.ok(picked.every((event) => event.person.slug !== "kuba-wu"));

  const capped = pickFavoriteUpcomingEvents(
    Array.from({ length: 15 }, (_, index) => tour({
      id: index + 1,
      starts_at: new Date(Date.UTC(2026, 10, 2 + index, 18)).toISOString(),
      person: index % 2 === 0 ? adam : daniel,
    })),
    ["adam-van-bendler", "daniel-midas"],
    NOW,
  );
  assert.equal(capped.length, FAVORITE_UPCOMING_LIMIT);
  assert.deepEqual(capped.map((event) => event.id), Array.from({ length: FAVORITE_UPCOMING_LIMIT }, (_, index) => index + 1));
  assert.deepEqual(pickFavoriteUpcomingEvents(events, [], NOW), []);
});

test("favorite slug lists ignore junk and stay capped", () => {
  assert.deepEqual(
    favoritePersonSlugs([" Adam-Van-Bendler ", "adam-van-bendler", "nope!", 3, ""]),
    ["adam-van-bendler"],
  );
  assert.deepEqual(favoritePersonSlugs("adam-van-bendler"), []);
  assert.equal(
    favoritePersonSlugs(Array.from({ length: FAVORITE_PERSON_SLUG_CAP + 20 }, (_, index) => `osoba-${index}`)).length,
    FAVORITE_PERSON_SLUG_CAP,
  );
});

test("the favorites screen drops events for people who are not favorited", () => {
  const rows = [
    { id: 1, starts_at: "2026-11-20T18:00:00.000Z", city: "Toruń", status: "on_sale" as const, ticket_url: "https://example.com/a", person: { name: "Adam", slug: "adam-van-bendler" } },
    { id: 2, starts_at: "2026-11-12T18:00:00.000Z", city: "Kalisz", status: "sold_out" as const, ticket_url: "https://example.com/d", person: { name: "Daniel", slug: "daniel-midas" } },
    { id: 3, starts_at: "2026-11-02T18:00:00.000Z", city: "Bydgoszcz", status: "on_sale" as const, ticket_url: "https://example.com/k", person: { name: "Kuba", slug: "kuba-wu" } },
  ];
  assert.deepEqual(
    eventsForFavoritePeople(rows, ["adam-van-bendler"], NOW).map((event) => event.person.slug),
    ["adam-van-bendler"],
  );
  assert.deepEqual(eventsForFavoritePeople(rows, [], NOW), []);
});
