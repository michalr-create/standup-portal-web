import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { OPEN_MIC_FAQS } from "./open-mic-cities.ts";
import { eventNode } from "./jsonld.ts";
import {
  faqPageNode,
  openMicAdmission,
  openMicEventNode,
  openMicEventNodes,
  openMicOrganizerName,
  openMicPageGraph,
} from "./open-mic-jsonld.ts";
import type { OpenMicCycle, OpenMicDate } from "./open-mics.ts";

const NOW = new Date("2026-11-26T12:00:00.000Z");
const PAGE = "https://parska.pl/open-mic";

function cycle(overrides: Partial<OpenMicCycle> = {}): OpenMicCycle {
  return {
    id: 1,
    name: "Comedy Lab",
    slug: "comedy-lab",
    city: "Kraków",
    venue: "Pub 103,8 FM",
    address: "ul. Bożego Ciała 7, 31-059 Kraków",
    lat: null,
    lng: null,
    recurrence_text: "środa",
    language: "pl",
    signup_info: null,
    signup_url: null,
    rules: null,
    audience_price_text: "bilet 25 zł",
    organizer: "Comedy Lab",
    status: "active",
    ...overrides,
  };
}

function date(overrides: Partial<OpenMicDate> = {}): OpenMicDate {
  return {
    id: 10,
    open_mic_id: 1,
    title: "Comedy Lab – open mic",
    starts_at: "2026-12-02T18:00:00.000Z",
    city: "Kraków",
    venue: "Pub 103,8 FM",
    provider: "kupbilecik",
    url: "https://www.kupbilecik.pl/pl/event/1",
    status: "on_sale",
    ...overrides,
  };
}

test("admission is free only when the audience text says so, never because it is an open mic", () => {
  for (const text of [
    "wstęp wolny",
    "wstęp wolny (napiwki)",
    "wstęp wolny z rezerwacją (93 miejsca)",
    "wstęp wolny, zbiórka na Szlachetną Paczkę",
    "Wstęp bezpłatny",
    "free admission",
  ]) {
    assert.equal(openMicAdmission(text).free, true, text);
  }

  for (const text of [
    null,
    "",
    "bilet 25 zł",
    "bilet 20 zł",
    "bilet 15 zł",
    "bilet od 25 zł",
    "bilet 20–25 zł",
    "bilet 25 zł przedsprzedaż / 30 zł w dniu",
    "bilety przez evently",
    "wstęp za dobrowolną dotację (sugerowane 5–20 zł)",
    "bilet 20 zł; występujący + 1 osoba wchodzą za darmo",
    "występujący + 1 osoba wchodzą za darmo; widzowie 20 zł",
    "City24 bilet 20 zł, Arcade Bee wstęp wolny (konsumpcja)",
  ]) {
    assert.equal(openMicAdmission(text).free, false, String(text));
  }

  assert.equal(openMicAdmission("bilet 25 zł").price, 25);
  assert.equal(openMicAdmission("bilet 19 zł").price, 19);
  assert.equal(openMicAdmission("bilet 20 zł przy wejściu").price, 20);
  assert.equal(openMicAdmission("bilet 20 zł (10 zł do wydania na barze)").price, 20);
  assert.equal(openMicAdmission("bilet 20 zł; występujący + 1 osoba wchodzą za darmo").price, 20);
  assert.equal(openMicAdmission("bilet od 25 zł").price, null);
  assert.equal(openMicAdmission("bilet 20–25 zł").price, null);
  assert.equal(openMicAdmission("bilet 25 zł przedsprzedaż / 30 zł w dniu").price, null);
  assert.equal(openMicAdmission("bilet podwójny od 25 zł").price, null);
  assert.equal(openMicAdmission("bilety przez evently").price, null);
  assert.equal(openMicAdmission("występujący + 1 osoba wchodzą za darmo; widzowie 20 zł").price, null);
  assert.equal(openMicAdmission("City24 bilet 20 zł, Arcade Bee wstęp wolny (konsumpcja)").price, null);
  assert.equal(openMicAdmission("wstęp za dobrowolną dotację (sugerowane 5–20 zł)").price, null);
  assert.equal(openMicAdmission(null).price, null);
});

