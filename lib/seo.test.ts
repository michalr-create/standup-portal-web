import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  HOME_DESCRIPTION,
  HOME_TITLE,
  OG_DEFAULT_IMAGE,
  ROBOTS_DISALLOW,
  SITEMAP_STATIC_PATHS,
  absoluteUrl,
  buildSitemap,
  clipDescription,
  contentMetadata,
  fixBrokenDiacritics,
  isBlockedSitemapPath,
  listingCanonical,
  noindexMetadata,
  pageFromSearch,
  robotsPolicy,
  specialDocumentTitle,
  specialFallbackDescription,
  specialLastModified,
  withSiteTitle,
} from "./seo.ts";

test("canonicals stay on the apex host", () => {
  assert.equal(absoluteUrl("/"), "https://parska.pl/");
  assert.equal(absoluteUrl("/standup"), "https://parska.pl/standup");
  assert.equal(absoluteUrl("/standup/"), "https://parska.pl/standup");
  assert.equal(listingCanonical("/specjale", 1), "https://parska.pl/specjale");
  assert.equal(listingCanonical("/specjale", 2), "https://parska.pl/specjale?page=2");
  assert.equal(listingCanonical("/format/litosci", 3), "https://parska.pl/format/litosci?page=3");
  assert.equal(pageFromSearch(undefined), 1);
  assert.equal(pageFromSearch("1"), 1);
  assert.equal(pageFromSearch("2"), 2);
  assert.equal(pageFromSearch(["4"]), 4);
  assert.equal(pageFromSearch("0"), 1);
  assert.equal(pageFromSearch("page"), 1);
  for (const url of [
    absoluteUrl("/"),
    listingCanonical("/standuper/abelard-giza", 1),
    listingCanonical("/standup", 2),
  ]) {
    assert.equal(url.includes("www."), false);
    assert.equal(url.startsWith("https://parska.pl"), true);
  }
});

test("descriptions clip to 160 and restore broken category diacritics", () => {
  assert.equal(fixBrokenDiacritics("Krotkie klipy i shorty"), "Kr\u00f3tkie klipy i shorty");
  assert.equal(
    fixBrokenDiacritics("Vlogi, relacje z wystepow, zapowiedzi i materialy zza kulis"),
    "Vlogi, relacje z wyst\u0119p\u00f3w, zapowiedzi i materia\u0142y zza kulis",
  );
  const bio = "a".repeat(180);
  assert.equal(clipDescription(bio, "fallback").length, 160);
  assert.equal(clipDescription("  ", "Nagrania."), "Nagrania.");
  assert.equal(clipDescription(null, "Nagrania."), "Nagrania.");
  assert.equal(clipDescription("Krotkie\nklipy", "fallback"), "Kr\u00f3tkie klipy");
});

test("public metadata is unique, canonical, and branded once", () => {
  const profile = contentMetadata({
    title: "Abelard Giza \u2014 stand-up, nagrania i wyst\u0119py",
    description: null,
    fallbackDescription: "Nagrania, specjale, formaty i nadchodz\u0105ce wyst\u0119py: Abelard Giza w polskim stand-upie.",
    pathname: "/standuper/abelard-giza",
    openGraphType: "profile",
  });
  assert.equal(profile.title && typeof profile.title === "object" && "absolute" in profile.title
    ? profile.title.absolute
    : "", withSiteTitle("Abelard Giza \u2014 stand-up, nagrania i wyst\u0119py"));
  assert.notEqual(profile.title, HOME_TITLE);
  assert.equal(profile.alternates?.canonical, "https://parska.pl/standuper/abelard-giza");
  assert.equal(profile.openGraph?.type, "profile");
  assert.equal(profile.openGraph?.url, "https://parska.pl/standuper/abelard-giza");
  assert.equal(profile.description?.includes("Abelard Giza"), true);

  const pageTwo = contentMetadata({
    title: "Specjale stand-up \u2014 pe\u0142ne programy",
    description: "Pe\u0142nometra\u017cowe programy stand-upowe.",
    fallbackDescription: "Pe\u0142nometra\u017cowe programy stand-upowe.",
    pathname: "/specjale",
    page: 2,
  });
  assert.equal(pageTwo.alternates?.canonical, "https://parska.pl/specjale?page=2");
  assert.equal(String(pageTwo.title && typeof pageTwo.title === "object" && "absolute" in pageTwo.title ? pageTwo.title.absolute : "").includes(HOME_TITLE), false);
});

