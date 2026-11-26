import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { createRequire } from "node:module";
import { contentMetadata, SITEMAP_STATIC_PATHS, buildSitemap } from "./seo.ts";
import { isPublicContentSlug, RESERVED_CONTENT_SLUGS } from "./slugify.ts";
import {
  SPECIALS_YEAR,
  SPECIALS_YEAR_DESCRIPTION,
  SPECIALS_YEAR_H1,
  SPECIALS_YEAR_PATH,
  SPECIALS_YEAR_TITLE,
  SPECIALS_YEAR_VIEWS_HEADING,
  buildSpecialsYearView,
  specialsYearGraph,
  specialsYearLead,
  warsawCalendarYear,
} from "./special-year.ts";
import {
  STANDUPERKI_DESCRIPTION,
  STANDUPERKI_DOCUMENT_TITLE,
  STANDUPERKI_FAQS,
  STANDUPERKI_H1,
  STANDUPERKI_LEAD,
  STANDUPERKI_OPEN_NOTE,
  STANDUPERKI_PATH,
  STANDUPERKI_SLUGS,
  STANDUPERKI_TITLE,
  isStanduperka,
  standuperkiGraph,
  standuperkiInOrder,
} from "./standuperki.ts";
import {
  CLASSICS_HEADING,
  CLASSICS_RANKING_HREF,
  MOST_VIEWED_DESCRIPTION,
  MOST_VIEWED_H1,
  MOST_VIEWED_LEAD,
  MOST_VIEWED_PATH,
  MOST_VIEWED_TITLE,
  TOP_YEAR_HEADING,
  TOP_YEAR_RANKING_HREF,
  headlinerSentence,
  mostViewedGraph,
  rankClassicSpecials,
} from "./most-viewed-specials.ts";

const require = createRequire(import.meta.url);
const { renderToStaticMarkup } = require("react-dom/server") as typeof import("react-dom/server");
const React = require("react") as typeof import("react");
const ts = require("typescript") as typeof import("typescript");

