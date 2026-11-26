import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { CITY_LANDINGS, cityLandingFooterLink } from "./city-landings.ts";

function source(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

test("footer adds specjale and the ten city landings without new desktop nav items", () => {
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
  assert.equal(links.length, 10);
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