test("a paid open mic never gets free admission or an invented zero price", () => {
  const paid = openMicEventNode({ date: date(), cycle: cycle(), pageUrl: PAGE, now: NOW });
  assert.equal(paid?.isAccessibleForFree, undefined);
  const offer = paid?.offers as { price: number; priceCurrency: string; availability: string; url: string };
  assert.equal(offer.price, 25);
  assert.equal(offer.priceCurrency, "PLN");
  assert.equal(offer.availability, "https://schema.org/InStock");
  assert.equal(offer.url, "https://www.kupbilecik.pl/pl/event/1");
  assert.equal(JSON.stringify(paid).includes('"price":0'), false);

  const unpriced = openMicEventNode({
    date: date({ url: "https://example.com/bilety" }),
    cycle: cycle({ audience_price_text: "bilety przez evently" }),
    pageUrl: PAGE,
    now: NOW,
  });
  assert.equal(unpriced?.isAccessibleForFree, undefined);
  const bare = unpriced?.offers as { url: string; availability: string };
  assert.equal(bare.url, "https://example.com/bilety");
  assert.equal(bare.availability, "https://schema.org/InStock");
  assert.equal("price" in bare, false);
  assert.equal("priceCurrency" in bare, false);

  const noUrl = openMicEventNode({
    date: date({ url: null }),
    cycle: cycle({ audience_price_text: "bilet od 30 zł" }),
    pageUrl: PAGE,
    now: NOW,
  });
  assert.equal(noUrl?.offers, undefined);
  assert.equal(noUrl?.isAccessibleForFree, undefined);
});

test("free admission is marked only from the audience text, including price 0", () => {
  const free = openMicEventNode({
    date: date({ url: "https://warsawcomedy.com/" }),
    cycle: cycle({ audience_price_text: "wstęp wolny (napiwki)", language: "en", organizer: "Warsaw Comedy" }),
    pageUrl: PAGE,
    now: NOW,
  });
  assert.equal(free?.isAccessibleForFree, true);
  assert.equal(free?.inLanguage, "en");
  const offer = free?.offers as { price: number; priceCurrency: string };
  assert.equal(offer.price, 0);
  assert.equal(offer.priceCurrency, "PLN");
});

test("unknown dates stay scheduled and carry no offer or availability", () => {
  const unknown = openMicEventNode({
    date: date({ status: "unknown", url: "https://example.com/x" }),
    cycle: cycle({ audience_price_text: "bilet 30 zł" }),
    pageUrl: PAGE,
    now: NOW,
  });
  assert.equal(unknown?.eventStatus, "https://schema.org/EventScheduled");
  assert.equal(unknown?.offers, undefined);
  assert.equal(JSON.stringify(unknown).includes("availability"), false);
  assert.equal(unknown?.isAccessibleForFree, undefined);

  const soldOut = openMicEventNode({
    date: date({ status: "sold_out" }),
    cycle: cycle(),
    pageUrl: PAGE,
    now: NOW,
  });
  assert.equal((soldOut?.offers as { availability: string }).availability, "https://schema.org/SoldOut");
});

test("organizer is the cycle host and never parska", () => {
  assert.equal(openMicOrganizerName("  Comedy Lab  "), "Comedy Lab");
  assert.equal(openMicOrganizerName("Stand-up Polska"), "Stand-up Polska");
  assert.equal(openMicOrganizerName("parska."), null);
  assert.equal(openMicOrganizerName("parska.pl"), null);
  assert.equal(openMicOrganizerName("Parska"), null);
  assert.equal(openMicOrganizerName("www.parska.pl"), null);
  assert.equal(openMicOrganizerName("  "), null);

  const hosted = openMicEventNode({ date: date(), cycle: cycle({ organizer: "Comedy Lab" }), pageUrl: PAGE, now: NOW });
  assert.deepEqual(hosted?.organizer, { "@type": "Organization", name: "Comedy Lab" });

  for (const organizer of ["parska.", "parska.pl", null]) {
    const node = openMicEventNode({
      date: date(),
      cycle: cycle({ organizer }),
      pageUrl: PAGE,
      now: NOW,
    });
    assert.equal(node?.organizer, undefined, String(organizer));
    const organizerJson = JSON.stringify(node?.organizer ?? null);
    assert.equal(organizerJson.includes("parska"), false);
  }
});

test("a venue without a street still gets a Place, and past or cancelled dates do not", () => {
  const noStreet = openMicEventNode({
    date: date({ venue: "Amondo Kino", city: "Warszawa" }),
    cycle: cycle({ venue: "Amondo Kino", city: "Warszawa", address: null }),
    pageUrl: PAGE,
    now: NOW,
  });
  const address = (noStreet?.location as { name: string; address: Record<string, string> }).address;
  assert.equal((noStreet?.location as { name: string }).name, "Amondo Kino");
  assert.equal(address.addressLocality, "Warszawa");
  assert.equal(address.addressCountry, "PL");
  assert.equal("streetAddress" in address, false);

  const withStreet = openMicEventNode({ date: date(), cycle: cycle(), pageUrl: PAGE, now: NOW });
  const street = (withStreet?.location as { address: { streetAddress: string; postalCode: string } }).address;
  assert.equal(street.streetAddress, "ul. Bożego Ciała 7");
  assert.equal(street.postalCode, "31-059");

  assert.equal(
    openMicEventNode({
      date: date({ starts_at: "2026-11-01T18:00:00.000Z" }),
      cycle: cycle(),
      pageUrl: PAGE,
      now: NOW,
    }),
    null,
  );
  assert.equal(openMicEventNode({ date: date({ status: "cancelled" }), cycle: cycle(), pageUrl: PAGE, now: NOW }), null);
  assert.equal(
    openMicEventNode({ date: date({ venue: "  ", city: "Kraków" }), cycle: cycle({ venue: "  " }), pageUrl: PAGE, now: NOW }),
    null,
  );
});

