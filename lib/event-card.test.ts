import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { TourEvent } from "./events.ts";

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
  const youtubePath = join(dir, "youtube.cjs");
  const linkPath = join(dir, "link.cjs");
  const cardPath = join(dir, "card.cjs");
  const reactPath = require.resolve("react");
  const jsxPath = require.resolve("react/jsx-runtime");
  writeFileSync(eventsPath, compile(readFileSync(new URL("./events.ts", import.meta.url), "utf8"), false));
  writeFileSync(youtubePath, compile(readFileSync(new URL("./youtube.ts", import.meta.url), "utf8"), false));
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
  const card = compile(readFileSync(new URL("../app/trasy/EventCard.tsx", import.meta.url), "utf8"), true)
    .replaceAll('require("@/lib/events")', `require(${JSON.stringify(eventsPath)})`)
    .replaceAll('require("@/lib/youtube")', `require(${JSON.stringify(youtubePath)})`)
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
    person: { name: "Adam Van Bendler", slug: "adam-van-bendler", photo_url: "https://cdn.example/adam.jpg" },
    ...overrides,
  };
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

test("event card sends the name and avatar to the profile and tickets to a new tab", () => {
  const html = renderToStaticMarkup(React.createElement(EventCard, { event: tour(), now: NOW }));
  assertNoNestedAnchors(html);
  const links = anchors(html);

  const profile = links.filter((link) => attr(link.attrs, "href") === "/standuper/adam-van-bendler");
  assert.equal(profile.length, 3);
  for (const link of profile) {
    assert.equal(attr(link.attrs, "target"), null);
  }
  assert.ok(profile.some((link) => link.text === "Adam Van Bendler"));
  assert.ok(profile.some((link) => attr(link.attrs, "aria-label") === "Profil: Adam Van Bendler"));
  assert.ok(profile.some((link) => link.text === "Obejrzyj przed biletem"));
  assert.match(html, /jutro/);
  assert.match(html, /19:00/);

  const external = links.filter((link) => attr(link.attrs, "target") === "_blank");
  assert.equal(external.length, 3);
  for (const link of external) {
    assert.match(link.text, /otwiera się w nowej karcie/);
    assert.match(attr(link.attrs, "rel") ?? "", /noopener/);
  }
  assert.ok(external.some((link) => link.text.startsWith("Bilety")));
  assert.ok(external.some((link) => link.text.startsWith("Kupbilecik")));
  assert.ok(external.some((link) => link.text.startsWith("Going")));
  assert.equal((html.match(/<img\b/g) ?? []).length, 1);
  assert.match(html, /src="https:\/\/cdn\.example\/adam\.jpg"/);
  for (const link of links) {
    assert.equal(attr(link.attrs, "href")?.includes("#"), false);
  }
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
  assert.doesNotMatch(html, /Obejrzyj przed biletem|Filmy artysty/);
  const external = anchors(html).filter((link) => attr(link.attrs, "target") === "_blank");
  assert.ok(external.some((link) => link.text.startsWith("Bilety")));
  assert.ok(external.some((link) => link.text.startsWith("Kupbilecik")));
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
  assert.ok(links.some((link) => link.text === "Filmy artysty" && attr(link.attrs, "href") === "/standuper/adam-van-bendler"));
  assert.match(html, /Link do biletów niedostępny/);
});