test("utility pages are noindex and the sitemap drops them", () => {
  const search = noindexMetadata("Szukaj", "/szukaj");
  assert.deepEqual(search.robots, {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  });
  const policy = robotsPolicy();
  assert.equal(policy.sitemap, "https://parska.pl/sitemap.xml");
  assert.equal(policy.host, "https://parska.pl");
  assert.deepEqual(policy.rules[0]?.disallow, [...ROBOTS_DISALLOW]);
  for (const path of ["/admin", "/zaloguj", "/ulubione", "/szukaj", "/zglos", "/open-mic/dodaj", "/debug"]) {
    assert.equal(ROBOTS_DISALLOW.includes(path as (typeof ROBOTS_DISALLOW)[number]), true);
  }

  const people = Array.from({ length: 3 }, (_, index) => `osoba-${index}`);
  const shows = ["litosci", "wahanie", "../admin", "Open Mic", "ulubione"];
  const entries = buildSitemap([...people, "osoba-0", ""], shows);
  const urls = entries.map((entry) => entry.url);
  assert.equal(urls[0], "https://parska.pl/");
  assert.equal(urls.includes("https://parska.pl/open-mic"), true);
  assert.equal(urls.includes("https://parska.pl/standuper/osoba-0"), true);
  assert.equal(urls.filter((url) => url === "https://parska.pl/standuper/osoba-0").length, 1);
  assert.equal(urls.includes("https://parska.pl/format/litosci"), true);
  assert.equal(urls.includes("https://parska.pl/format/wahanie"), true);
  assert.equal(urls.includes("https://parska.pl/format/ulubione"), true);
  assert.equal(urls.includes("https://parska.pl/ulubione"), false);
  const withSpecials = buildSitemap(people, shows, [
    { slug: "abelard-giza-wentyl-2026", lastModified: "2026-01-02T00:00:00.000Z" },
    "abelard-giza-wentyl-2026",
    "dodaj",
    "page",
    "../admin",
  ]);
  const specialUrls = withSpecials.map((entry) => entry.url);
  assert.equal(specialUrls.includes("https://parska.pl/specjale/abelard-giza-wentyl-2026"), true);
  assert.equal(specialUrls.filter((url) => url.endsWith("/abelard-giza-wentyl-2026")).length, 1);
  assert.equal(specialUrls.includes("https://parska.pl/specjale/dodaj"), false);
  assert.equal(specialUrls.includes("https://parska.pl/specjale/page"), false);
  assert.equal(specialUrls.includes("https://parska.pl/ulubione"), false);
  const special = withSpecials.find((entry) => entry.url.endsWith("/abelard-giza-wentyl-2026"));
  assert.equal(special?.changeFrequency, "weekly");
  assert.equal(special?.priority, 0.7);
  assert.equal(special?.lastModified, "2026-01-02T00:00:00.000Z");
  assert.equal(urls.includes("https://parska.pl/open-mic/dodaj"), false);
  assert.equal(urls.some((url) => url.includes("www.") || url.includes("?")), false);
  assert.equal(isBlockedSitemapPath("/ulubione"), true);
  assert.equal(isBlockedSitemapPath("/open-mic"), false);
  assert.deepEqual(
    SITEMAP_STATIC_PATHS,
    [
      "/",
      "/standup",
      "/specjale",
      "/formaty",
      "/wywiady",
      "/shorts",
      "/kulisy",
      "/roast",
      "/standuperzy",
      "/trasy",
      "/rankingi",
      "/nostalgia",
      "/open-mic",
    ],
  );
});

