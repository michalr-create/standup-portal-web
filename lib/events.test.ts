import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import {
  eventFacets,
  eventsForFavoritePeople,
  isVisibleTicketProvider,
  FAVORITE_PERSON_SLUG_CAP,
  FAVORITE_UPCOMING_LIMIT,
  facetRedirect,
  favoritePersonSlugs,
  filterUpcomingEvents,
  formatEventWhen,
  formatRelativeWhen,
  formatPrice,
  RELATIVE_WHEN_MAX_DAYS,
  groupEventsByMonth,
  activeTrasyFilterCount,
  hasActiveTrasyFilters,
  parseTrasySearchParams,
  comboboxTypedValue,
  peopleSelectOptions,
  personComboboxActiveIndex,
  personComboboxOptions,
  mergeTourEvents,
  pageMergedEvents,
  pickFavoriteUpcomingEvents,
  profileWatchAriaLabel,
  profileWatchLabel,
  providerLabel,
  standuperProfileHref,
  terminLabel,
  topFacetCities,
  toTourEvent,
  trasyHref,
  visibleTicketLinks,
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
    people: [],
    ...overrides,
  };
  if (!overrides.people) event.people = [event.person];
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

const openFilters: TrasyFilters = { osoba: "", miasto: "", od: "", doDnia: "", bilety: "" };

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
    trasyHref({ osoba: "abelard-giza", miasto: "Kraków", od: "2026-11-12", doDnia: "2026-11-20", bilety: "dostepne" }),
    "/trasy?osoba=abelard-giza&miasto=Krak%C3%B3w&od=2026-11-12&do=2026-11-20&bilety=dostepne",
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
  assert.equal(kept.redirectHref, "/trasy?miasto=%C5%81%C3%B3d%C5%BA&bilety=wyprzedane");
  assert.equal(kept.filters.bilety, "wyprzedane");
  assert.equal(kept.filters.miasto, "Łódź");
  assert.equal(kept.redirectHref?.includes("portal"), false);
  assert.equal(parseTrasySearchParams({ portal: "shop" }).redirectHref, "/trasy");
  assert.equal(parseTrasySearchParams({ portal: "" }).redirectHref, "/trasy");
  const aggregator = parseTrasySearchParams({ portal: "bilety24", miasto: "Kraków" });
  assert.equal(aggregator.redirectHref, "/trasy?miasto=Krak%C3%B3w");
  assert.equal(aggregator.redirectHref?.includes("portal"), false);
});

test("page query stays with the active filters and omits the first page", () => {
  assert.equal(trasyHref({ osoba: "abelard-giza", page: 1 }), "/trasy?osoba=abelard-giza");
  assert.equal(trasyHref({ osoba: "abelard-giza", page: 2 }), "/trasy?osoba=abelard-giza&page=2");
  assert.equal(
    trasyHref({ miasto: "Kraków", bilety: "dostepne", page: 4 }),
    "/trasy?miasto=Krak%C3%B3w&bilety=dostepne&page=4",
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
  assert.equal(bad.redirectHref, "/trasy");

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
    filterUpcomingEvents(events, { ...openFilters, miasto: "Łódź" }, NOW).map((event) => event.id),
    [4],
  );

  const facets = eventFacets(filterUpcomingEvents(events, openFilters, NOW));
  assert.deepEqual(facets.cities, ["Kraków", "Łódź", "Warszawa"]);
  assert.deepEqual(
    facets.people.map((person) => person.slug),
    ["abelard-giza", "inny"],
  );
  assert.equal(facetRedirect({ ...openFilters, osoba: "nikt" }, facets), "/trasy");
  assert.equal(facetRedirect({ ...openFilters, miasto: "Gdańsk" }, facets), "/trasy");
  assert.equal(facetRedirect({ ...openFilters, osoba: "nikt" }, facets, 3), "/trasy?page=3");
  assert.equal(facetRedirect({ ...openFilters, osoba: "abelard-giza" }, facets, 2), null);
  assert.equal(facetRedirect(openFilters, facets), null);
  assert.equal("portals" in facets, false);
});

