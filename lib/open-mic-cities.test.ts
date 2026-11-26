import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { cityLandingByName } from "./city-landings.ts";
import {
  OPEN_MIC_CITIES,
  OPEN_MIC_DESCRIPTION,
  OPEN_MIC_FAQS,
  OPEN_MIC_INTRO,
  OPEN_MIC_TITLE,
  openMicCityByName,
  openMicCityBySlug,
  openMicCityDescription,
  openMicCityFaqs,
  openMicCityHeading,
  openMicCityTitle,
  openMicMiddlewareRedirect,
  openMicRedirectPath,
  publicOpenMicHref,
  resolveOpenMicCityParam,
} from "./open-mic-cities.ts";
import { buildSitemap, contentMetadata, withSiteTitle } from "./seo.ts";

const SLUGS = ["warszawa", "krakow", "wroclaw", "gdansk", "lodz", "poznan", "lublin"] as const;

function words(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

test("national open-mic copy is the approved text and stays inside 160 characters", () => {
  assert.equal(OPEN_MIC_DESCRIPTION.length, 148);
  assert.ok(OPEN_MIC_DESCRIPTION.length <= 160);
  const meta = contentMetadata({
    title: OPEN_MIC_TITLE,
    description: OPEN_MIC_DESCRIPTION,
    fallbackDescription: OPEN_MIC_DESCRIPTION,
    pathname: "/open-mic",
  });
  const title = meta.title && typeof meta.title === "object" && "absolute" in meta.title ? meta.title.absolute : "";
  assert.equal(title, "Open mic stand-up w Polsce — terminy i zapisy — parska.");
  assert.equal(title, withSiteTitle(OPEN_MIC_TITLE));
  assert.equal(meta.description, OPEN_MIC_DESCRIPTION);
  assert.equal(meta.alternates?.canonical, "https://parska.pl/open-mic");
  assert.equal(meta.openGraph?.title, title);
  assert.equal(meta.openGraph?.description, OPEN_MIC_DESCRIPTION);
  assert.equal(meta.openGraph?.url, "https://parska.pl/open-mic");
  assert.equal(meta.twitter?.title, title);
  assert.equal(meta.twitter?.description, OPEN_MIC_DESCRIPTION);
  assert.equal(words(OPEN_MIC_INTRO.join(" ")), 110);
  assert.ok(words(OPEN_MIC_INTRO.join(" ")) >= 80 && words(OPEN_MIC_INTRO.join(" ")) <= 150);
  assert.match(OPEN_MIC_INTRO[0] ?? "", /^Open mic to wieczór stand-upowy/);
  assert.match(OPEN_MIC_INTRO[1] ?? "", /parska\.pl nie prowadzi własnej kasy/);
  assert.equal(OPEN_MIC_FAQS.length, 5);
  assert.equal(OPEN_MIC_FAQS[0]?.question, "Co to jest open mic?");
  assert.equal(OPEN_MIC_FAQS[3]?.question, "Jak znaleźć open mic w swoim mieście?");
});

test("only the seven cities with two or more public cycles get a landing", () => {
  assert.deepEqual(
    OPEN_MIC_CITIES.map((city) => city.slug),
    [...SLUGS],
  );
  for (const slug of ["szczecin", "kielce", "katowice", "kalisz", "bydgoszcz", "gdynia", "sopot"]) {
    assert.equal(openMicCityBySlug(slug), null, slug);
    assert.equal(resolveOpenMicCityParam(slug), null, slug);
  }
  assert.equal(resolveOpenMicCityParam("dodaj"), null);
  assert.equal(resolveOpenMicCityParam("krakow")?.redirect, false);
  assert.equal(resolveOpenMicCityParam("Kraków")?.city.slug, "krakow");
  assert.equal(resolveOpenMicCityParam("Kraków")?.redirect, true);
  assert.equal(resolveOpenMicCityParam("Warszawa")?.redirect, true);
  assert.equal(resolveOpenMicCityParam("Łódź")?.city.slug, "lodz");

  for (const city of OPEN_MIC_CITIES) {
    const tour = cityLandingByName(city.name);
    if (tour) assert.equal(city.inCity, tour.inCity, city.name);
    assert.equal(openMicCityHeading(city), `Open mic ${city.inCity}`);
    assert.equal(openMicCityTitle(city), `Open mic ${city.name} — terminy i zapisy`);
    const description = openMicCityDescription(city);
    assert.equal(
      description,
      `Open miki stand-upowe ${city.inCity}: sceny, zapisy i najbliższe terminy. Część wieczorów ma wstęp wolny, część bilety. parska.pl nie sprzedaje biletów we własnej kasie.`,
    );
    const meta = contentMetadata({
      title: openMicCityTitle(city),
      description,
      fallbackDescription: description,
      pathname: `/open-mic/${city.slug}`,
      preserveDescription: true,
    });
    assert.equal(meta.description, description);
    assert.equal(meta.alternates?.canonical, `https://parska.pl/open-mic/${city.slug}`);
    assert.equal(meta.robots, undefined);
    const faqs = openMicCityFaqs();
    assert.equal(faqs.length, 3);
    assert.equal(faqs[2]?.question, "Jak zapisać się do występu?");
    assert.equal(JSON.stringify(faqs).includes("Jak znaleźć open mic"), false);
  }

  assert.equal(openMicCityBySlug("wroclaw")?.inCity, "we Wrocławiu");
  assert.equal(openMicCityBySlug("lublin")?.inCity, "w Lublinie");
  assert.equal(cityLandingByName("Lublin"), null);

  const clipped = contentMetadata({
    title: "Open mic Wrocław — terminy i zapisy",
    description: openMicCityDescription(openMicCityBySlug("wroclaw")!),
    fallbackDescription: "fallback",
    pathname: "/open-mic/wroclaw",
  });
  assert.ok((clipped.description ?? "").length <= 160);
  assert.notEqual(clipped.description, openMicCityDescription(openMicCityBySlug("wroclaw")!));
});

test("catalog intros do not treat to-verify cycles as date-confirmed", () => {
  const wroclaw = openMicCityBySlug("wroclaw")?.intro.join(" ") ?? "";
  assert.match(wroclaw, /Monday Open Mic/);
  assert.match(wroclaw, /zatwierdzonej daty przy nim teraz nie ma/);
  assert.match(wroclaw, /do weryfikacji/);
  assert.match(wroclaw, /nie opisujemy go jako potwierdzonego/);

  const gdansk = openMicCityBySlug("gdansk")?.intro.join(" ") ?? "";
  assert.match(gdansk, /Pubie 107/);
  assert.match(gdansk, /bez najbliższej daty/);
  assert.match(gdansk, /do weryfikacji/);
  assert.match(gdansk, /nie opisujemy tu jako potwierdzonego/);

  const lodz = openMicCityBySlug("lodz")?.intro.join(" ") ?? "";
  assert.match(lodz, /Przechowalni/);
  assert.match(lodz, /bez zatwierdzonej daty/);
  assert.doesNotMatch(lodz, /weryfikacji/);

  const poznan = openMicCityBySlug("poznan")?.intro.join(" ") ?? "";
  assert.match(poznan, /Kancelaria Stand-Upu/);
  assert.match(poznan, /do weryfikacji/);
  assert.match(poznan, /nie opisujemy go jako potwierdzonego/);

  const lublin = openMicCityBySlug("lublin")?.intro.join(" ") ?? "";
  assert.match(lublin, /Just Crafted/);
  assert.match(lublin, /dobrowolna dotacja/);
  assert.doesNotMatch(lublin, /wstęp wolny/);
  assert.doesNotMatch(lublin, /weryfikacji/);

  const krakow = openMicCityBySlug("krakow")?.intro.join(" ") ?? "";
  assert.match(krakow, /do weryfikacji/);
  assert.match(krakow, /Chicago Jazz Bar/);
});

test("a city-only query 308s to the slug and other filters stay on the list", () => {
  assert.equal(publicOpenMicHref({ miasto: "Kraków" }), "/open-mic/krakow");
  assert.equal(publicOpenMicHref({ miasto: "kraków" }), "/open-mic/krakow");
  assert.equal(
    publicOpenMicHref({ miasto: "Kraków", dzien: 3, jezyk: "en" }),
    "/open-mic?miasto=Krak%C3%B3w&dzien=3&jezyk=en",
  );
  assert.equal(publicOpenMicHref({ miasto: "Szczecin" }), "/open-mic?miasto=Szczecin");
  assert.equal(publicOpenMicHref({ miasto: "" }, { keepBlankCity: true }), "/open-mic?miasto=");
  assert.equal(publicOpenMicHref({}), "/open-mic");

  assert.equal(openMicRedirectPath("/open-mic", new URLSearchParams("miasto=Kraków")), "/open-mic/krakow");
  assert.equal(openMicRedirectPath("/open-mic", new URLSearchParams("miasto=Warszawa")), "/open-mic/warszawa");
  assert.equal(openMicRedirectPath("/open-mic", new URLSearchParams("miasto=Łódź")), "/open-mic/lodz");
  assert.equal(openMicRedirectPath("/open-mic", new URLSearchParams("miasto=wrocław")), "/open-mic/wroclaw");
  assert.equal(openMicRedirectPath("/open-mic", new URLSearchParams("miasto=Lublin")), "/open-mic/lublin");
  assert.equal(openMicRedirectPath("/open-mic", new URLSearchParams("miasto=Kraków&dzien=3")), null);
  assert.equal(openMicRedirectPath("/open-mic", new URLSearchParams("miasto=Kraków&jezyk=en")), null);
  assert.equal(openMicRedirectPath("/open-mic", new URLSearchParams("miasto=Szczecin")), null);
  assert.equal(openMicRedirectPath("/open-mic", new URLSearchParams("miasto=")), null);
  assert.equal(openMicRedirectPath("/open-mic", new URLSearchParams()), null);

  assert.equal(openMicRedirectPath("/open-mic/Warszawa", new URLSearchParams()), "/open-mic/warszawa");
  assert.equal(openMicRedirectPath("/open-mic/Kraków", new URLSearchParams()), "/open-mic/krakow");
  assert.equal(openMicRedirectPath("/open-mic/krakow/", new URLSearchParams()), "/open-mic/krakow");
  assert.equal(openMicRedirectPath("/open-mic/krakow", new URLSearchParams()), null);
  assert.equal(
    openMicRedirectPath("/open-mic/krakow", new URLSearchParams("dzien=3")),
    "/open-mic?miasto=Krak%C3%B3w&dzien=3",
  );
  assert.equal(openMicRedirectPath("/open-mic/szczecin", new URLSearchParams()), null);
  assert.equal(openMicRedirectPath("/open-mic/kielce", new URLSearchParams()), null);
  assert.equal(openMicRedirectPath("/open-mic/katowice", new URLSearchParams()), null);
  assert.equal(openMicRedirectPath("/open-mic/dodaj", new URLSearchParams()), null);
  assert.equal(openMicRedirectPath("/open-mic/dodaj/", new URLSearchParams()), null);

  const query = openMicMiddlewareRedirect(new URL("https://parska.pl/open-mic?miasto=Krak%C3%B3w"));
  assert.equal(query?.pathname, "/open-mic/krakow");
  assert.equal(query?.search, "");
  const cased = openMicMiddlewareRedirect(new URL("https://parska.pl/open-mic/Warszawa"));
  assert.equal(cased?.pathname, "/open-mic/warszawa");
  assert.equal(openMicMiddlewareRedirect(new URL("https://parska.pl/open-mic/krakow")), null);
  assert.equal(openMicMiddlewareRedirect(new URL("https://parska.pl/open-mic/dodaj")), null);
  assert.equal(openMicMiddlewareRedirect(new URL("https://parska.pl/open-mic?miasto=Krak%C3%B3w&dzien=3")), null);
});

test("sitemap lists the seven city URLs and still omits the form and filter queries", () => {
  const entries = buildSitemap([], []);
  const urls = entries.map((entry) => entry.url);
  for (const slug of SLUGS) {
    const url = `https://parska.pl/open-mic/${slug}`;
    assert.equal(urls.includes(url), true, slug);
    const entry = entries.find((item) => item.url === url);
    assert.equal(entry?.changeFrequency, "weekly");
    assert.equal(entry?.priority, 0.7);
  }
  assert.equal(urls.includes("https://parska.pl/open-mic"), true);
  assert.equal(urls.includes("https://parska.pl/open-mic/dodaj"), false);
  assert.equal(urls.includes("https://parska.pl/open-mic/szczecin"), false);
  assert.equal(urls.includes("https://parska.pl/open-mic/kielce"), false);
  assert.equal(urls.includes("https://parska.pl/open-mic/katowice"), false);
  assert.equal(urls.some((url) => url.includes("?") || url.includes("miasto=")), false);
  const national = entries.find((entry) => entry.url === "https://parska.pl/open-mic");
  assert.equal(national?.changeFrequency, "daily");
  assert.equal(national?.priority, 0.8);
});

test("pages keep the approved copy, crawlable city links, and the existing controls", () => {
  const page = readFileSync(new URL("../app/open-mic/page.tsx", import.meta.url), "utf8");
  const screen = readFileSync(new URL("../app/open-mic/OpenMicScreen.tsx", import.meta.url), "utf8");
  const cityPage = readFileSync(new URL("../app/open-mic/[miasto]/page.tsx", import.meta.url), "utf8");
  const filters = readFileSync(new URL("../app/open-mic/OpenMicFilters.tsx", import.meta.url), "utf8");
  const trasy = readFileSync(new URL("../app/trasy/[miasto]/page.tsx", import.meta.url), "utf8");
  const middleware = readFileSync(new URL("../middleware.ts", import.meta.url), "utf8");

  assert.match(page, /OPEN_MIC_TITLE/);
  assert.match(page, /OPEN_MIC_DESCRIPTION/);
  assert.match(page, /OPEN_MIC_INTRO/);
  assert.match(page, /OPEN_MIC_FAQS/);
  assert.match(page, /pathname: "\/open-mic"/);
  assert.match(page, /openMicPageGraph/);
  assert.match(screen, /Open mic stand-up w Polsce|\{h1\}/);
  assert.match(screen, /Dodaj swój open mic/);
  assert.match(screen, /Zgłoś brakujący open mic/);
  assert.match(screen, /\$\{view\.catalogCount\} \$\{cyklLabel\(view\.catalogCount\)\}/);
  assert.match(screen, /href=\{`\/open-mic\/\$\{city\.slug\}`\}/);
  assert.match(screen, /Open miki w miastach:/);
  assert.match(screen, /<OpenMicCard/);
  assert.match(screen, /<OpenMicFilters/);
  assert.match(screen, /<OpenMicDates/);
  assert.match(screen, /aria-label="Pytania"/);

  assert.match(cityPage, /contentMetadata\(/);
  assert.match(cityPage, /preserveDescription: true/);
  assert.match(cityPage, /openMicCityFaqs/);
  assert.match(cityPage, /openMicCityFaqNote/);
  assert.match(cityPage, /name: "Open mic"/);
  assert.doesNotMatch(cityPage, /noindex/);

  assert.match(filters, /<CityCombobox/);
  assert.match(filters, /publicOpenMicHref/);
  assert.equal(filters.match(/<select/g)?.length, 2);
  assert.match(filters, /href="\/open-mic\?miasto="/);
  assert.match(filters, /Wyczyść filtry/);

  assert.match(trasy, /openMicCityByName\(city\.name\)/);
  assert.match(trasy, /\/open-mic\/\$\{openMicLanding\.slug\}/);
  assert.match(trasy, /openMicHref\(\{ miasto: city\.name \}\)/);
  assert.match(trasy, /linkHref=\{openMicHrefForCity\}/);
  assert.match(trasy, /href=\{openMicHrefForCity\}/);

  const body = middleware.slice(middleware.indexOf("export async function middleware"));
  assert.ok(body.indexOf("openMicMiddlewareRedirect") < body.indexOf("shouldRefreshSession"));
  assert.match(middleware, /NextResponse\.redirect\(openMicTarget, 308\)/);
  assert.match(middleware, /"\/open-mic"/);
  assert.match(middleware, /"\/open-mic\/:path\*"/);

  assert.equal(openMicCityByName("Kraków")?.slug, "krakow");
  assert.equal(openMicCityFaqs().length, 3);
});