function source(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

function yearRow(partial: {
  id: number;
  slug: string;
  title?: string;
  publishedAt: string | null;
  viewCount: number | null;
  externalId?: string | null;
  isPaid?: boolean;
}) {
  return {
    title: partial.title ?? `Program ${partial.id}`,
    externalId: partial.externalId ?? null,
    isPaid: partial.isPaid ?? false,
    ...partial,
  };
}

test("2026 specials use the Warsaw publication year, newest first, and keep paid rows", () => {
  assert.equal(warsawCalendarYear("2025-12-31T23:30:00.000Z"), 2026);
  assert.equal(warsawCalendarYear("2026-06-01T12:00:00.000Z"), 2026);
  assert.equal(warsawCalendarYear("2026-12-31T22:30:00.000Z"), 2026);
  assert.equal(warsawCalendarYear("2026-12-31T23:30:00.000Z"), 2027);
  assert.equal(warsawCalendarYear(null), null);

  const view = buildSpecialsYearView([
    yearRow({ id: 1, slug: "stary", publishedAt: "2025-06-01T12:00:00.000Z", viewCount: 999 }),
    yearRow({ id: 3, slug: "nowy", publishedAt: "2026-03-02T12:00:00.000Z", viewCount: 10, isPaid: true }),
    yearRow({ id: 2, slug: "srodek", publishedAt: "2026-08-01T12:00:00.000Z", viewCount: 50 }),
    yearRow({ id: 4, slug: "bez-licznika", publishedAt: "2026-01-15T12:00:00.000Z", viewCount: null, isPaid: true }),
    yearRow({ id: 5, slug: "po-polnocy", publishedAt: "2025-12-31T23:30:00.000Z", viewCount: 4 }),
  ]);

  assert.equal(view.count, 4);
  assert.deepEqual(view.items.map((item) => item.slug), ["srodek", "nowy", "bez-licznika", "po-polnocy"]);
  assert.equal(view.items.some((item) => item.isPaid), true);
  assert.deepEqual(view.mostViewed.map((item) => item.slug), ["srodek", "nowy", "po-polnocy"]);
  assert.equal(view.lead, specialsYearLead(4));
  assert.match(view.lead, /już 4 pełnych programów/);
  assert.equal(specialsYearLead(0).includes("już 0 "), true);
  assert.equal(view.lead.includes("18"), false);

  const graph = specialsYearGraph(view.items);
  const nodes = graph["@graph"] as { "@type": string; itemListElement?: { name?: string; url: string }[]; mainEntity?: unknown[] }[];
  assert.deepEqual(nodes.map((node) => node["@type"]), ["BreadcrumbList", "ItemList", "FAQPage"]);
  assert.deepEqual(nodes[0]?.itemListElement?.map((item) => item.name), ["Strona główna", "Specjale", "2026"]);
  assert.deepEqual(
    nodes[1]?.itemListElement?.map((item) => item.url),
    view.items.map((item) => `https://parska.pl/specjale/${item.slug}`),
  );
  assert.equal(nodes[2]?.mainEntity?.length, 3);
});

test("standuperki keep the approved order and are not a popularity sort", () => {
  assert.deepEqual(standuperkiInOrder([
    { slug: "gosia-rozalska", name: "Gosia" },
    { slug: "ktos-inny", name: "Inna" },
    { slug: "katarzyna-piasecka", name: "Katarzyna Piasecka" },
    { slug: "magda-kubicka", name: "Magda" },
  ]).map((person) => person.slug), ["katarzyna-piasecka", "magda-kubicka", "gosia-rozalska"]);
  assert.equal(STANDUPERKI_SLUGS.length, 18);
  assert.equal(isStanduperka("Katarzyna-Piasecka"), true);
  assert.equal(isStanduperka("rafal-paczes"), false);
  assert.equal(STANDUPERKI_LEAD, STANDUPERKI_DESCRIPTION);
  assert.match(STANDUPERKI_LEAD, /Piaseckiej, Szczęśniak i Kubickiej/);
  assert.equal(STANDUPERKI_OPEN_NOTE, "Lista jest otwarta.");
  assert.deepEqual(STANDUPERKI_FAQS.map((faq) => faq.question), [
    "Czy to wszyscy?",
    "Gdzie obejrzeć ich programy?",
  ]);
  assert.equal(STANDUPERKI_FAQS[1]?.answer, "Przy każdej osobie są linki do pełnych nagrań, o ile takie są.");
  const graph = standuperkiGraph([
    { slug: "gosia-rozalska", name: "Gosia Rozalska" },
    { slug: "katarzyna-piasecka", name: "Katarzyna Piasecka" },
  ]);
  const nodes = graph["@graph"] as {
    "@type": string;
    itemListElement?: { name: string; url: string }[];
    mainEntity?: { name: string }[];
  }[];
  assert.deepEqual(nodes.map((node) => node["@type"]), ["BreadcrumbList", "ItemList", "FAQPage"]);
  assert.deepEqual(nodes[0]?.itemListElement?.map((item) => item.name), ["Strona główna", "Standuperzy", "Standuperki"]);
  assert.deepEqual(nodes[2]?.mainEntity?.map((item) => item.name), [
    "Czy to wszyscy?",
    "Gdzie obejrzeć ich programy?",
  ]);
  assert.equal(nodes[1]?.itemListElement?.[0]?.url, "https://parska.pl/standuper/katarzyna-piasecka");
  assert.equal(nodes[1]?.itemListElement?.[1]?.url, "https://parska.pl/standuper/gosia-rozalska");
});

test("najlepsze classics are specials ordered by view_count and drop paid rows", () => {
  const ranked = rankClassicSpecials([
    { id: 2, viewCount: 10, externalId: "a", isPaid: false },
    { id: 1, viewCount: 50, externalId: "b", isPaid: false },
    { id: 3, viewCount: 80, externalId: null, isPaid: true },
    { id: 4, viewCount: null, externalId: "c", isPaid: false },
    { id: 5, viewCount: 40, externalId: "a", isPaid: false },
    { id: 6, viewCount: 30, externalId: "d", isPaid: false },
  ], 10);
  assert.deepEqual(ranked.map((row) => row.id), [1, 5, 6]);
  assert.equal(ranked.every((row) => row.isPaid === false), true);
  assert.deepEqual(ranked.map((row) => row.viewCount), [50, 40, 30]);

  const limited = rankClassicSpecials(
    [1, 2, 3].map((id) => ({ id, viewCount: id * 10, externalId: null, isPaid: false })),
    2,
  );
  assert.deepEqual(limited.map((row) => row.id), [3, 2]);

  assert.equal(
    headlinerSentence(["Rafał Pacześ", "Łukasz Lotek Lodkowski", "Mateusz Socha", "Piotr Zola Szulowski"]),
    "Na czele od lat zostają programy Rafała Paczesia, Łukasza Lotka Lodkowskiego, Mateusza Sochy i Piotra Zoli Szulowskiego. Liczby się zmieniają, więc kolejność na tej stronie też może się przesunąć.",
  );
  assert.equal(headlinerSentence(["Abelard Giza"]), null);
  assert.match(headlinerSentence(["Piotr Szulowski"]) ?? "", /Piotra Zoli Szulowskiego/);

  const graph = mostViewedGraph({
    yearItems: [{ slug: "wentyl", title: "Wentyl" }],
    classicItems: [{ slug: "piniata", title: "Piniata" }, { slug: "najlepsze", title: "Zajety" }],
  });
  const nodes = graph["@graph"] as { "@type": string; name?: string; itemListElement?: { name: string; url: string }[]; mainEntity?: { name: string }[] }[];
  assert.deepEqual(nodes.map((node) => node["@type"]), ["BreadcrumbList", "ItemList", "ItemList", "FAQPage"]);
  assert.deepEqual(nodes[0]?.itemListElement?.map((item) => item.name), ["Strona główna", "Specjale", "Najchętniej oglądane"]);
  assert.equal(nodes[1]?.name, TOP_YEAR_HEADING);
  assert.equal(nodes[1]?.itemListElement?.[0]?.url, "https://parska.pl/specjale/wentyl");
  assert.equal(nodes[2]?.name, CLASSICS_HEADING);
  assert.deepEqual(nodes[2]?.itemListElement?.map((item) => item.url), ["https://parska.pl/specjale/piniata"]);
  assert.equal(nodes[3]?.mainEntity?.length, 3);
  assert.match(MOST_VIEWED_LEAD, /liczby wyświetleń na YouTube/);
  assert.match(MOST_VIEWED_LEAD, /nie jest plebiscyt ani lista recenzji/);
  assert.doesNotMatch(MOST_VIEWED_LEAD, /na podstawie ocen|według ocen/);
});

test("the three collection routes are reserved, canonical, and in the sitemap", () => {
  for (const slug of ["2026", "najlepsze", "za-darmo"]) {
    assert.equal(RESERVED_CONTENT_SLUGS.includes(slug as (typeof RESERVED_CONTENT_SLUGS)[number]), true);
    assert.equal(isPublicContentSlug(slug), false);
  }
  assert.equal(existsSync(new URL("../app/specjale/za-darmo/page.tsx", import.meta.url)), false);
  assert.equal(existsSync(new URL("../app/specjale/najlepsze/page.tsx", import.meta.url)), true);
  assert.equal(existsSync(new URL("../app/specjale/2026/page.tsx", import.meta.url)), true);
  assert.equal(existsSync(new URL("../app/standuperki/page.tsx", import.meta.url)), true);

  const yearMeta = contentMetadata({
    title: SPECIALS_YEAR_TITLE,
    description: SPECIALS_YEAR_DESCRIPTION,
    fallbackDescription: SPECIALS_YEAR_DESCRIPTION,
    pathname: SPECIALS_YEAR_PATH,
  });
  const bestMeta = contentMetadata({
    title: MOST_VIEWED_TITLE,
    description: MOST_VIEWED_DESCRIPTION,
    fallbackDescription: MOST_VIEWED_DESCRIPTION,
    pathname: MOST_VIEWED_PATH,
  });
  const womenMeta = contentMetadata({
    title: STANDUPERKI_TITLE,
    description: STANDUPERKI_DESCRIPTION,
    fallbackDescription: STANDUPERKI_DESCRIPTION,
    pathname: STANDUPERKI_PATH,
  });
  assert.equal(yearMeta.alternates?.canonical, "https://parska.pl/specjale/2026");
  assert.equal(yearMeta.description, SPECIALS_YEAR_DESCRIPTION);
  assert.equal(bestMeta.alternates?.canonical, "https://parska.pl/specjale/najlepsze");
  assert.equal(bestMeta.description, MOST_VIEWED_DESCRIPTION);
  assert.equal(String(bestMeta.alternates?.canonical).includes("rankingi"), false);
  assert.equal(womenMeta.alternates?.canonical, "https://parska.pl/standuperki");
  assert.equal(womenMeta.description, STANDUPERKI_DESCRIPTION);
  assert.equal(
    womenMeta.title && typeof womenMeta.title === "object" && "absolute" in womenMeta.title
      ? womenMeta.title.absolute
      : "",
    STANDUPERKI_DOCUMENT_TITLE,
  );
  assert.equal(STANDUPERKI_DOCUMENT_TITLE, `${STANDUPERKI_TITLE} — parska.`);
  assert.equal((STANDUPERKI_DOCUMENT_TITLE.match(/parska\./g) ?? []).length, 1);
  assert.equal(SITEMAP_STATIC_PATHS.includes("/specjale/2026"), true);
  assert.equal(SITEMAP_STATIC_PATHS.includes("/specjale/najlepsze"), true);
  assert.equal(SITEMAP_STATIC_PATHS.includes("/standuperki"), true);
  assert.equal(SITEMAP_STATIC_PATHS.includes("/specjale/za-darmo"), false);
  const urls = buildSitemap([], []).map((entry) => entry.url);
  assert.equal(urls.includes("https://parska.pl/specjale/najlepsze"), true);
  assert.equal(urls.includes("https://parska.pl/specjale/2026"), true);
  assert.equal(urls.includes("https://parska.pl/standuperki"), true);
  assert.equal(urls.some((url) => url.includes("?")), false);
});

test("collection pages render the headings, crumbs, ranking links, and paid mark", () => {
  const yearPage = source("../app/specjale/2026/page.tsx");
  const bestPage = source("../app/specjale/najlepsze/page.tsx");
  const womenPage = source("../app/standuperki/page.tsx");
  const rankingPage = source("../app/rankingi/page.tsx");
  const specjale = source("../app/specjale/page.tsx");
  const profile = source("../app/standuper/[slug]/page.tsx");

  assert.equal(SPECIALS_YEAR_H1, "Nowe speciale 2026");
  assert.equal(SPECIALS_YEAR_VIEWS_HEADING, "Najchętniej oglądane w tym roku");
  assert.match(yearPage, /h1=\{SPECIALS_YEAR_H1\}/);
  assert.match(yearPage, /SPECIALS_YEAR_VIEWS_HEADING/);
  assert.match(yearPage, /buildSpecialsYearView/);
  assert.match(yearPage, /<ItemsBrowser/);
  assert.match(source("../app/components/ItemsBrowser.tsx"), /<PaidBadge/);
  assert.match(yearPage, /href="\/specjale\/najlepsze"/);
  assert.match(yearPage, /href="\/trasy"/);
  assert.doesNotMatch(yearPage, /za-darmo/);

  assert.equal(MOST_VIEWED_H1, "Najchętniej oglądane polskie speciale");
  assert.equal(TOP_YEAR_HEADING, "Top specjali roku");
  assert.equal(CLASSICS_HEADING, "Klasyki wszech czasów");
  assert.match(bestPage, /h1=\{MOST_VIEWED_H1\}/);
  assert.match(bestPage, /\{TOP_YEAR_HEADING\}/);
  assert.match(bestPage, /\{CLASSICS_HEADING\}/);
  assert.match(bestPage, /getRanking\(\{ ranking: "specjale"/);
  assert.doesNotMatch(bestPage, /getRanking\(\{ ranking: "klasyki"/);
  assert.match(bestPage, /rankClassicSpecials/);
  assert.equal(TOP_YEAR_RANKING_HREF, "/rankingi?ranking=specjale");
  assert.equal(CLASSICS_RANKING_HREF, "/rankingi?ranking=klasyki");
  assert.match(bestPage, /TOP_YEAR_RANKING_HREF/);
  assert.match(bestPage, /CLASSICS_RANKING_HREF/);
  assert.match(bestPage, /<RankingCards/);
  assert.match(bestPage, /href="\/specjale\/2026"/);
  assert.match(bestPage, /href="\/specjale"/);
  assert.doesNotMatch(bestPage, /na podstawie ocen|według ocen|ranking recenzji/);
  assert.match(bestPage, /MOST_VIEWED_LEAD/);

  assert.equal(STANDUPERKI_H1, "Standuperki");
  assert.match(womenPage, /h1=\{STANDUPERKI_H1\}/);
  assert.match(womenPage, /standuperkiInOrder/);
  assert.match(womenPage, /aria-label="Lista standuperki"/);
  assert.doesNotMatch(womenPage, /sortPeopleByName|gender|płeć/);
  assert.match(womenPage, /STANDUPERKI_LEAD/);
  assert.match(womenPage, /STANDUPERKI_OPEN_NOTE/);
  assert.match(womenPage, /label: "Start"/);
  assert.doesNotMatch(womenPage, /ranking najlepszych standuperki|obejrzech/);
  assert.match(yearPage, /label: "Start"/);

  assert.match(rankingPage, /href="\/specjale\/najlepsze"/);
  assert.match(rankingPage, /query\.ranking === "specjale" \|\| query\.ranking === "klasyki"/);
  assert.match(specjale, /href="\/specjale\/2026"/);
  assert.match(specjale, /href="\/specjale\/najlepsze"/);
  assert.match(specjale, /href="\/standuperki"/);
  assert.doesNotMatch(specjale, /za-darmo/);
  assert.match(profile, /isStanduperka\(person\.slug\)/);
  assert.match(profile, /href="\/standuperki"/);

  const chromeSource = source("../app/components/CollectionChrome.tsx");
  const compiled = ts.transpileModule(chromeSource, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const chrome = new Function("require", "exports", "module", `${compiled}\nreturn exports.default;`)(
    require,
    {},
    { exports: {} },
  ) as (props: {
    crumbs: { label: string; href?: string }[];
    h1: string;
    intro: unknown;
    faqs: { question: string; answer: string }[];
    children?: unknown;
  }) => React.ReactElement;

  const html = renderToStaticMarkup(React.createElement(chrome, {
    h1: MOST_VIEWED_H1,
    crumbs: [
      { href: "/", label: "Start" },
      { href: "/specjale", label: "Specjale" },
      { label: "Najchętniej oglądane" },
    ],
    intro: React.createElement("p", null, MOST_VIEWED_LEAD),
    faqs: [{ question: "Czy „najchętniej oglądane” znaczy „najlepsze”?", answer: "Nie. To tylko liczba odtworzeń na YouTube." }],
    children: React.createElement("div", null,
      React.createElement("h2", null, TOP_YEAR_HEADING),
      React.createElement("a", { href: TOP_YEAR_RANKING_HREF }, "ranking specjali"),
      React.createElement("h2", null, CLASSICS_HEADING),
      React.createElement("a", { href: CLASSICS_RANKING_HREF }, "ranking klasyków"),
      React.createElement("span", null, "Płatne"),
    ),
  }));
  assert.match(html, new RegExp(`<h1[^>]*>${MOST_VIEWED_H1}`));
  assert.match(html, /aria-label="Okruszki"/);
  assert.match(html, /href="\/"/);
  assert.match(html, />Start</);
  assert.match(html, /href="\/specjale"/);
  assert.match(html, /Najchętniej oglądane/);
  assert.match(html, new RegExp(TOP_YEAR_HEADING));
  assert.match(html, new RegExp(CLASSICS_HEADING));
  assert.match(html, /href="\/rankingi\?ranking=specjale"/);
  assert.match(html, /href="\/rankingi\?ranking=klasyki"/);
  assert.match(html, /liczby wyświetleń na YouTube/);
  assert.match(html, /Płatne/);
  assert.match(html, /FAQPage|Czy „najchętniej oglądane”/);
  assert.equal(SPECIALS_YEAR, 2026);
});