test("a ticket portal query is dropped and does not filter the listing", () => {
  const filtersUi = readFileSync(new URL("../app/trasy/TrasyFilters.tsx", import.meta.url), "utf8");
  const listing = readFileSync(new URL("./data.ts", import.meta.url), "utf8");
  assert.match(filtersUi, /Standuper/);
  assert.match(filtersUi, /label="Miasto"/);
  assert.match(filtersUi, /label="Od"/);
  assert.match(filtersUi, /label="Do"/);
  assert.doesNotMatch(filtersUi, /Portal|filters\.portal|facets\.portals|providerLabel/);
  assert.doesNotMatch(listing, /portal_match|filters\.portal/);

  const parsed = parseTrasySearchParams({
    portal: "ebilet",
    osoba: "abelard-giza",
    miasto: "Kraków",
    od: "2026-11-12",
    do: "2026-11-20",
    bilety: "dostepne",
    page: "2",
  });
  assert.equal(parsed.filters.osoba, "abelard-giza");
  assert.equal(parsed.filters.miasto, "Kraków");
  assert.equal(parsed.filters.od, "2026-11-12");
  assert.equal(parsed.filters.doDnia, "2026-11-20");
  assert.equal(parsed.filters.bilety, "dostepne");
  assert.equal(parsed.page, 2);
  assert.equal(
    parsed.redirectHref,
    "/trasy?osoba=abelard-giza&miasto=Krak%C3%B3w&od=2026-11-12&do=2026-11-20&bilety=dostepne&page=2",
  );
  assert.equal(trasyHref({ ...parsed.filters, page: parsed.page }).includes("portal="), false);
});

test("active trasy filter count is the number of set fields", () => {
  const empty: TrasyFilters = { osoba: "", miasto: "", od: "", doDnia: "", bilety: "" };
  assert.equal(activeTrasyFilterCount(empty), 0);
  assert.equal(hasActiveTrasyFilters(empty), false);
  assert.equal(activeTrasyFilterCount({ ...empty, miasto: "Kraków", bilety: "dostepne" }), 2);
  assert.equal(
    activeTrasyFilterCount({
      osoba: "abelard-giza",
      miasto: "",
      od: "2026-11-01",
      doDnia: "2026-11-30",
      bilety: "",
    }),
    3,
  );
  assert.equal(hasActiveTrasyFilters({ ...empty, od: "2026-11-01" }), true);
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

test("standuper combobox folds Polish diacritics and keeps Wszyscy reachable", () => {
  const people = [
    { slug: "rafal-zalewski", name: "Rafał Zalewski" },
    { slug: "lodz-komik", name: "Łódź Komik" },
    { slug: "anna-nowak", name: "Anna Nowak" },
  ];
  assert.equal(personComboboxOptions(people, "").length, 4);
  assert.equal(personComboboxOptions(people, "   ")[0]?.name, "Wszyscy");
  assert.deepEqual(
    personComboboxOptions(people, "zalewski").map((person) => person.slug),
    ["rafal-zalewski"],
  );
  assert.deepEqual(
    personComboboxOptions(people, "RAFAŁ").map((person) => person.slug),
    ["rafal-zalewski"],
  );
  assert.deepEqual(
    personComboboxOptions(people, "lodz").map((person) => person.slug),
    ["lodz-komik"],
  );
  assert.deepEqual(
    personComboboxOptions(people, "wsz").map((person) => person.slug),
    [""],
  );
  assert.deepEqual(personComboboxOptions(people, "brak"), []);

  const all = personComboboxOptions(people, "");
  assert.equal(personComboboxActiveIndex(all, "", ""), 0);
  assert.equal(
    personComboboxActiveIndex(all, "", "anna-nowak"),
    all.findIndex((person) => person.slug === "anna-nowak"),
  );
  assert.equal(
    personComboboxActiveIndex(personComboboxOptions(people, "lodz"), "lodz", "anna-nowak"),
    0,
  );
  assert.equal(personComboboxActiveIndex([], "lodz", ""), -1);

  assert.equal(comboboxTypedValue("Rafał Zalewskiz", "Rafał Zalewski", true), "z");
  assert.equal(comboboxTypedValue("z", "Rafał Zalewski", true), "z");
  assert.equal(comboboxTypedValue("Rafał Zalewski extra", "Rafał Zalewski", false), "Rafał Zalewski extra");
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
      {
        ticket_url: "https://bilety24.pl/x",
        ticket_provider: "bilety24",
        external_id: "b24-1",
        is_primary: false,
      },
    ],
  };
  const event = toTourEvent(row);
  assert.equal(event?.title, "Wentyl");
  assert.equal(event?.price_from, 79.5);
  assert.equal(event?.venue_address, null);
  assert.equal(event?.person.photo_url, "https://cdn.example/a.jpg");
  assert.deepEqual(event?.people.map((person) => person.slug), ["abelard-giza"]);
  assert.deepEqual(event?.links.map((link) => link.ticket_provider), ["kupbilecik", "going", "ebilet"]);
  assert.equal(event?.links.filter((link) => link.ticket_url === "https://kupbilecik.pl/x").length, 1);
  assert.equal(event?.links.some((link) => link.ticket_provider === "bilety24"), false);
  assert.equal(toTourEvent({ ...row, status: "cancelled" }), null);
  assert.equal(toTourEvent({ ...row, status: "unknown", people: null }), null);
  const aggregatorOnly = toTourEvent({
    ...row,
    ticket_provider: "bilety24",
    ticket_url: "https://bilety24.pl/only",
    external_id: "b24-only",
    event_ticket_links: [
      {
        ticket_url: "https://bilety24.pl/only",
        ticket_provider: "bilety24",
        external_id: "b24-only",
        is_primary: true,
      },
    ],
  });
  assert.equal(aggregatorOnly, null);
  const redirectedPrimary = toTourEvent({
    ...row,
    ticket_provider: "bilety24",
    ticket_url: "https://bilety24.pl/redir",
    external_id: "b24-redir",
    event_ticket_links: [
      {
        ticket_url: "https://kupbilecik.pl/real",
        ticket_provider: "kupbilecik",
        external_id: "kb-real",
        is_primary: false,
      },
    ],
  });
  assert.equal(redirectedPrimary?.ticket_provider, "kupbilecik");
  assert.deepEqual(redirectedPrimary?.links.map((link) => link.ticket_provider), ["kupbilecik"]);
  assert.equal(providerLabel("bilety24"), "Bilety24");
  assert.equal(isVisibleTicketProvider("bilety24"), false);
  assert.equal(isVisibleTicketProvider("kupbilecik"), true);
  assert.equal(providerLabel("other"), "Inny portal");
});

