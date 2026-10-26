import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import {
  eventFacets,
  facetRedirect,
  filterUpcomingEvents,
  formatEventWhen,
  formatPrice,
  groupEventsByMonth,
  parseTrasySearchParams,
  providerLabel,
  terminLabel,
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
  assert.deepEqual(facets.portals, ["eBilet", "Going", "Kupbilecik"].map((label) => {
    if (label === "eBilet") return "ebilet";
    if (label === "Going") return "going";
    return "kupbilecik";
  }));
  assert.equal(facetRedirect(openFilters, facets), null);
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
