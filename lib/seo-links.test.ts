import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { CITY_LANDINGS, cityLandingFooterLink } from "./city-landings.ts";

function source(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

test("footer adds specjale and the city landings without new desktop nav items", () => {
  const layout = source("../app/layout.tsx");
  const navStart = layout.indexOf("const navLinks = [");
  const navEnd = layout.indexOf("];", navStart);
  assert.ok(navStart !== -1 && navEnd > navStart);
  const navLinks = layout.slice(navStart, navEnd);
  assert.equal(navLinks.includes("/specjale"), false);
  assert.equal(navLinks.includes("/trasy"), false);
  assert.equal(navLinks.includes("Specjale"), false);

  const footerAt = layout.indexOf("<footer");
  const desktopNav = layout.slice(layout.indexOf("<ul"), footerAt);
  assert.equal(desktopNav.includes('href="/specjale"'), false);
  assert.equal(desktopNav.includes('href="/trasy"'), false);

  const trasyAt = layout.indexOf('href="/trasy"');
  const specjaleAt = layout.indexOf('href="/specjale"');
  assert.ok(footerAt !== -1 && trasyAt > footerAt && specjaleAt > trasyAt);
  assert.equal(layout.indexOf('href="/specjale"', specjaleAt + 1), -1);

  assert.match(layout, /aria-label="Miasta"/);
  assert.match(layout, /CITY_LANDINGS\.map/);
  assert.match(layout, /cityLandingFooterLink\(city\)/);
  assert.match(layout, /className="text-xs hover:text-white transition-colors"/);
  const links = CITY_LANDINGS.map(cityLandingFooterLink);
  assert.equal(links.length, 15);
  for (const href of [
    "/trasy/lublin",
    "/trasy/olsztyn",
    "/trasy/czestochowa",
    "/trasy/zielona-gora",
    "/trasy/katowice",
  ]) {
    assert.equal(links.some((link) => link.href === href), true, href);
  }
  assert.deepEqual(
    links.map((link) => link.href),
    CITY_LANDINGS.map((city) => `/trasy/${city.slug}`),
  );
  assert.deepEqual(
    links.map((link) => link.label),
    CITY_LANDINGS.map((city) => `Stand-up ${city.name}`),
  );
  assert.equal(links.some((link) => link.href === "/trasy/gdynia" && link.label === "Stand-up Gdynia"), true);
  assert.equal(links.some((link) => link.href === "/trasy/wroclaw" && link.label === "Stand-up Wrocław"), true);
});

test("the event page crumb and the city name link the landing, and the ticket CTA stays", () => {
  const leaf = source("../app/wystep/[id]/page.tsx");
  const crumbs = leaf.slice(leaf.indexOf('aria-label="Okruszki"'), leaf.indexOf("</nav>"));
  const start = crumbs.indexOf('href="/"');
  const trasy = crumbs.indexOf('href="/trasy"');
  const city = crumbs.indexOf("{landing.name}");
  const current = crumbs.indexOf('aria-current="page"');
  assert.ok(start !== -1 && start < trasy && trasy < city && city < current);
  assert.match(crumbs, /\{landing && \(/);
  assert.match(crumbs, /href=\{`\/trasy\/\$\{landing\.slug\}`\}/);

  assert.match(leaf, /\{event\.city\}/);
  assert.match(leaf, /rounded-sm hover:text-white/);
  assert.match(leaf, /Więcej \$\{landing\.inCity\}/);
  assert.doesNotMatch(leaf, /\/trasy\/koszalin/);
  assert.doesNotMatch(leaf, /href=\{`\/trasy\/\$\{event\.city/);
});

function crumbs(page: string): string {
  const start = page.indexOf('aria-label="Okruszki"');
  assert.ok(start !== -1);
  const end = page.indexOf("</nav>", start);
  assert.ok(end > start);
  return page.slice(start, end);
}

test("profile and format pages show the same crumb trail above the header", () => {
  const profile = source("../app/standuper/[slug]/page.tsx");
  const format = source("../app/format/[slug]/page.tsx");

  for (const page of [profile, format]) {
    const navAt = page.indexOf('aria-label="Okruszki"');
    const headerAt = page.indexOf("<header");
    assert.ok(navAt !== -1 && headerAt > navAt);
    const trail = crumbs(page);
    assert.match(trail, /className="mono mb-5 text-xs uppercase"/);
    assert.match(trail, /letterSpacing: "\.16em"/);
    assert.match(trail, /href="\/"/);
    assert.match(trail, />\s*Start\s*</);
    assert.match(trail, /aria-hidden="true">\{" \/ "\}<\/span>/);
    assert.match(trail, /aria-current="page"/);
    assert.match(trail, /color: "var\(--paper-dim\)"/);
  }

  const profileTrail = crumbs(profile);
  const standuperzy = profileTrail.indexOf('href="/standuperzy"');
  const current = profileTrail.indexOf('aria-current="page"');
  assert.ok(profileTrail.indexOf('href="/"') < standuperzy && standuperzy < current);
  assert.match(profileTrail, />\s*Standuperzy\s*</);
  assert.match(profileTrail, /\{personName\}/);
  assert.ok(profile.indexOf("<ProfilePortrait") > profile.indexOf("<header"));
  assert.match(profile, /person\.role \|\| "Standuper"/);
  assert.match(profile, /\{person\.name\}<span className="dot-accent">/);
  assert.match(profile, /name: personName/);

  const formatTrail = crumbs(format);
  const formaty = formatTrail.indexOf('href="/formaty"');
  const formatCurrent = formatTrail.indexOf('aria-current="page"');
  assert.ok(formatTrail.indexOf('href="/"') < formaty && formaty < formatCurrent);
  assert.match(formatTrail, />\s*Formaty\s*</);
  assert.match(formatTrail, /\{formatName\}/);
  assert.match(format, /formatPageGraph\(\{ name: formatName, slug: show\.slug \}\)/);
  assert.match(format, /<JsonLd/);
  assert.match(format, /\{show\.name\}<span className="dot-accent">/);
});

test("a city landing lists every upcoming comedian below the calendar", () => {
  const page = source("../app/trasy/[miasto]/page.tsx");
  const data = source("./data.ts");
  const start = data.indexOf("export async function getTrasyListing");
  assert.ok(start > 0);
  const nextExport = data.indexOf("\nexport async function ", start + 10);
  const fn = data.slice(start, nextExport === -1 ? undefined : nextExport);

  assert.match(fn, /miasto: filters\.miasto, od: "", doDnia: "", bilety: ""/);
  assert.match(fn, /cityPeopleSameScan \? scanned/);
  assert.match(fn, /const performers = cityPerformerLinks\(peopleSource\)/);
  assert.match(fn, /pageMergedEvents/);
  assert.doesNotMatch(fn, /cityPerformerLinks\(listing/);
  assert.doesNotMatch(fn, /cityPerformerLinks\(merged\)/);
  assert.doesNotMatch(fn, /cityPerformerLinks\(listing\.events/);

  const pagerAt = page.indexOf("<Pager");
  const peopleAt = page.indexOf("Standuperzy ${city.inCity}");
  const openAt = page.indexOf('title="Open miki"');
  assert.ok(pagerAt !== -1 && peopleAt > pagerAt && openAt > peopleAt);
  assert.match(page, /listing\.ok && listing\.performers\.length > 0/);
  assert.match(page, /listing\.performers\.map/);
  assert.match(page, /href=\{person\.href\}/);
  assert.match(page, /\{index > 0 \? " · " : null\}/);
  assert.match(page, /<SectionHead title=\{`Standuperzy \$\{city\.inCity\}`\} \/>/);
  assert.doesNotMatch(page.slice(peopleAt, openAt), /<EventCard|<FormatCard/);
});

test("sitemap drops formats with no episodes and the format catalog is unchanged", () => {
  const sitemap = source("../app/sitemap.ts");
  const data = source("./data.ts");
  const formaty = source("../app/formaty/page.tsx");
  assert.match(sitemap, /getSitemapShows\(\)/);
  assert.doesNotMatch(sitemap, /getAllShows\(/);
  assert.match(sitemap, /shows\.map\(\(show\) => show\.slug\)/);
  assert.doesNotMatch(sitemap, /hamburger-show/);
  assert.match(data, /export async function getSitemapShows/);
  assert.match(data, /showSlugsWithEpisodes/);
  assert.match(data, /if \(!episodeRows \|\| !sourceRows\) return shows/);
  assert.match(data, /\.select\("show_id, source_id"\)/);
  assert.match(data, /\.eq\("status", "approved"\)/);
  assert.match(data, /\.neq\("content_type", "short"\)/);
  assert.match(data, /\.is\("merged_into_id", null\)/);
  assert.match(data, /\.neq\("category_id", shortsCatId\)/);
  assert.match(data, /\.select\("id, show_id"\)/);
  assert.match(data, /export async function getAllShows/);
  assert.match(formaty, /getLatestPerShow\(1\)/);
  assert.doesNotMatch(formaty, /0 odcink/);
  assert.doesNotMatch(data, /hamburger-show-blazej-krajewski/);
});