test("ticket buttons keep the primary storefront and real sellers", () => {
  const hrefFor = (url: string) => (url.startsWith("https://") ? url : null);
  const link = (
    provider: TourEvent["ticket_provider"],
    url: string,
    primary = false,
  ) => ({
    ticket_url: url,
    ticket_provider: provider,
    external_id: url,
    is_primary: primary,
  });

  const withGoing = visibleTicketLinks(
    [
      link("kupbilecik", "https://kupbilecik.pl/a", true),
      link("going", "https://goingapp.pl/a"),
      link("bilety24", "https://bilety24.pl/a"),
    ],
    hrefFor,
  );
  assert.equal(withGoing.primary?.link.ticket_provider, "kupbilecik");
  assert.equal(withGoing.primary?.href, "https://kupbilecik.pl/a");
  assert.deepEqual(withGoing.secondary.map((item) => item.link.ticket_provider), ["going"]);

  const onlyPrimary = visibleTicketLinks([link("kupbilecik", "https://kupbilecik.pl/a", true)], hrefFor);
  assert.equal(onlyPrimary.primary?.link.ticket_provider, "kupbilecik");
  assert.deepEqual(onlyPrimary.secondary, []);

  const aggregatorBadge = visibleTicketLinks(
    [
      link("kupbilecik", "https://kupbilecik.pl/a", true),
      link("bilety24", "https://bilety24.pl/a"),
    ],
    hrefFor,
  );
  assert.equal(aggregatorBadge.primary?.link.ticket_provider, "kupbilecik");
  assert.deepEqual(aggregatorBadge.secondary, []);

  const duplicateProvider = visibleTicketLinks(
    [
      link("kupbilecik", "https://kupbilecik.pl/a", true),
      link("kupbilecik", "https://kupbilecik.pl/other"),
      link("ebilet", "https://ebilet.pl/a"),
    ],
    hrefFor,
  );
  assert.deepEqual(duplicateProvider.secondary.map((item) => item.link.ticket_provider), ["ebilet"]);

  const unsafe = visibleTicketLinks([link("kupbilecik", "javascript:alert(1)", true)], hrefFor);
  assert.equal(unsafe.primary, null);
  assert.deepEqual(unsafe.secondary, []);
});

