import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cityPageGraph,
  eventNode,
  eventPageGraph,
  homePageGraph,
  iso8601Duration,
  personPageGraph,
  postalAddress,
  specialPageGraph,
  specialVideoObject,
  warsawSchemaStart,
} from "./jsonld.ts";

const pageUrl = "https://parska.pl/specjale/abelard-giza-piniata-cale-nagranie-2020-stand-up";

test("duration is ISO-8601 and omitted when missing or not positive", () => {
  assert.equal(iso8601Duration(2857), "PT47M37S");
  assert.equal(iso8601Duration(3600), "PT1H0M0S");
  assert.equal(iso8601Duration(60), "PT1M0S");
  assert.equal(iso8601Duration(45), "PT45S");
  assert.equal(iso8601Duration(0), null);
  assert.equal(iso8601Duration(-5), null);
  assert.equal(iso8601Duration(null), null);
  assert.equal(iso8601Duration(Number.NaN), null);
});

test("a free YouTube special emits VideoObject and BreadcrumbList", () => {
  const graph = specialPageGraph({
    name: "Abelard Giza - Piniata",
    description: "Pełny program.",
    thumbnailUrl: "https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg",
    publishedAt: "2020-05-01T12:00:00.000Z",
    durationSeconds: 2857,
    videoId: "abcdefghijk",
    isPaid: false,
    pageUrl,
    people: [{ name: "Abelard Giza", slug: "abelard-giza" }],
  });
  assert.equal(graph["@context"], "https://schema.org");
  const nodes = graph["@graph"] as Record<string, unknown>[];
  assert.equal(nodes.length, 2);
  assert.equal(nodes[0]?.["@type"], "BreadcrumbList");
  const crumbs = nodes[0]?.itemListElement as { position: number; name: string; item: string }[];
  assert.equal(crumbs[0]?.item, "https://parska.pl/");
  assert.equal(crumbs[1]?.item, "https://parska.pl/specjale");
  assert.equal(crumbs[2]?.name, "Abelard Giza - Piniata");
  assert.equal(crumbs[2]?.item, pageUrl);

  const video = nodes[1] ?? {};
  assert.equal(video["@type"], "VideoObject");
  assert.equal(video.name, "Abelard Giza - Piniata");
  assert.equal(video.description, "Pełny program.");
  assert.equal(video.thumbnailUrl, "https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg");
  assert.equal(video.uploadDate, "2020-05-01T12:00:00.000Z");
  assert.equal(video.duration, "PT47M37S");
  assert.equal(video.embedUrl, "https://www.youtube.com/embed/abcdefghijk");
  assert.equal(video.contentUrl, "https://www.youtube.com/watch?v=abcdefghijk");
  assert.equal(video.url, pageUrl);
  assert.equal(video.inLanguage, "pl-PL");
  const author = video.author as { name: string; url: string }[];
  assert.equal(author[0]?.name, "Abelard Giza");
  assert.equal(author[0]?.url, "https://parska.pl/standuper/abelard-giza");
  assert.deepEqual(video.actor, video.author);
});

test("paid specials and missing runtime skip VideoObject or duration", () => {
  const paid = specialPageGraph({
    name: "Wentyl (2026)",
    description: "Płatny VOD.",
    thumbnailUrl: "https://abelardgiza.pl/wentyl.jpg",
    publishedAt: "2026-01-01T00:00:00.000Z",
    durationSeconds: 3600,
    videoId: null,
    isPaid: true,
    pageUrl: "https://parska.pl/specjale/abelard-giza-wentyl-2026",
    people: [{ name: "Abelard Giza", slug: "abelard-giza" }],
  });
  const paidNodes = paid["@graph"] as Record<string, unknown>[];
  assert.equal(paidNodes.length, 1);
  assert.equal(paidNodes[0]?.["@type"], "BreadcrumbList");
  assert.equal(specialVideoObject({
    name: "Wentyl (2026)",
    description: "Płatny VOD.",
    thumbnailUrl: null,
    publishedAt: null,
    durationSeconds: 3600,
    videoId: "abcdefghijk",
    isPaid: true,
    pageUrl: "https://parska.pl/specjale/abelard-giza-wentyl-2026",
    people: [],
  }), null);

  const undated = specialVideoObject({
    name: "Szur",
    description: "Program.",
    thumbnailUrl: "https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg",
    publishedAt: "2024-01-01T00:00:00.000Z",
    durationSeconds: null,
    videoId: "abcdefghijk",
    isPaid: false,
    pageUrl: "https://parska.pl/specjale/szur",
    people: [],
  });
  assert.equal(undated?.duration, undefined);
  assert.equal("duration" in (undated ?? {}), false);
});

const NOW = new Date("2026-11-25T20:00:00.000Z");

