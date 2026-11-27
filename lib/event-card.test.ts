import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { TourEvent } from "./events.ts";
import { withTicketUtm, type TicketPlacement } from "./ticket-utm.ts";

const require = createRequire(import.meta.url);
const ts = require("typescript") as typeof import("typescript");
const { renderToStaticMarkup } = require("react-dom/server") as typeof import("react-dom/server");
const React = require("react") as typeof import("react");

function compile(source: string, jsx: boolean): string {
  return ts.transpileModule(source, {
    compilerOptions: {
      jsx: jsx ? ts.JsxEmit.ReactJSX : ts.JsxEmit.None,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
}

function loadEventCard(): (props: { event: TourEvent; now: Date }) => React.ReactElement {
  const dir = mkdtempSync(join(tmpdir(), "event-card-"));
  const eventsPath = join(dir, "events.cjs");
  const comboboxPath = join(dir, "combobox.cjs");
  const youtubePath = join(dir, "youtube.cjs");
  const linkPath = join(dir, "link.cjs");
  const cardPath = join(dir, "card.cjs");
  const plansPath = join(dir, "plans.cjs");
  const sizedPath = join(dir, "sized.cjs");
  const posterPath = join(dir, "poster.cjs");
  const ticketUtmPath = join(dir, "ticket-utm.cjs");
  const ticketLinkPath = join(dir, "ticket-link.cjs");
  const analyticsStubPath = join(dir, "analytics-stub.cjs");
  const altPath = join(dir, "image-alt.cjs");
  const slugifyPath = join(dir, "slugify.cjs");
  const landingsPath = join(dir, "landings.cjs");
  const reactPath = require.resolve("react");
  const jsxPath = require.resolve("react/jsx-runtime");
  writeFileSync(comboboxPath, compile(readFileSync(new URL("./combobox.ts", import.meta.url), "utf8"), false));
  writeFileSync(
    eventsPath,
    compile(readFileSync(new URL("./events.ts", import.meta.url), "utf8"), false).replaceAll(
      'require("./combobox.ts")',
      `require(${JSON.stringify(comboboxPath)})`,
    ),
  );
  writeFileSync(altPath, compile(readFileSync(new URL("./image-alt.ts", import.meta.url), "utf8"), false));
  writeFileSync(slugifyPath, compile(readFileSync(new URL("./slugify.ts", import.meta.url), "utf8"), false));
  writeFileSync(
    landingsPath,
    compile(readFileSync(new URL("./city-landings.ts", import.meta.url), "utf8"), false)
      .replaceAll('require("./events.ts")', `require(${JSON.stringify(eventsPath)})`)
      .replaceAll('require("./slugify.ts")', `require(${JSON.stringify(slugifyPath)})`),
  );
  writeFileSync(
    sizedPath,
    compile(readFileSync(new URL("../app/components/SizedImage.tsx", import.meta.url), "utf8"), true)
      .replaceAll('require("react/jsx-runtime")', `require(${JSON.stringify(jsxPath)})`)
      .replaceAll('require("react")', `require(${JSON.stringify(reactPath)})`),
  );
  writeFileSync(
    posterPath,
    compile(readFileSync(new URL("../app/components/EventPoster.tsx", import.meta.url), "utf8"), true)
      .replaceAll('require("./SizedImage")', `require(${JSON.stringify(sizedPath)})`)
      .replaceAll('require("@/lib/image-alt")', `require(${JSON.stringify(altPath)})`)
      .replaceAll('require("react/jsx-runtime")', `require(${JSON.stringify(jsxPath)})`)
      .replaceAll('require("react")', `require(${JSON.stringify(reactPath)})`),
  );
  writeFileSync(youtubePath, compile(readFileSync(new URL("./youtube.ts", import.meta.url), "utf8"), false));
  writeFileSync(ticketUtmPath, compile(readFileSync(new URL("./ticket-utm.ts", import.meta.url), "utf8"), false));
  writeFileSync(analyticsStubPath, "function trackParska() {}\nexports.trackParska = trackParska;\n");
  writeFileSync(
    ticketLinkPath,
    compile(readFileSync(new URL("../app/components/TicketOutboundLink.tsx", import.meta.url), "utf8"), true)
      .replaceAll('require("@/lib/ticket-utm")', `require(${JSON.stringify(ticketUtmPath)})`)
      .replaceAll('require("@/lib/analytics")', `require(${JSON.stringify(analyticsStubPath)})`)
      .replaceAll('require("react/jsx-runtime")', `require(${JSON.stringify(jsxPath)})`)
      .replaceAll('require("react")', `require(${JSON.stringify(reactPath)})`),
  );
  writeFileSync(
    linkPath,
    [
      `const React = require(${JSON.stringify(reactPath)});`,
      "function Link({ href, children, ...rest }) {",
      '  return React.createElement("a", { href, ...rest }, children);',
      "}",
      "module.exports = Link;",
      "module.exports.default = Link;",
      "module.exports.__esModule = true;",
    ].join("\n"),
  );
  writeFileSync(
    plansPath,
    [
      `const React = require(${JSON.stringify(reactPath)});`,
      "function EventPlanActions() { return React.createElement('div', { 'data-event-plans': '1' }); }",
      "module.exports.default = EventPlanActions;",
      "module.exports.__esModule = true;",
    ].join("\n"),
  );
  const card = compile(readFileSync(new URL("../app/trasy/EventCard.tsx", import.meta.url), "utf8"), true)
    .replaceAll('require("@/lib/events")', `require(${JSON.stringify(eventsPath)})`)
    .replaceAll('require("@/lib/city-landings")', `require(${JSON.stringify(landingsPath)})`)
    .replaceAll('require("@/lib/youtube")', `require(${JSON.stringify(youtubePath)})`)
    .replaceAll('require("../components/EventPoster")', `require(${JSON.stringify(posterPath)})`)
    .replaceAll('require("../components/TicketOutboundLink")', `require(${JSON.stringify(ticketLinkPath)})`)
    .replaceAll('require("@/lib/ticket-utm")', `require(${JSON.stringify(ticketUtmPath)})`)
    .replaceAll('require("./EventPlanActions")', `require(${JSON.stringify(plansPath)})`)
    .replaceAll('require("next/link")', `require(${JSON.stringify(linkPath)})`)
    .replaceAll('require("react/jsx-runtime")', `require(${JSON.stringify(jsxPath)})`)
    .replaceAll('require("react")', `require(${JSON.stringify(reactPath)})`);
  writeFileSync(cardPath, card);
  const loaded = require(cardPath) as { default: (props: { event: TourEvent; now: Date }) => React.ReactElement };
  return loaded.default;
}

const EventCard = loadEventCard();
const NOW = new Date("2026-11-11T12:00:00.000Z");

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
    ticket_url: "https://kupbilecik.pl/adam",
    ticket_provider: "kupbilecik",
    links: [],
    image_url: null,
    person: { name: "Adam Van Bendler", slug: "adam-van-bendler", photo_url: "https://cdn.example/adam.jpg" },
    people: [],
    ...overrides,
  };
  if (!overrides.people) event.people = [event.person];
  if (!overrides.links) {
    event.links = [
      {
        ticket_url: event.ticket_url,
        ticket_provider: event.ticket_provider,
        external_id: "kb-1",
        is_primary: true,
      },
      {
        ticket_url: "https://goingapp.pl/adam",
        ticket_provider: "going",
        external_id: "go-1",
        is_primary: false,
      },
    ];
  }
  return event;
}

function anchors(html: string): { attrs: string; text: string }[] {
  const found: { attrs: string; text: string }[] = [];
  const re = /<a\b([^>]*)>([\s\S]*?)<\/a>/g;
  for (const match of html.matchAll(re)) {
    found.push({
      attrs: match[1] ?? "",
      text: (match[2] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    });
  }
  return found;
}

function attr(attrs: string, name: string): string | null {
  const match = attrs.match(new RegExp(`\\b${name}="([^"]*)"`));
  return match?.[1] ?? null;
}

function assertTicketHref(actual: string | null, raw: string, placement: TicketPlacement, eventId: number) {
  const href = (actual ?? "").replaceAll("&amp;", "&");
  assert.equal(href, withTicketUtm(raw, { placement, eventId }));
}

function assertContainedPoster(html: string, src: string, alt: string) {
  const images = html.match(/<img\b[^>]*>/g) ?? [];
  assert.equal(images.length, 2);
  const backdrop = images[0] ?? "";
  const poster = images[1] ?? "";
  const srcAttr = `src="${src}"`;
  assert.match(backdrop, new RegExp(srcAttr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(poster, new RegExp(srcAttr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(backdrop, /alt=""/);
  assert.match(backdrop, /aria-hidden="true"/);
  assert.match(backdrop, /object-cover/);
  assert.match(backdrop, /blur-\[24px\]/);
  assert.match(backdrop, /scale-110/);
  assert.match(backdrop, /brightness-50/);
  assert.match(backdrop, /loading="lazy"/);
  assert.match(backdrop, /fetchpriority="low"/i);
  assert.doesNotMatch(backdrop, /fetchpriority="high"/i);
  assert.doesNotMatch(backdrop, /object-contain/);
  assert.match(poster, /object-contain/);
  assert.match(poster, /object-center/);
  assert.match(poster, /width="800"/);
  assert.match(poster, /height="600"/);
  assert.match(poster, /loading="lazy"/);
  assert.match(poster, new RegExp(`alt="${alt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  assert.doesNotMatch(poster, /object-cover/);
  assert.doesNotMatch(poster, /fetchpriority/i);
  assert.doesNotMatch(poster, /aria-hidden/);
  const mediaAt = html.indexOf("aspect-[4/3]");
  const backdropAt = html.indexOf(backdrop);
  const posterAt = html.indexOf(poster);
  const badgeAt = html.indexOf("absolute right-3 top-3 z-10");
  assert.ok(mediaAt !== -1 && backdropAt > mediaAt && posterAt > backdropAt && badgeAt > posterAt);
}

function assertPosterSlot(html: string, status: string) {
  assert.match(html, /aspect-\[4\/3\]/);
  assert.match(html, /rounded-t-\[18px\]/);
  assert.match(html, /aspect-ratio:4 \/ 3/);
  const posterAt = html.indexOf("aspect-[4/3]");
  const statusAt = html.indexOf(status);
  const dateAt = html.indexOf("19:00");
  assert.ok(posterAt !== -1 && statusAt !== -1 && dateAt !== -1);
  assert.ok(posterAt < statusAt && statusAt < dateAt, "status pill sits on the poster, above the date");
  assert.match(html, /absolute right-3 top-3/);
}

function assertNoNestedAnchors(html: string) {
  const tags = html.match(/<\/?a\b[^>]*>/gi) ?? [];
  let depth = 0;
  for (const tag of tags) {
    if (tag.startsWith("</")) {
      depth -= 1;
      assert.ok(depth >= 0, tag);
    } else {
      assert.equal(depth, 0, `nested anchor before ${tag}`);
      depth += 1;
    }
  }
  assert.equal(depth, 0);
}

test("event card sends the name to the profile and tickets to a new tab", () => {
  const html = renderToStaticMarkup(React.createElement(EventCard, { event: tour(), now: NOW }));
  assertNoNestedAnchors(html);
  const links = anchors(html);

  const profile = links.filter((link) => attr(link.attrs, "href") === "/standuper/adam-van-bendler");
  assert.equal(profile.length, 2);
  for (const link of profile) {
    assert.equal(attr(link.attrs, "target"), null);
  }
  assert.ok(profile.some((link) => link.text === "Adam Van Bendler"));
  assert.equal(profile.some((link) => attr(link.attrs, "aria-label") === "Profil: Adam Van Bendler"), false);
  const watch = profile.find((link) => link.text === "Obejrzyj filmy: Adam Van Bendler");
  assert.ok(watch);
  assert.equal(attr(watch.attrs, "aria-label"), "Nagrania: Adam Van Bendler na parska.pl");
  assert.equal(attr(watch.attrs, "target"), null);
  const watchClass = attr(watch.attrs, "class") ?? "";
  assert.match(watchClass, /break-words/);
  assert.match(watchClass, /max-w-full/);
  assert.match(watchClass, /whitespace-normal/);
  assert.doesNotMatch(watchClass, /truncate|line-clamp|ellipsis|whitespace-nowrap/);
  assert.equal(attr(profile.find((link) => link.text === "Adam Van Bendler")?.attrs ?? "", "aria-label"), null);
  assert.doesNotMatch(html, /Obejrzyj próbkę|Filmy artysty|Nagrania artystów/);
  assert.match(html, /jutro/);
  assert.match(html, /19:00/);
  assertPosterSlot(html, "W sprzedaży");
  assert.equal((html.match(/<img\b/g) ?? []).length, 0);
  assert.doesNotMatch(html, /cdn\.example\/adam\.jpg/);
  assert.doesNotMatch(html, /h-12 w-12/);
  assert.doesNotMatch(html, /aria-label="Profil:/);

  const external = links.filter((link) => attr(link.attrs, "target") === "_blank");
  assert.equal(external.length, 2);
  for (const link of external) {
    assert.match(link.text, /otwiera się w nowej karcie/);
    assert.match(attr(link.attrs, "rel") ?? "", /noopener/);
  }
  const kupbilecik = external.find((link) => link.text.startsWith("Kup bilet na kupbilecik.pl"));
  const going = external.find((link) => link.text.startsWith("Going"));
  assert.ok(kupbilecik);
  assertTicketHref(attr(kupbilecik.attrs, "href"), "https://kupbilecik.pl/adam", "karta_trasy_primary", 1);
  assert.match(attr(kupbilecik.attrs, "style") ?? "", /background:var\(--coral\)/);
  assert.ok(going);
  assertTicketHref(attr(going.attrs, "href"), "https://goingapp.pl/adam", "karta_trasy_secondary", 1);
  assert.match(attr(going.attrs, "style") ?? "", /border:1px solid var\(--coral\)/);
  assert.equal(external.some((link) => link.text.startsWith("Bilety")), false);
  assert.doesNotMatch(html, /Bilety24/);
  for (const link of links) {
    assert.equal(attr(link.attrs, "href")?.includes("#"), false);
  }
});

test("joint show is one card with both comedians and the same ticket buttons", () => {
  const paczes = { name: "Rafał Pacześ", slug: "rafal-paczes", photo_url: "https://cdn.example/rafal.jpg" };
  const lotek = { name: "Łukasz Lotek Lodkowski", slug: "lotek", photo_url: null };
  const html = renderToStaticMarkup(
    React.createElement(EventCard, {
      event: tour({
        id: 1603,
        title: "Pacześ x Lotek Tour 2 - Puławy",
        city: "Puławy",
        person: paczes,
        people: [paczes, lotek],
        image_url: "https://cdn.example/joint.jpg",
        ticket_url: "https://goingapp.pl/wydarzenie/paczes-x-lotek-tour-2/pulawy-listopad-2026",
        ticket_provider: "going",
        links: [
          {
            ticket_url: "https://goingapp.pl/wydarzenie/paczes-x-lotek-tour-2/pulawy-listopad-2026",
            ticket_provider: "going",
            external_id: "2418520:1",
            is_primary: true,
          },
          {
            ticket_url: "https://www.kupbilecik.pl/pl/event/9",
            ticket_provider: "kupbilecik",
            external_id: "kb-9",
            is_primary: false,
          },
        ],
      }),
      now: NOW,
    }),
  );
  assertNoNestedAnchors(html);
  assert.equal((html.match(/<article\b/g) ?? []).length, 1);
  const links = anchors(html);
  assert.ok(links.some((link) => link.text === "Rafał Pacześ" && attr(link.attrs, "href") === "/standuper/rafal-paczes"));
  assert.ok(links.some((link) => link.text === "Łukasz Lotek Lodkowski" && attr(link.attrs, "href") === "/standuper/lotek"));
  const paczesFilms = links.find(
    (link) => link.text === "Obejrzyj filmy: Rafał Pacześ" && attr(link.attrs, "href") === "/standuper/rafal-paczes",
  );
  const lotekFilms = links.find(
    (link) =>
      link.text === "Obejrzyj filmy: Łukasz Lotek Lodkowski" && attr(link.attrs, "href") === "/standuper/lotek",
  );
  assert.ok(paczesFilms);
  assert.ok(lotekFilms);
  assert.equal(attr(paczesFilms.attrs, "aria-label"), "Nagrania: Rafał Pacześ na parska.pl");
  assert.equal(attr(lotekFilms.attrs, "aria-label"), "Nagrania: Łukasz Lotek Lodkowski na parska.pl");
  assert.equal(attr(paczesFilms.attrs, "target"), null);
  assert.equal(attr(lotekFilms.attrs, "target"), null);
  assert.equal(links.some((link) => (attr(link.attrs, "aria-label") ?? "").startsWith("Profil:")), false);
  assert.equal(links.filter((link) => attr(link.attrs, "href") === "/standuper/rafal-paczes").length, 2);
  assert.equal(links.filter((link) => attr(link.attrs, "href") === "/standuper/lotek").length, 2);
  assert.match(html, /mt-3 flex w-full min-w-0 flex-wrap items-start gap-x-4 gap-y-1/);
  assert.doesNotMatch(html, /flex-col/);
  const external = links.filter((link) => attr(link.attrs, "target") === "_blank");
  assert.deepEqual(
    external.map((link) => link.text.replace(/, otwiera się w nowej karcie/, "").trim()),
    ["Kup bilet na going.pl", "Kupbilecik"],
  );
  assert.match(attr(external[0]?.attrs ?? "", "style") ?? "", /background:var\(--coral\)/);
  assert.doesNotMatch(html, /Bilety24/);
  assert.doesNotMatch(html, /Obejrzyj próbkę|Filmy artysty|Nagrania artystów/);
  assert.doesNotMatch(html, /ŁL/);
  assert.doesNotMatch(html, /h-12 w-12/);
  assert.doesNotMatch(html, /cdn\.example\/rafal\.jpg/);
  assertPosterSlot(html, "W sprzedaży");
  assertContainedPoster(html, "https://cdn.example/joint.jpg", "Plakat: Pacześ x Lotek Tour 2 - Puławy, Puławy");
  assert.match(html, /aspect-\[4\/3\]/);
});

test("event card without a slug has no profile link", () => {
  const html = renderToStaticMarkup(
    React.createElement(EventCard, {
      event: tour({ person: { name: "Bez sluga", slug: "", photo_url: null } }),
      now: NOW,
    }),
  );
  assertNoNestedAnchors(html);
  assert.doesNotMatch(html, /\/standuper\//);
  assert.match(html, /<h3[^>]*>Bez sluga<\/h3>/);
  assert.doesNotMatch(html, /Obejrzyj próbkę|Filmy artysty|Obejrzyj filmy|Nagrania:/);
  const external = anchors(html).filter((link) => attr(link.attrs, "target") === "_blank");
  assert.equal(external.length, 2);
  assert.ok(external.some((link) => link.text.startsWith("Kup bilet na kupbilecik.pl")));
  assert.ok(external.some((link) => link.text.startsWith("Going")));
  assert.equal(external.some((link) => link.text.startsWith("Bilety")), false);
});

test("event card shows one Kupbilecik button when that is the only seller", () => {
  const html = renderToStaticMarkup(
    React.createElement(EventCard, {
      event: tour({
        links: [
          {
            ticket_url: "https://kupbilecik.pl/adam",
            ticket_provider: "kupbilecik",
            external_id: "kb-1",
            is_primary: true,
          },
        ],
      }),
      now: NOW,
    }),
  );
  const external = anchors(html).filter((link) => attr(link.attrs, "target") === "_blank");
  assert.equal(external.length, 1);
  assert.equal(external[0]?.text.startsWith("Kup bilet na kupbilecik.pl"), true);
  assert.match(attr(external[0]?.attrs ?? "", "class") ?? "", /max-w-full/);
  assert.match(attr(external[0]?.attrs ?? "", "class") ?? "", /whitespace-normal/);
  assert.match(attr(external[0]?.attrs ?? "", "class") ?? "", /break-words/);
  assertTicketHref(attr(external[0]?.attrs ?? "", "href"), "https://kupbilecik.pl/adam", "karta_trasy_primary", 1);
  assert.doesNotMatch(html, /Link do biletów niedostępny/);
  assert.doesNotMatch(html, /Bilety24/);
});

test("event card hides Bilety24 and does not repeat the primary provider", () => {
  const html = renderToStaticMarkup(
    React.createElement(EventCard, {
      event: tour({
        links: [
          {
            ticket_url: "https://kupbilecik.pl/adam",
            ticket_provider: "kupbilecik",
            external_id: "kb-1",
            is_primary: true,
          },
          {
            ticket_url: "https://kupbilecik.pl/other",
            ticket_provider: "kupbilecik",
            external_id: "kb-2",
            is_primary: false,
          },
          {
            ticket_url: "https://bilety24.pl/adam",
            ticket_provider: "bilety24",
            external_id: "b24-1",
            is_primary: false,
          },
          {
            ticket_url: "https://goingapp.pl/adam",
            ticket_provider: "going",
            external_id: "go-1",
            is_primary: false,
          },
        ],
      }),
      now: NOW,
    }),
  );
  const external = anchors(html).filter((link) => attr(link.attrs, "target") === "_blank");
  assert.deepEqual(
    external.map((link) => link.text.replace(/, otwiera się w nowej karcie/, "").trim()),
    ["Kup bilet na kupbilecik.pl", "Going"],
  );
  assertTicketHref(attr(external[0]?.attrs ?? "", "href"), "https://kupbilecik.pl/adam", "karta_trasy_primary", 1);
  assertTicketHref(attr(external[1]?.attrs ?? "", "href"), "https://goingapp.pl/adam", "karta_trasy_secondary", 1);
  assert.doesNotMatch(html, /Bilety24/);
});

test("event card without a ticket link still points at the films", () => {
  const html = renderToStaticMarkup(
    React.createElement(EventCard, {
      event: tour({
        ticket_url: "javascript:alert(1)",
        links: [
          {
            ticket_url: "javascript:alert(1)",
            ticket_provider: "kupbilecik",
            external_id: "bad",
            is_primary: true,
          },
        ],
      }),
      now: NOW,
    }),
  );
  assertNoNestedAnchors(html);
  const links = anchors(html);
  assert.equal(links.filter((link) => attr(link.attrs, "target") === "_blank").length, 0);
  const films = links.find((link) => link.text === "Obejrzyj filmy: Adam Van Bendler");
  assert.ok(films);
  assert.equal(attr(films.attrs, "href"), "/standuper/adam-van-bendler");
  assert.equal(attr(films.attrs, "aria-label"), "Nagrania: Adam Van Bendler na parska.pl");
  assert.doesNotMatch(html, /Obejrzyj próbkę|Filmy artysty/);
  assert.match(html, /Link do biletów niedostępny/);
});

test("event card puts a 4:3 poster on top and keeps the name as a link", () => {
  const html = renderToStaticMarkup(
    React.createElement(EventCard, {
      event: tour({ image_url: " https://cdn.example/wentyl.jpg " }),
      now: NOW,
    }),
  );
  assertNoNestedAnchors(html);
  assertPosterSlot(html, "W sprzedaży");
  assertContainedPoster(html, "https://cdn.example/wentyl.jpg", "Plakat: Wentyl, Kraków");
  assert.match(html, /inset-0/);
  assert.doesNotMatch(html, /cdn\.example\/adam\.jpg/);
  assert.doesNotMatch(html, /h-12 w-12/);
  assert.doesNotMatch(html, /aria-label="Profil:/);
  assert.doesNotMatch(html, /linear-gradient/);
  const links = anchors(html);
  assert.ok(links.some((link) => link.text === "Adam Van Bendler" && attr(link.attrs, "href") === "/standuper/adam-van-bendler"));
  const watch = links.find((link) => link.text === "Obejrzyj filmy: Adam Van Bendler");
  assert.ok(watch);
  assert.equal(attr(watch.attrs, "aria-label"), "Nagrania: Adam Van Bendler na parska.pl");
  assert.doesNotMatch(html, /Obejrzyj próbkę|Filmy artysty/);
});

test("event card without a poster uses the same 4:3 slot for the name and city", () => {
  const paczes = { name: "Rafał Pacześ", slug: "rafal-paczes", photo_url: "https://cdn.example/rafal.jpg" };
  const lotek = { name: "Łukasz Lotek Lodkowski", slug: "lotek", photo_url: null };
  const html = renderToStaticMarkup(
    React.createElement(EventCard, {
      event: tour({
        image_url: "   ",
        city: "Puławy",
        person: paczes,
        people: [paczes, lotek],
        status: "sold_out",
      }),
      now: NOW,
    }),
  );
  assert.equal((html.match(/<img\b/g) ?? []).length, 0);
  assert.doesNotMatch(html, /cdn\.example\/rafal\.jpg/);
  assert.doesNotMatch(html, /h-12 w-12/);
  assert.doesNotMatch(html, />RP</);
  assert.doesNotMatch(html, />ŁL</);
  assertPosterSlot(html, "Wyprzedane");
  const fallback = html.match(/<div\b[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/div>/);
  assert.ok(fallback);
  assert.match(fallback[0] ?? "", /Rafał Pacześ/);
  assert.match(fallback[0] ?? "", /Łukasz Lotek Lodkowski/);
  assert.match(fallback[0] ?? "", /Puławy/);
  assert.match(fallback[0] ?? "", /linear-gradient/);
  const links = anchors(html);
  assert.equal(links.filter((link) => attr(link.attrs, "href") === "/standuper/rafal-paczes").length, 2);
  assert.equal(links.filter((link) => attr(link.attrs, "href") === "/standuper/lotek").length, 2);
  assert.ok(links.some((link) => link.text === "Obejrzyj filmy: Rafał Pacześ"));
  assert.ok(links.some((link) => link.text === "Obejrzyj filmy: Łukasz Lotek Lodkowski"));
  assert.doesNotMatch(html, /Obejrzyj próbkę|Filmy artysty|Nagrania artystów/);
});

test("joint card skips people without a profile and stacks three film links", () => {
  const paczes = { name: "Rafał Pacześ", slug: "rafal-paczes", photo_url: null };
  const guest = { name: "Gość bez profilu", slug: "", photo_url: null };
  const lotek = { name: "Łukasz Lotek Lodkowski", slug: "lotek", photo_url: null };
  const giza = { name: "Abelard Giza", slug: "abelard-giza", photo_url: null };
  const skipped = renderToStaticMarkup(
    React.createElement(EventCard, {
      event: tour({
        person: paczes,
        people: [paczes, guest, lotek],
      }),
      now: NOW,
    }),
  );
  assertNoNestedAnchors(skipped);
  const skippedLinks = anchors(skipped);
  assert.ok(skippedLinks.some((link) => link.text === "Obejrzyj filmy: Rafał Pacześ"));
  assert.ok(skippedLinks.some((link) => link.text === "Obejrzyj filmy: Łukasz Lotek Lodkowski"));
  assert.equal(skippedLinks.some((link) => link.text.includes("Gość bez profilu") && link.text.startsWith("Obejrzyj")), false);
  assert.match(skipped, />Gość bez profilu</);
  assert.doesNotMatch(skipped, /href="\/standuper\/"/);
  assert.match(skipped, /mt-3 flex w-full min-w-0 flex-wrap items-start gap-x-4 gap-y-1/);

  const stacked = renderToStaticMarkup(
    React.createElement(EventCard, {
      event: tour({
        person: paczes,
        people: [paczes, lotek, giza],
      }),
      now: NOW,
    }),
  );
  assertNoNestedAnchors(stacked);
  const stackedLinks = anchors(stacked);
  for (const [name, slug] of [
    ["Rafał Pacześ", "rafal-paczes"],
    ["Łukasz Lotek Lodkowski", "lotek"],
    ["Abelard Giza", "abelard-giza"],
  ] as const) {
    const films = stackedLinks.find((link) => link.text === `Obejrzyj filmy: ${name}`);
    assert.ok(films, name);
    assert.equal(attr(films.attrs, "href"), `/standuper/${slug}`);
    assert.equal(attr(films.attrs, "aria-label"), `Nagrania: ${name} na parska.pl`);
    assert.match(attr(films.attrs, "class") ?? "", /break-words/);
    assert.doesNotMatch(attr(films.attrs, "class") ?? "", /truncate|line-clamp|ellipsis/);
  }
  assert.match(stacked, /mt-3 flex w-full min-w-0 flex-col items-start gap-1/);
  assert.doesNotMatch(stacked, /Obejrzyj próbkę|Filmy artysty|Nagrania artystów/);
});

test("event card ignores a poster url that is not http", () => {
  const html = renderToStaticMarkup(
    React.createElement(EventCard, {
      event: tour({ image_url: "javascript:alert(1)" }),
      now: NOW,
    }),
  );
  assert.equal((html.match(/<img\b/g) ?? []).length, 0);
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /Adam Van Bendler/);
  assert.doesNotMatch(html, /javascript:alert/);
});

test("the tour title or the date links to the event page and the ticket stays on the shop", () => {
  const titled = renderToStaticMarkup(React.createElement(EventCard, { event: tour(), now: NOW }));
  assertNoNestedAnchors(titled);
  const titledLinks = anchors(titled);
  const titleLink = titledLinks.find((link) => link.text === "Wentyl");
  assert.ok(titleLink);
  assert.equal(attr(titleLink.attrs, "href"), "/wystep/1");
  assert.equal(attr(titleLink.attrs, "target"), null);
  assert.match(titled, /line-clamp-2/);
  const poster = titledLinks.find((link) => (attr(link.attrs, "aria-label") ?? "").startsWith("Strona występu:"));
  assert.ok(poster);
  assert.equal(attr(poster.attrs, "href"), "/wystep/1");
  const tickets = titledLinks.filter((link) => attr(link.attrs, "target") === "_blank");
  assertTicketHref(attr(tickets[0]?.attrs ?? "", "href"), "https://kupbilecik.pl/adam", "karta_trasy_primary", 1);
  assert.equal(tickets.some((link) => (attr(link.attrs, "href") ?? "").includes("/wystep/")), false);
  const shopLabel = titledLinks.find((link) => link.text.startsWith("Kup bilet na kupbilecik.pl"));
  assert.ok(shopLabel);
  assertTicketHref(attr(shopLabel.attrs, "href"), "https://kupbilecik.pl/adam", "karta_trasy_primary", 1);
  assert.equal(attr(shopLabel.attrs, "target"), "_blank");
  assert.match(attr(shopLabel.attrs, "class") ?? "", /max-w-full/);
  assert.match(attr(shopLabel.attrs, "class") ?? "", /whitespace-normal/);

  const repeated = renderToStaticMarkup(
    React.createElement(EventCard, {
      event: tour({ title: "Adam Van Bendler" }),
      now: NOW,
    }),
  );
  assertNoNestedAnchors(repeated);
  assert.doesNotMatch(repeated, /line-clamp-2/);
  const dateLink = anchors(repeated).find(
    (link) => attr(link.attrs, "href") === "/wystep/1" && link.text.includes("19:00"),
  );
  assert.ok(dateLink);
  assert.equal(anchors(repeated).some((link) => link.text === "Adam Van Bendler" && attr(link.attrs, "href") === "/wystep/1"), false);
  const shop = anchors(repeated).find((link) => attr(link.attrs, "target") === "_blank");
  assertTicketHref(attr(shop?.attrs ?? "", "href"), "https://kupbilecik.pl/adam", "karta_trasy_primary", 1);
});

test("the city name links to its landing and a city without one stays text", () => {
  const warsaw = renderToStaticMarkup(
    React.createElement(EventCard, {
      event: tour({ city: "Warszawa", venue: "Stodoła" }),
      now: NOW,
    }),
  );
  assertNoNestedAnchors(warsaw);
  const warsawLinks = anchors(warsaw);
  const city = warsawLinks.filter((link) => attr(link.attrs, "href") === "/trasy/warszawa");
  assert.equal(city.length, 1);
  assert.equal(city[0]?.text, "Warszawa");
  assert.equal(warsawLinks.some((link) => link.text.includes("Stodoła")), false);
  assert.match(warsaw, /Stodoła/);
  const cityClass = attr(city[0]?.attrs ?? "", "class") ?? "";
  assert.match(cityClass, /hover:text-white/);
  assert.match(cityClass, /rounded-sm/);

  const koszalin = renderToStaticMarkup(
    React.createElement(EventCard, {
      event: tour({ city: "Koszalin", venue: "Amfiteatr" }),
      now: NOW,
    }),
  );
  assertNoNestedAnchors(koszalin);
  assert.match(koszalin, /Koszalin/);
  assert.match(koszalin, /Amfiteatr/);
  assert.equal(
    anchors(koszalin).some((link) => (attr(link.attrs, "href") ?? "").startsWith("/trasy/")),
    false,
  );
  assert.doesNotMatch(koszalin, /\/trasy\/koszalin/);
});

test("event card names an unknown portal from the ticket host", () => {
  const html = renderToStaticMarkup(
    React.createElement(EventCard, {
      event: tour({
        ticket_url: "https://www.Sklep.Example/bilet",
        ticket_provider: "other",
        links: [
          {
            ticket_url: "https://www.Sklep.Example/bilet",
            ticket_provider: "other",
            external_id: "o-1",
            is_primary: true,
          },
        ],
      }),
      now: NOW,
    }),
  );
  const external = anchors(html).filter((link) => attr(link.attrs, "target") === "_blank");
  assert.equal(external.length, 1);
  assert.equal(external[0]?.text.startsWith("Kup bilet na sklep.example"), true);
  assert.match(external[0]?.text ?? "", /otwiera się w nowej karcie/);
  assertTicketHref(attr(external[0]?.attrs ?? "", "href"), "https://www.Sklep.Example/bilet", "karta_trasy_primary", 1);
});

test("the event page shows the same uncropped poster", () => {
  const page = readFileSync(new URL("../app/wystep/[id]/page.tsx", import.meta.url), "utf8");
  const poster = readFileSync(new URL("../app/components/EventPoster.tsx", import.meta.url), "utf8");
  assert.match(page, /<EventPoster src=\{poster\} alt=\{eventPosterAlt\(event\)\} priority \/>/);
  assert.doesNotMatch(page, /object-cover/);
  const backdrop = poster.indexOf('fetchPriority="low"');
  const foreground = poster.indexOf("priority={priority}");
  assert.ok(backdrop !== -1 && foreground > backdrop);
  assert.match(poster, /object-contain/);
  assert.match(poster, /blur-\[24px\]/);
  assert.match(poster, /scale-110/);
  assert.match(poster, /brightness-50/);
  assert.match(poster, /decorative/);
  assert.equal(poster.includes("priority={priority}") && poster.includes('fetchPriority="low"'), true);
  assert.equal((poster.match(/src=\{src\}/g) ?? []).length, 2);
});