test("joint shows with the same ticket url collapse to one card", () => {
  const going = "https://goingapp.pl/wydarzenie/paczes-x-lotek-tour-2/pulawy-listopad-2026";
  const when = "2026-11-18T17:00:00.000Z";
  const paczes = { name: "Rafał Pacześ", slug: "rafal-paczes", photo_url: null };
  const lotek = { name: "Łukasz Lotek Lodkowski", slug: "lotek", photo_url: "https://cdn.example/lotek.jpg" };
  const zalewski = { name: "Bartosz Zalewski", slug: "bartosz-zalewski", photo_url: null };
  const shared = {
    starts_at: when,
    city: "Puławy",
    venue: "Puławski Ośrodek Kultury Dom Chemika",
    title: "Pacześ x Lotek Tour 2 - Puławy",
    ticket_provider: "going" as const,
  };
  const paczesRow = toTourEvent({
    id: 1603,
    person_id: 1,
    ...shared,
    venue_address: null,
    price_from: 90,
    currency: "PLN",
    status: "on_sale",
    ticket_url: `${going}?utm=newsletter`,
    external_id: "2418520:1",
    image_url: null,
    people: paczes,
  });
  const lotekRow = toTourEvent({
    id: 1604,
    person_id: 2,
    ...shared,
    venue_address: "ul. Mościckiego 1",
    price_from: null,
    currency: "PLN",
    status: "on_sale",
    ticket_url: `${going}#mapa`,
    external_id: "2418520:2",
    image_url: " https://cdn.example/plakat.jpg ",
    people: lotek,
    event_ticket_links: [
      {
        ticket_url: "https://www.kupbilecik.pl/pl/event/9",
        ticket_provider: "kupbilecik",
        external_id: "kb-9",
        is_primary: false,
      },
      {
        ticket_url: "https://bilety24.pl/paczes",
        ticket_provider: "bilety24",
        external_id: "b24-9",
        is_primary: false,
      },
    ],
  });
  assert.ok(paczesRow && lotekRow);

  const other = tour({
    id: 1700,
    starts_at: when,
    city: "Puławy",
    venue: "Inna scena",
    ticket_url: "https://goingapp.pl/wydarzenie/inna-trasa/pulawy",
    ticket_provider: "going",
    person: zalewski,
  });
  const merged = mergeTourEvents([lotekRow, other, paczesRow]);
  assert.equal(merged.length, 2);
  const joint = merged.find((event) => event.people.length === 2);
  assert.ok(joint);
  assert.equal(joint.id, 1603);
  assert.equal(joint.person.slug, "rafal-paczes");
  assert.deepEqual(joint.people.map((person) => person.slug), ["rafal-paczes", "lotek"]);
  assert.equal(joint.people[1]?.photo_url, "https://cdn.example/lotek.jpg");
  assert.equal(joint.venue_address, "ul. Mościckiego 1");
  assert.equal(joint.links.filter((link) => link.ticket_provider === "going").length, 1);
  assert.equal(joint.links.some((link) => link.ticket_provider === "kupbilecik"), true);
  assert.equal(joint.links.some((link) => link.ticket_provider === "bilety24"), false);
  assert.equal(joint.ticket_provider, "going");
  assert.equal(joint.image_url, "https://cdn.example/plakat.jpg");

  const posterOnFirst = mergeTourEvents([
    tour({
      id: 11,
      ...shared,
      person: paczes,
      ticket_url: "https://goingapp.pl/wydarzenie/poster",
      image_url: "https://cdn.example/keep.jpg",
    }),
    tour({
      id: 12,
      ...shared,
      person: lotek,
      ticket_url: "https://goingapp.pl/wydarzenie/poster",
      image_url: null,
    }),
  ]);
  assert.equal(posterOnFirst[0]?.image_url, "https://cdn.example/keep.jpg");

  const again = mergeTourEvents([
    tour({
      id: 1,
      ...shared,
      person: paczes,
      ticket_url: "https://GoingApp.pl/wydarzenie/x/",
    }),
    tour({
      id: 2,
      ...shared,
      person: lotek,
      ticket_url: "https://goingapp.pl/wydarzenie/x",
    }),
    tour({
      id: 3,
      ...shared,
      starts_at: "2026-11-19T17:00:00.000Z",
      person: zalewski,
      ticket_url: "https://goingapp.pl/wydarzenie/x",
    }),
  ]);
  assert.deepEqual(again.map((event) => event.people.map((person) => person.slug)), [
    ["rafal-paczes", "lotek"],
    ["bartosz-zalewski"],
  ]);

  const noUrl = mergeTourEvents([
    tour({ id: 8, ticket_url: "", starts_at: when, city: "Hel", venue: "Molo", person: paczes, links: [] }),
    tour({ id: 9, ticket_url: "   ", starts_at: when, city: "Hel", venue: "Molo", person: lotek, links: [] }),
    tour({ id: 10, ticket_url: "", starts_at: when, city: "Hel", venue: "Port", person: zalewski, links: [] }),
  ]);
  assert.equal(noUrl.length, 2);
  assert.deepEqual(noUrl[0]?.people.map((person) => person.slug), ["rafal-paczes", "lotek"]);

  assert.deepEqual(
    filterUpcomingEvents(merged, { ...openFilters, osoba: "rafal-paczes" }, NOW).map((event) => event.id),
    [1603],
  );
  assert.deepEqual(
    filterUpcomingEvents(merged, { ...openFilters, osoba: "lotek" }, NOW).map((event) => event.id),
    [1603],
  );
  assert.deepEqual(
    filterUpcomingEvents(merged, { ...openFilters, miasto: "Puławy" }, NOW).map((event) => event.id),
    [1603, 1700],
  );
  const facets = eventFacets(merged);
  assert.deepEqual(facets.people.map((person) => person.slug), ["bartosz-zalewski", "lotek", "rafal-paczes"]);

  const picked = pickFavoriteUpcomingEvents(merged, ["lotek"], NOW);
  assert.deepEqual(picked.map((event) => event.id), [1603]);
  assert.deepEqual(picked[0]?.people.map((person) => person.slug), ["rafal-paczes", "lotek"]);

  const page = pageMergedEvents(
    mergeTourEvents([
      ...Array.from({ length: 24 }, (_, index) => tour({
        id: index + 1,
        starts_at: new Date(Date.UTC(2026, 10, 3, 12, index)).toISOString(),
        ticket_url: `https://example.com/solo-${index}`,
      })),
      paczesRow,
      lotekRow,
    ]),
    1,
    24,
  );
  assert.equal(page.total, 25);
  assert.equal(page.events.length, 24);
  assert.equal(page.events.some((event) => event.people.length > 1), false);
  const next = pageMergedEvents(
    mergeTourEvents([
      ...Array.from({ length: 24 }, (_, index) => tour({
        id: index + 1,
        starts_at: new Date(Date.UTC(2026, 10, 3, 12, index)).toISOString(),
        ticket_url: `https://example.com/solo-${index}`,
      })),
      paczesRow,
      lotekRow,
    ]),
    2,
    24,
  );
  assert.equal(next.total, 25);
  assert.equal(next.events.length, 1);
  assert.equal(next.events[0]?.people.length, 2);
});