const RUCINSKI = {
  id: 1033,
  title: "Kacper Ruciński",
  startsAt: "2027-01-26T18:00:00.000Z",
  city: "Kraków",
  venue: "Nowohuckie Centrum Kultury",
  venueAddress: "ul. Jana Pawła II 232, 31-913, Kraków",
  priceFrom: 80,
  currency: "PLN",
  status: "on_sale",
  imageUrl: "https://assets.kupbilecik.pl/img/baza/1000/168_600x400.jpg?1788767530",
  offerUrl: "https://www.kupbilecik.pl/pl/event/214627/krakow/kacper-rucinski",
  performers: [{ name: "Kacper Ruciński", slug: "kacper-rucinski" }],
  now: NOW,
};

test("warsaw offset is +01:00 in winter and +02:00 in summer, never Z", () => {
  assert.equal(warsawSchemaStart("2027-01-26T18:00:00.000Z"), "2027-01-26T19:00:00+01:00");
  assert.equal(warsawSchemaStart("2027-05-12T16:00:00.000Z"), "2027-05-12T18:00:00+02:00");
  assert.equal(warsawSchemaStart("2027-01-26T23:00:00.000Z"), "2027-01-27");
  assert.equal(warsawSchemaStart("not-a-date"), null);
});

test("address parser splits a street and postal code, and keeps an unsure line whole", () => {
  assert.deepEqual(postalAddress("ul. Jana Pawła II 232, 31-913, Kraków", "Kraków"), {
    "@type": "PostalAddress",
    streetAddress: "ul. Jana Pawła II 232",
    postalCode: "31-913",
    addressLocality: "Kraków",
    addressCountry: "PL",
  });
  assert.deepEqual(postalAddress("COS Torwar", "Warszawa"), {
    "@type": "PostalAddress",
    streetAddress: "COS Torwar",
    addressLocality: "Warszawa",
    addressCountry: "PL",
  });
  assert.equal(postalAddress("  ", "Kraków"), null);
  assert.equal(postalAddress("ul. Długa 1", ""), null);
});

test("event 1033 matches the real Kraków show and skips fields we do not have", () => {
  const event = eventNode(RUCINSKI);
  assert.deepEqual(event, {
    "@type": "Event",
    name: "Kacper Ruciński",
    url: "https://parska.pl/wystep/1033",
    startDate: "2027-01-26T19:00:00+01:00",
    eventStatus: "https://schema.org/EventScheduled",
    inLanguage: "pl",
    image: "https://assets.kupbilecik.pl/img/baza/1000/168_600x400.jpg?1788767530",
    location: {
      "@type": "Place",
      name: "Nowohuckie Centrum Kultury",
      address: {
        "@type": "PostalAddress",
        streetAddress: "ul. Jana Pawła II 232",
        postalCode: "31-913",
        addressLocality: "Kraków",
        addressCountry: "PL",
      },
    },
    offers: {
      "@type": "Offer",
      url: "https://www.kupbilecik.pl/pl/event/214627/krakow/kacper-rucinski",
      availability: "https://schema.org/InStock",
      price: 80,
      priceCurrency: "PLN",
    },
    performer: {
      "@type": "Person",
      name: "Kacper Ruciński",
      url: "https://parska.pl/standuper/kacper-rucinski",
    },
  });
  assert.equal(event && "organizer" in event, false);
  assert.equal(event && "endDate" in event, false);
  assert.equal(event && "eventAttendanceMode" in event, false);
  const offer = event?.offers as Record<string, unknown>;
  assert.equal("validFrom" in offer, false);

  const summer = eventNode({
    ...RUCINSKI,
    id: 1455,
    startsAt: "2027-05-12T16:00:00.000Z",
    city: "Poznań",
    venue: "Kino Teatr Apollo",
    venueAddress: "ul. Ratajczaka 18, 61-815, Poznań",
    offerUrl: "https://www.kupbilecik.pl/pl/event/221729/poznan/kacper-rucinski",
  });
  assert.equal(summer?.startDate, "2027-05-12T18:00:00+02:00");
  assert.equal(String(summer?.startDate).endsWith("Z"), false);
});