test("the graph has one future event per date, a FAQ only of visible questions, and valid JSON", () => {
  const cycles = [
    cycle(),
    cycle({ id: 2, name: "Bez daty", audience_price_text: "wstęp wolny", organizer: null }),
  ];
  const dates = [
    date(),
    date({ id: 11, open_mic_id: 2, starts_at: "2026-11-01T18:00:00.000Z", title: "Miniony" }),
    date({ id: 12, open_mic_id: 1, status: "unknown", title: "Do potwierdzenia", url: null }),
  ];
  const graph = openMicPageGraph({
    pageUrl: PAGE,
    cycles,
    dates,
    now: NOW,
    faqs: OPEN_MIC_FAQS,
  });
  const parsed = JSON.parse(JSON.stringify(graph)) as { "@graph": Record<string, unknown>[] };
  const events = parsed["@graph"].filter((node) => node["@type"] === "Event");
  assert.equal(events.length, 2);
  assert.equal(events.some((node) => node.name === "Miniony"), false);
  assert.equal(events.some((node) => node.name === "Bez daty"), false);
  const unknown = events.find((node) => node.name === "Do potwierdzenia");
  assert.equal(unknown?.offers, undefined);
  const faq = parsed["@graph"].find((node) => node["@type"] === "FAQPage");
  const questions = faq?.mainEntity as { name: string }[];
  assert.deepEqual(
    questions.map((item) => item.name),
    OPEN_MIC_FAQS.map((item) => item.question),
  );

  const cityFaqs = OPEN_MIC_FAQS.slice(0, 3);
  const city = openMicPageGraph({
    pageUrl: "https://parska.pl/open-mic/krakow",
    cycles: [cycle()],
    dates: [date()],
    now: NOW,
    faqs: cityFaqs,
    breadcrumbs: [
      { name: "Start", url: "https://parska.pl/" },
      { name: "Open mic", url: "https://parska.pl/open-mic" },
      { name: "Kraków", url: "https://parska.pl/open-mic/krakow" },
    ],
  });
  const cityNodes = city["@graph"] as { "@type": string; itemListElement?: { name: string }[]; mainEntity?: unknown[] }[];
  assert.deepEqual(
    cityNodes[0]?.itemListElement?.map((item) => item.name),
    ["Start", "Open mic", "Kraków"],
  );
  assert.equal(cityNodes.filter((node) => node["@type"] === "Event").length, 1);
  assert.equal(cityNodes.find((node) => node["@type"] === "FAQPage")?.mainEntity?.length, 3);
  assert.equal(JSON.stringify(city).includes("Jak znaleźć open mic"), false);

  assert.equal(faqPageNode([{ question: "  ", answer: "x" }]), null);
  assert.equal(openMicEventNodes(cycles, [date({ id: 11, starts_at: "2026-11-01T18:00:00.000Z" })], PAGE, NOW).length, 0);
});

test("tour eventNode is unchanged: no organizer, and a missing street still drops that show", () => {
  const show = eventNode({
    id: 1033,
    title: "Kacper Ruciński",
    startsAt: "2027-01-26T18:00:00.000Z",
    city: "Kraków",
    venue: "Nowohuckie Centrum Kultury",
    venueAddress: "ul. Jana Pawła II 232, 31-913, Kraków",
    priceFrom: 80,
    currency: "PLN",
    status: "on_sale",
    imageUrl: null,
    offerUrl: "https://www.kupbilecik.pl/pl/event/214627/krakow/kacper-rucinski",
    performers: [],
    now: NOW,
  });
  assert.equal(show && "organizer" in show, false);
  assert.equal(show?.["@type"], "Event");
  assert.equal(
    eventNode({
      id: 1,
      title: "Bez ulicy",
      startsAt: "2027-01-26T18:00:00.000Z",
      city: "Kraków",
      venue: "Amondo",
      venueAddress: null,
      priceFrom: null,
      currency: "PLN",
      status: "on_sale",
      imageUrl: null,
      offerUrl: null,
      performers: [],
      now: NOW,
    }),
    null,
  );
});

test("the submit form stays noindex and has no Event schema", () => {
  const dodaj = readFileSync(new URL("../app/open-mic/dodaj/page.tsx", import.meta.url), "utf8");
  assert.match(dodaj, /noindexMetadata\(/);
  assert.doesNotMatch(dodaj, /openMicPageGraph/);
  assert.doesNotMatch(dodaj, /application\/ld\+json/);
  assert.doesNotMatch(dodaj, /"@type": "Event"/);
});