test("one events row with two event_people is a joint show for either comedian", () => {
  const when = "2026-11-18T17:00:00.000Z";
  const paczes = { name: "Rafał Pacześ", slug: "rafal-paczes", photo_url: null };
  const lotek = { name: "Łukasz Lotek Lodkowski", slug: "lotek", photo_url: "https://cdn.example/lotek.jpg" };
  const row: EventRow = {
    id: 50,
    person_id: 1,
    title: "Pacześ x Lotek Tour 2 - Puławy",
    starts_at: when,
    city: "Puławy",
    venue: "Dom Chemika",
    venue_address: null,
    price_from: 90,
    currency: "PLN",
    status: "on_sale",
    ticket_url: "https://goingapp.pl/wydarzenie/paczes-x-lotek/pulawy",
    ticket_provider: "going",
    external_id: "2418520",
    image_url: null,
    people: { name: "Ktoś inny", slug: "ktos-inny", photo_url: null },
    event_people: [
      { person_id: 2, people: lotek },
      { person_id: 1, people: paczes },
      { person_id: 1, people: { ...paczes, photo_url: " https://cdn.example/ignored.jpg " } },
    ],
  };
  const event = toTourEvent(row);
  assert.ok(event);
  assert.equal(event.person.slug, "rafal-paczes");
  assert.deepEqual(event.people.map((person) => person.slug), ["rafal-paczes", "lotek"]);
  assert.equal(event.people[1]?.photo_url, "https://cdn.example/lotek.jpg");
  assert.equal(event.people.some((person) => person.slug === "ktos-inny"), false);

  const merged = mergeTourEvents([event]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.id, 50);
  assert.deepEqual(merged[0]?.people.map((person) => person.slug), ["rafal-paczes", "lotek"]);

  assert.deepEqual(
    filterUpcomingEvents(merged, { ...openFilters, osoba: "lotek" }, NOW).map((item) => item.id),
    [50],
  );
  assert.deepEqual(
    filterUpcomingEvents(merged, { ...openFilters, osoba: "rafal-paczes" }, NOW).map((item) => item.id),
    [50],
  );
  assert.deepEqual(
    filterUpcomingEvents(merged, { ...openFilters, osoba: "ktos-inny" }, NOW),
    [],
  );

  const facets = eventFacets(merged);
  assert.deepEqual(facets.people.map((person) => person.slug), ["lotek", "rafal-paczes"]);

  const picked = pickFavoriteUpcomingEvents(merged, ["lotek"], NOW);
  assert.deepEqual(picked.map((item) => item.id), [50]);
  assert.deepEqual(picked[0]?.people.map((person) => person.slug), ["rafal-paczes", "lotek"]);

  const fallback = toTourEvent({ ...row, event_people: [] });
  assert.deepEqual(fallback?.people.map((person) => person.slug), ["ktos-inny"]);
  const missingJunction = toTourEvent({ ...row, event_people: undefined });
  assert.deepEqual(missingJunction?.people.map((person) => person.slug), ["ktos-inny"]);
});