test("a show without a street address, or one that already started, has no Event", () => {
  assert.equal(eventNode({ ...RUCINSKI, venueAddress: null }), null);
  assert.equal(eventNode({ ...RUCINSKI, venueAddress: "   " }), null);
  assert.equal(eventNode({ ...RUCINSKI, startsAt: "2026-11-01T18:00:00.000Z" }), null);
  assert.equal(eventNode({ ...RUCINSKI, title: "   " }), null);

  const graph = eventPageGraph({
    ...RUCINSKI,
    venueAddress: null,
    crumb: "Pacześ x Lotek Tour 2 - Warszawa",
    pageUrl: "https://parska.pl/wystep/1574",
    performers: [
      { name: "Rafał Pacześ", slug: "rafal-paczes" },
      { name: "Łukasz Lotek Lodkowski", slug: "lotek" },
    ],
  });
  const nodes = graph["@graph"] as Record<string, unknown>[];
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0]?.["@type"], "BreadcrumbList");
  assert.equal(JSON.stringify(graph).includes("\"Event\""), false);

  const bill = eventNode({
    ...RUCINSKI,
    performers: [
      { name: "Rafał Pacześ", slug: "rafal-paczes" },
      { name: "Łukasz Lotek Lodkowski", slug: "lotek" },
    ],
    status: "sold_out",
    priceFrom: null,
  });
  const performers = bill?.performer as { name: string; url: string }[];
  assert.equal(Array.isArray(performers), true);
  assert.deepEqual(performers.map((person) => person.name), ["Rafał Pacześ", "Łukasz Lotek Lodkowski"]);
  const soldOut = bill?.offers as { price?: number; availability: string };
  assert.equal(soldOut.availability, "https://schema.org/SoldOut");
  assert.equal("price" in soldOut, false);
  assert.equal("priceCurrency" in soldOut, false);
});

test("home and profile graphs stay within the fields we actually have", () => {
  const home = homePageGraph();
  const homeJson = JSON.stringify(home);
  assert.equal(homeJson.includes("SearchAction"), false);
  assert.equal(homeJson.includes("potentialAction"), false);
  const homeNodes = home["@graph"] as Record<string, unknown>[];
  assert.deepEqual(homeNodes.map((node) => node["@type"]), ["Organization", "WebSite"]);
  assert.equal(homeNodes[0]?.name, "parska.");
  assert.equal(homeNodes[0]?.["@id"], "https://parska.pl/#org");
  assert.equal(homeNodes[1]?.["@id"], "https://parska.pl/#website");
  assert.equal(homeNodes[1]?.inLanguage, "pl-PL");
  assert.deepEqual(homeNodes[1]?.publisher, { "@id": "https://parska.pl/#org" });

  const bare = personPageGraph({
    name: "Kacper Ruciński",
    slug: "kacper-rucinski",
    bio: "  ",
    photoUrl: null,
    sameAs: ["https://www.youtube.com/@KacperRucinskiStandUp", "https://www.youtube.com/@KacperRucinskiStandUp"],
  });
  const person = (bare["@graph"] as Record<string, unknown>[])[0] ?? {};
  assert.equal(person["@type"], "Person");
  assert.equal(person.name, "Kacper Ruciński");
  assert.equal(person.url, "https://parska.pl/standuper/kacper-rucinski");
  assert.deepEqual(person.sameAs, ["https://www.youtube.com/@KacperRucinskiStandUp"]);
  assert.equal("description" in person, false);
  assert.equal("image" in person, false);
  assert.equal(JSON.stringify(bare).includes("instagram"), false);

  const giza = personPageGraph({
    name: "Abelard Giza",
    slug: "abelard-giza",
    sameAs: [
      "https://www.youtube.com/@abelardgiza",
      "https://www.youtube.com/channel/UCXoF-zTFi9cY-HCR5evU7eg",
      "javascript:alert(1)",
    ],
  });
  const gizaPerson = (giza["@graph"] as Record<string, unknown>[])[0] ?? {};
  assert.deepEqual(gizaPerson.sameAs, [
    "https://www.youtube.com/@abelardgiza",
    "https://www.youtube.com/channel/UCXoF-zTFi9cY-HCR5evU7eg",
  ]);
  const crumbs = (giza["@graph"] as { itemListElement: { name: string; item: string }[] }[])[1];
  assert.deepEqual(crumbs?.itemListElement.map((item) => item.name), ["Start", "Standuperzy", "Abelard Giza"]);
  assert.equal(crumbs?.itemListElement[1]?.item, "https://parska.pl/standuperzy");

  const withBio = personPageGraph({
    name: "Bartek Skrobisz",
    slug: "bartek-skrobisz",
    bio: "Bio z bazy.",
    photoUrl: "https://cdn.example/bartek.jpg",
  });
  const rich = (withBio["@graph"] as Record<string, unknown>[])[0] ?? {};
  assert.equal(rich.description, "Bio z bazy.");
  assert.equal(rich.image, "https://cdn.example/bartek.jpg");
  assert.equal("sameAs" in rich, false);

  const city = cityPageGraph("Kraków", "https://parska.pl/trasy/krakow");
  const cityNodes = city["@graph"] as Record<string, unknown>[];
  assert.equal(cityNodes.length, 1);
  assert.equal(cityNodes[0]?.["@type"], "BreadcrumbList");
  assert.equal(JSON.stringify(city).includes("\"Event\""), false);
});