test("public content pages declare their own metadata", () => {
  const pages = [
    "app/standuper/[slug]/page.tsx",
    "app/format/[slug]/page.tsx",
    "app/standuperzy/page.tsx",
    "app/formaty/page.tsx",
    "app/standup/page.tsx",
    "app/specjale/page.tsx",
    "app/wywiady/page.tsx",
    "app/kulisy/page.tsx",
    "app/roast/page.tsx",
    "app/shorts/page.tsx",
    "app/trasy/page.tsx",
    "app/trasy/[miasto]/page.tsx",
    "app/wystep/[id]/page.tsx",
    "app/nostalgia/page.tsx",
    "app/rankingi/page.tsx",
    "app/open-mic/page.tsx",
    "app/open-mic/[miasto]/page.tsx",
  ];
  for (const path of pages) {
    const source = readFileSync(new URL("../" + path, import.meta.url), "utf8");
    assert.match(source, /contentMetadata\(/);
    assert.doesNotMatch(source, /parska\. \\u2014 polski stand-up w jednym miejscu/);
  }
  for (const path of [
    "app/szukaj/page.tsx",
    "app/zaloguj/page.tsx",
    "app/zglos/page.tsx",
    "app/open-mic/dodaj/page.tsx",
    "app/ulubione/layout.tsx",
    "app/ulubione/tresci/page.tsx",
    "app/admin/layout.tsx",
  ]) {
    const source = readFileSync(new URL("../" + path, import.meta.url), "utf8");
    assert.match(source, /noindexMetadata\(/);
  }
  const missing = readFileSync(new URL("../app/not-found.tsx", import.meta.url), "utf8");
  assert.match(missing, /Nie ma takiej strony/);
  assert.match(missing, /NOINDEX_ROBOTS/);
  const dodaj = readFileSync(new URL("../app/open-mic/dodaj/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(dodaj, /openGraph:/);

  const specialPage = readFileSync(new URL("../app/specjale/[slug]/page.tsx", import.meta.url), "utf8");
  assert.match(specialPage, /contentMetadata\(/);
  assert.match(specialPage, /generateStaticParams/);
  assert.match(specialPage, /revalidate = 120/);
  assert.match(specialPage, /notFound\(\)/);
  assert.doesNotMatch(specialPage, /autoplay/);
  assert.match(specialPage, /youtube\.com\/embed\//);
  const data = readFileSync(new URL("./data.ts", import.meta.url), "utf8");
  assert.match(data, /EXCLUDED_SPECIAL_ITEM_ID/);
  assert.match(data, /\.neq\("id", EXCLUDED_SPECIAL_ITEM_ID\)/);
});

test("special titles name the performer once and paid pages are not videos", () => {
  assert.equal(
    specialDocumentTitle("Abelard Giza — Wentyl (2026)", [{ name: "Abelard Giza" }]),
    "Abelard Giza — Wentyl (2026) — specjal stand-up",
  );
  assert.equal(
    specialDocumentTitle("Wentyl (2026)", [{ name: "Abelard Giza" }, { name: "Rafał Pacześ" }]),
    "Wentyl (2026) — Abelard Giza, Rafał Pacześ — specjal stand-up",
  );
  assert.equal(
    specialDocumentTitle("Składanka", [{ name: "Ala" }, { name: "Bartek" }, { name: "Celina" }]),
    "Składanka — Ala i inni — specjal stand-up",
  );
  assert.equal(specialDocumentTitle("Składanka", []), "Składanka — specjal stand-up");
  assert.equal(
    specialFallbackDescription([{ name: "Abelard Giza" }], true),
    "Pełny program stand-up: Abelard Giza. Płatny VOD — link do zakupu na parska.",
  );
  assert.equal(
    specialFallbackDescription([], false),
    "Pełny program stand-up. Oglądaj na parska.",
  );
  assert.equal(
    specialLastModified("2025-03-21T00:00:00.000Z", "2026-01-02T00:00:00.000Z"),
    "2026-01-02T00:00:00.000Z",
  );

  const paid = contentMetadata({
    title: specialDocumentTitle("Abelard Giza — Wentyl (2026)", [{ name: "Abelard Giza" }]),
    description: null,
    fallbackDescription: specialFallbackDescription([{ name: "Abelard Giza" }], true),
    pathname: "/specjale/abelard-giza-wentyl-2026",
    openGraphType: "website",
    image: "https://abelardgiza.pl/wentyl.jpg",
  });
  assert.equal(paid.openGraph?.type, "website");
  assert.equal(paid.alternates?.canonical, "https://parska.pl/specjale/abelard-giza-wentyl-2026");
  assert.equal(paid.description?.includes("Płatny VOD"), true);
  const images = paid.openGraph?.images;
  assert.equal(Array.isArray(images) ? images.length : 0, 1);
  const imageUrl = Array.isArray(images) ? images[0] : images;
  assert.equal(typeof imageUrl === "object" && imageUrl && "url" in imageUrl ? imageUrl.url : "", "https://abelardgiza.pl/wentyl.jpg");
  assert.equal(JSON.stringify(images).includes("og-default.png"), false);

  const free = contentMetadata({
    title: "Piniata — specjal stand-up",
    description: "Opis programu.",
    fallbackDescription: "Pełny program stand-up.",
    pathname: "/specjale/piniata",
    openGraphType: "video.other",
    image: "https://i.ytimg.com/vi/abc/hqdefault.jpg",
  });
  assert.equal(free.openGraph?.type, "video.other");
});

test("homepage and imageless listings use the default Open Graph card", () => {
  assert.equal(HOME_TITLE, "parska. \u2014 polski stand-up w jednym miejscu");
  assert.equal(
    HOME_DESCRIPTION,
    "Wyst\u0119py, nagrania i open miki polskiego stand-upu w jednym miejscu.",
  );
  assert.deepEqual(OG_DEFAULT_IMAGE, {
    url: "/og-default.png",
    width: 1200,
    height: 630,
    alt: "parska. \u2014 ca\u0142y polski stand-up w jednym miejscu",
  });

  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /title:\s*HOME_TITLE/);
  assert.match(layout, /description:\s*HOME_DESCRIPTION/);
  assert.match(layout, /openGraph:\s*\{[\s\S]*?images:\s*\[OG_DEFAULT_IMAGE\]/);
  assert.match(layout, /twitter:\s*\{[\s\S]*?card:\s*"summary_large_image"[\s\S]*?images:\s*\[OG_DEFAULT_IMAGE\]/);

  const notFound = readFileSync(new URL("../app/not-found.tsx", import.meta.url), "utf8");
  assert.match(notFound, /images:\s*\[OG_DEFAULT_IMAGE\]/);

  for (const pathname of ["/specjale", "/trasy", "/open-mic", "/trasy/warszawa", "/formaty", "/rankingi", "/nostalgia"]) {
    const listing = contentMetadata({
      title: "Listing",
      description: "Opis listingu.",
      fallbackDescription: "Opis listingu.",
      pathname,
    });
    assert.deepEqual(listing.openGraph?.images, [OG_DEFAULT_IMAGE]);
    assert.deepEqual(listing.twitter?.images, [OG_DEFAULT_IMAGE]);
    assert.equal(listing.twitter?.card, "summary_large_image");
  }

  for (const image of [null, undefined, "", "   "]) {
    const blank = contentMetadata({
      title: "Formaty",
      description: null,
      fallbackDescription: "Formaty.",
      pathname: "/formaty",
      image,
    });
    assert.deepEqual(blank.openGraph?.images, [OG_DEFAULT_IMAGE]);
    assert.deepEqual(blank.twitter?.images, [OG_DEFAULT_IMAGE]);
  }

  const portrait = contentMetadata({
    title: "Abelard Giza \u2014 stand-up, nagrania i wyst\u0119py",
    description: null,
    fallbackDescription: "Nagrania.",
    pathname: "/standuper/abelard-giza",
    image: "https://i.ytimg.com/vi/abc/hqdefault.jpg",
  });
  assert.deepEqual(portrait.openGraph?.images, [{ url: "https://i.ytimg.com/vi/abc/hqdefault.jpg" }]);
  assert.deepEqual(portrait.twitter?.images, [{ url: "https://i.ytimg.com/vi/abc/hqdefault.jpg" }]);

  const poster = contentMetadata({
    title: "Wyst\u0119p",
    description: null,
    fallbackDescription: "Wyst\u0119p.",
    pathname: "/wystep/1033",
    image: "/plakaty/wentyl.jpg",
  });
  assert.deepEqual(poster.openGraph?.images, [{ url: "https://parska.pl/plakaty/wentyl.jpg" }]);
  assert.deepEqual(poster.twitter?.images, [{ url: "https://parska.pl/plakaty/wentyl.jpg" }]);
  assert.equal(JSON.stringify(poster.openGraph?.images).includes("og-default.png"), false);

  const hidden = noindexMetadata("Szukaj", "/szukaj");
  assert.equal(hidden.openGraph?.images, undefined);
  assert.equal(hidden.twitter?.images, undefined);
});

test("sitemap lists city landings and event leaves, not filter queries", () => {
  const entries = buildSitemap(["kacper-rucinski"], ["litosci"], [], [1033, 1033, 0, 1574]);
  const urls = entries.map((entry) => entry.url);
  assert.equal(urls.includes("https://parska.pl/trasy/krakow"), true);
  assert.equal(urls.includes("https://parska.pl/trasy/lodz"), true);
  assert.equal(urls.includes("https://parska.pl/trasy/gdansk"), true);
  assert.equal(urls.includes("https://parska.pl/trasy/bialystok"), true);
  assert.equal(urls.includes("https://parska.pl/trasy/lublin"), true);
  assert.equal(urls.includes("https://parska.pl/trasy/olsztyn"), true);
  assert.equal(urls.includes("https://parska.pl/trasy/czestochowa"), true);
  assert.equal(urls.includes("https://parska.pl/trasy/zielona-gora"), true);
  assert.equal(urls.includes("https://parska.pl/trasy/katowice"), true);
  assert.equal(urls.includes("https://parska.pl/wystep/1033"), true);
  assert.equal(urls.includes("https://parska.pl/wystep/1574"), true);
  assert.equal(urls.filter((url) => url === "https://parska.pl/wystep/1033").length, 1);
  assert.equal(urls.includes("https://parska.pl/wystep/0"), false);
  assert.equal(urls.some((url) => url.includes("?") || url.includes("miasto=")), false);
  const event = entries.find((entry) => entry.url.endsWith("/wystep/1033"));
  assert.equal(event?.changeFrequency, "daily");
  assert.equal(event?.priority, 0.5);
  const city = entries.find((entry) => entry.url.endsWith("/trasy/krakow"));
  assert.equal(city?.changeFrequency, "weekly");
  assert.equal(city?.priority, 0.7);

  const trasy = readFileSync(new URL("../app/trasy/page.tsx", import.meta.url), "utf8");
  const cityPage = readFileSync(new URL("../app/trasy/[miasto]/page.tsx", import.meta.url), "utf8");
  const profile = readFileSync(new URL("../app/standuper/[slug]/page.tsx", import.meta.url), "utf8");
  const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const leaf = readFileSync(new URL("../app/wystep/[id]/page.tsx", import.meta.url), "utf8");
  for (const source of [trasy, cityPage, profile]) {
    assert.equal(source.includes("eventPageGraph"), false);
    assert.equal(source.includes("eventNode"), false);
  }
  assert.match(home, /homePageGraph/);
  assert.doesNotMatch(home, /SearchAction/);
  assert.match(leaf, /eventPageGraph/);
  assert.match(leaf, /revalidate = 120/);
  assert.match(leaf, /Kup bilet/);
  assert.match(cityPage, /cityPageGraph/);
  assert.match(cityPage, /hideCityChips/);
  assert.doesNotMatch(cityPage, /description:\s*"/);
});