test("trasy listing pages merged shows and still loads both comedians", () => {
  const data = readFileSync(new URL("./data.ts", import.meta.url), "utf8");
  const events = readFileSync(new URL("./events.ts", import.meta.url), "utf8");
  const start = data.indexOf("export async function getTrasyListing");
  assert.ok(start > 0);
  const nextExport = data.indexOf("\nexport async function ", start + 10);
  const fn = data.slice(start, nextExport === -1 ? undefined : nextExport);
  assert.match(fn, /scanUpcomingEvents/);
  assert.match(fn, /pageMergedEvents/);
  assert.match(fn, /osoba: ""/);
  assert.doesNotMatch(fn, /\.range\(/);
  assert.match(data, /mergeTourEvents/);
  assert.match(data, /withCoPerformers/);
  assert.match(data, /people!events_person_id_fkey/);
  assert.match(data, /event_people\(person_id, people\(name, slug, photo_url\)\)/);
  assert.match(data, /listedRowsForPersonMatch/);
  assert.match(fn, /eventPeople\(event\)/);
  assert.match(events, /event_people/);
  assert.match(events, /companion change/);
  assert.match(events, /image_url/);
});

test("relative cue counts Warsaw calendar days, not elapsed hours", () => {
  const afternoon = new Date("2026-11-12T14:00:00.000Z");

  assert.equal(formatRelativeWhen("2026-11-12T21:30:00.000Z", afternoon), "dziś");
  assert.equal(formatRelativeWhen("2026-11-12T08:00:00.000Z", afternoon), "dziś");
  assert.equal(formatRelativeWhen("2026-11-13T18:00:00.000Z", afternoon), "jutro");
  assert.equal(formatRelativeWhen("2026-11-14T18:00:00.000Z", afternoon), "za 2 dni");
  assert.equal(formatRelativeWhen("2027-01-11T18:00:00.000Z", afternoon), `za ${RELATIVE_WHEN_MAX_DAYS} dni`);
  assert.equal(formatRelativeWhen("2027-01-12T18:00:00.000Z", afternoon), null);
  assert.equal(formatRelativeWhen("2026-11-11T20:00:00.000Z", afternoon), null);
  assert.equal(formatRelativeWhen("not-a-date", afternoon), null);

  const beforeWinterMidnight = new Date("2026-11-12T22:30:00.000Z");
  const afterWinterMidnight = "2026-11-12T23:30:00.000Z";
  assert.equal(formatRelativeWhen(afterWinterMidnight, beforeWinterMidnight), "jutro");
  assert.equal(formatRelativeWhen(afterWinterMidnight, new Date("2026-11-12T23:05:00.000Z")), "dziś");

  const beforeSummerMidnight = new Date("2026-07-12T21:30:00.000Z");
  const afterSummerMidnight = "2026-07-12T22:30:00.000Z";
  assert.equal(formatRelativeWhen(afterSummerMidnight, beforeSummerMidnight), "jutro");
  assert.equal(formatRelativeWhen(afterSummerMidnight, new Date("2026-07-12T22:05:00.000Z")), "dziś");

  const beforeDstMidnight = new Date("2026-03-29T21:30:00.000Z");
  assert.equal(formatRelativeWhen("2026-03-29T22:30:00.000Z", beforeDstMidnight), "jutro");

  const rendered = [
    formatRelativeWhen("2026-11-12T21:30:00.000Z", afternoon),
    formatRelativeWhen("2026-11-13T18:00:00.000Z", afternoon),
    formatRelativeWhen("2026-11-14T18:00:00.000Z", afternoon),
    formatRelativeWhen("2026-11-11T20:00:00.000Z", afternoon),
    formatRelativeWhen(afterWinterMidnight, beforeWinterMidnight),
  ];
  for (const label of rendered) {
    assert.notEqual(label, "za 0 dni");
    assert.equal(label == null || !label.startsWith("za -"), true);
  }
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

test("events image_url migration adds a nullable poster column without failing if it exists", () => {
  const files = readdirSync(new URL("../supabase/migrations/", import.meta.url)).filter((name) =>
    name.endsWith("_events_image_url.sql"),
  );
  assert.equal(files.length, 1);
  const sql = readFileSync(new URL(`../supabase/migrations/${files[0]}`, import.meta.url), "utf8").toLowerCase();
  assert.match(sql, /alter table public\.events/);
  assert.match(sql, /add column if not exists image_url text/);
  assert.doesNotMatch(sql, /image_url text not null/);
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
    tour({ id: 1, starts_at: "2026-11-20T18:00:00.000Z", ticket_url: "https://example.com/1", person: adam }),
    tour({ id: 2, starts_at: "2026-11-12T18:00:00.000Z", ticket_url: "https://example.com/2", person: daniel }),
    tour({ id: 3, starts_at: "2026-11-02T18:00:00.000Z", ticket_url: "https://example.com/3", person: outsider }),
    tour({ id: 4, starts_at: "2026-10-01T18:00:00.000Z", ticket_url: "https://example.com/4", person: adam }),
    tour({ id: 5, starts_at: "2026-11-12T18:00:00.000Z", ticket_url: "https://example.com/5", status: "sold_out", person: adam }),
    tour({ id: 5, starts_at: "2026-11-13T18:00:00.000Z", ticket_url: "https://example.com/5b", person: daniel }),
    tour({ id: 6, starts_at: "2026-11-01T12:00:00.000Z", ticket_url: "https://example.com/6", person: adam }),
    { ...tour({ id: 7, ticket_url: "https://example.com/7", person: adam }), status: "cancelled" } as TourEvent,
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

test("tour card profile link stays on parska and skips a missing slug", () => {
  assert.equal(standuperProfileHref("adam-van-bendler"), "/standuper/adam-van-bendler");
  assert.equal(standuperProfileHref("  abelard-giza  "), "/standuper/abelard-giza");
  assert.equal(standuperProfileHref("adam-van-bendler")?.includes("#"), false);
  assert.equal(standuperProfileHref(""), null);
  assert.equal(standuperProfileHref("   "), null);
  assert.equal(standuperProfileHref(null), null);
  assert.equal(standuperProfileHref(undefined), null);
  assert.equal(standuperProfileHref("Adam Van"), null);
  assert.equal(standuperProfileHref("../admin"), null);
  assert.equal(standuperProfileHref("adam-van-bendler#special"), null);
  assert.equal(profileWatchLabel("Adam Van Bendler"), "Obejrzyj filmy: Adam Van Bendler");
  assert.equal(profileWatchLabel("  Rafał Pacześ  "), "Obejrzyj filmy: Rafał Pacześ");
  assert.equal(profileWatchLabel("Abelard Giza"), "Obejrzyj filmy: Abelard Giza");
  assert.equal(profileWatchAriaLabel("Adam Van Bendler"), "Nagrania: Adam Van Bendler na parska.pl");
  assert.equal(profileWatchAriaLabel("  Rafał Pacześ  "), "Nagrania: Rafał Pacześ na parska.pl");
  assert.equal(profileWatchAriaLabel("Łukasz Lotek Lodkowski"), "Nagrania: Łukasz Lotek Lodkowski na parska.pl");
});
