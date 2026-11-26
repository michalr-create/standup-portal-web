import { cityLandingByName, type CityLanding } from "./city-landings.ts";
import {
  openMicHref,
  parseOpenMicSearchParams,
  type OpenMicFilters,
} from "./open-mics.ts";
import { slugify } from "./slugify.ts";

/**
 * Open-mic city pages. First wave only: cities that still had at least
 * two public cycles (active + to_verify) on 26 November 2026.
 * Szczecin, Kielce, Katowice and every one-cycle city stay off this list.
 * `inCity` is copied from the tour landings ("w Krakowie", "we Wrocławiu", "w Lublinie").
 */
export type OpenMicCity = {
  slug: string;
  name: string;
  inCity: string;
  /** Approved or catalog-backed lead. Blank lines are not used; one paragraph each. */
  intro: readonly string[];
};

const OPEN_MIC_INTRO_LEAD = [
  "Open mic to wieczór stand-upowy, na którym komicy — często początkujący, ale też doświadczeni — testują nowy materiał przed publicznością. Część wydarzeń ma wstęp wolny, na większości widzowie kupują bilet (zwykle kilkanaście albo kilkadziesiąt złotych). Żeby wystąpić, trzeba zwykle zapisać się wcześniej u organizatora.",
  "Na parska.pl zbieramy cykliczne open miki z całej Polski. Na tej stronie zobaczysz miasto, scenę, zasady zapisów i najbliższy termin, a link do biletów albo zapisów otwiera się u organizatora — parska.pl nie prowadzi własnej kasy. Listę możesz zawęzić do miasta, dnia tygodnia albo języka (są też wieczory po angielsku). Jeśli brakuje cyklu z Twojego miasta, zgłoś go przez formularz — trafi na stronę po sprawdzeniu.",
] as const;

export const OPEN_MIC_TITLE = "Open mic stand-up w Polsce — terminy i zapisy";

export const OPEN_MIC_DESCRIPTION =
  "Open miki stand-upowe w Polsce: miasto, scena, zapisy i najbliższe terminy. Część wieczorów ma wstęp wolny, część bilety. Listę zawężysz po mieście.";

export const OPEN_MIC_INTRO: readonly string[] = OPEN_MIC_INTRO_LEAD;

export const OPEN_MIC_FAQS = [
  {
    question: "Co to jest open mic?",
    answer:
      "Open mic to wieczór stand-upowy z otwartą listą występujących. Komicy — często początkujący, ale też osoby z doświadczeniem — testują nowy materiał. Publiczność ogląda kilka krótkich setów zamiast jednego pełnego programu.",
  },
  {
    question: "Czy wstęp na open mic jest darmowy?",
    answer:
      "Nie zawsze. Część wieczorów ma wstęp wolny, na większości widzowie kupują bilet — zwykle za kilkanaście albo kilkadziesiąt złotych. Cena, jeśli ją znamy, jest napisana na karcie cyklu przy „Dla widzów”.",
  },
  {
    question: "Jak zapisać się do występu?",
    answer:
      "Zasady ustala organizator: czasem formularz, czasem wiadomość albo zapis na miejscu. Instrukcja i link, jeśli je mamy, są na karcie cyklu przy zapisach. parska.pl nie prowadzi listy występujących.",
  },
  {
    question: "Jak znaleźć open mic w swoim mieście?",
    answer:
      "Na tej stronie zawęzisz listę do miasta, dnia tygodnia albo języka. Osobne strony z open mikami są też dla największych miast, m.in. Warszawy, Krakowa i Wrocławia. Jeśli znasz cykl, którego tu nie ma, zgłoś go przez formularz — pokażemy go po sprawdzeniu.",
  },
  {
    question: "Czym open mic różni się od zwykłego stand-upu?",
    answer:
      "Na typowym występie oglądasz ogłoszony program konkretnych komików. Na open micu zestaw osób często zmienia się z wieczoru na wieczór, a sety są krótsze. To nadal publiczny pokaz — tylko luźniejsza formuła i, zwykle, osobna ścieżka zapisów dla występujących.",
  },
] as const;

export type OpenMicFaq = { question: string; answer: string };

function tour(name: string): CityLanding | null {
  return cityLandingByName(name);
}

function city(name: string, fallbackInCity: string, intro: readonly string[]): OpenMicCity {
  const landing = tour(name);
  return {
    slug: landing?.slug ?? slugify(name),
    name,
    inCity: landing?.inCity ?? fallbackInCity,
    intro,
  };
}

/**
 * Intros for Wrocław, Gdańsk, Łódź, Poznań and Lublin are written from the
 * public catalog on 26 November 2026 (active + to_verify). Cycles marked
 * to_verify are not described as date-confirmed. No venue or free-admission
 * claim is added beyond audience_price_text / venue / language / whether a
 * future approved date existed that day.
 */
export const OPEN_MIC_CITIES: readonly OpenMicCity[] = [
  city("Warszawa", "w Warszawie", [
    "Open mic w Warszawie to regularne wieczory, na których komicy testują nowy materiał. W serwisie są cykle m.in. w Resorcie Komedii (Stand-up Polska), w Świetlicy Wolności (Warsaw Stand-up — piątki i wybrane soboty Big Mic), „Uwaga! Żarty!” w New Vegas Club, Oficjalny Open Mic Stand-up No Limits w Bazar Klubie i „Niedziela na wesoło”. Są też wieczory po angielsku, m.in. Comedy Tuesday i Friday Night Open Mic. Na karcie cyklu są scena, zapisy i najbliższy termin, o ile data jest już w kalendarzu. Link do biletów otwiera się u organizatora — parska.pl nie prowadzi własnej kasy. Część wieczorów ma wstęp wolny, większość wymaga biletu.",
  ]),
  city("Kraków", "w Krakowie", [
    "Open mic w Krakowie to przede wszystkim regularne wieczory Comedy Lab w Pubie 103,8 FM: środy i niedziele. Występujący i jedna osoba towarzysząca wchodzą tam zwykle za darmo, widzowie kupują bilet. W serwisie zapisane są też inne cykle (m.in. wieczór po angielsku w Chicago Jazz Bar i open mic w Arcade Bee) — ich status i daty warto sprawdzić na karcie, bo część informacji jest jeszcze do weryfikacji. Na parska.pl zobaczysz scenę, zasady zapisów i najbliższy termin. Bilety kupujesz u organizatora, nie w kasie serwisu.",
  ]),
  city("Wrocław", "we Wrocławiu", [
    "Open mic we Wrocławiu to cykle zapisane w serwisie: SUMO w Klubie Wędrówki, Social Komedia – Open Mic Pantery Stand-upu w Czeskim Filmie i Dziadowski Open Mic w Dziadach i Koktajlach. Przy tych trzech w kalendarzu jest najbliższy termin. Monday Open Mic we Mleczarni jest wieczorem po angielsku, a na karcie widnieje wstęp wolny; zatwierdzonej daty przy nim teraz nie ma. W bazie jest też drugi cykl w Czeskim Filmie, ze statusem do weryfikacji i bez terminu — nie opisujemy go jako potwierdzonego. Scena, zapisy i link do biletów są na karcie. parska.pl nie prowadzi własnej kasy.",
  ]),
  city("Gdańsk", "w Gdańsku", [
    "Open mic w Gdańsku: w kalendarzu są terminy open micu Filipa „Śruby” Goździewskiego w Pubie 107. W serwisie jest też Stand-up Open Mic w Lofcie (Stand Update Trójmiasto), bez najbliższej daty w tej chwili. Open-Mic w Cesky Port ma status do weryfikacji — szczegóły sprawdzisz na karcie, a cyklu nie opisujemy tu jako potwierdzonego. Na karcie widać scenę, zapisy i termin, jeśli data jest już zatwierdzona. Bilety kupujesz u organizatora. parska.pl nie prowadzi własnej kasy.",
  ]),
  city("Łódź", "w Łodzi", [
    "Open mic w Łodzi to trzy cykle po polsku: Komik Out w KIJ, Ja Tylko Żartowałem! w Przechowalni i Manufaktura Żartów Kraftowych, też w Przechowalni. Przy Komik Out i „Ja Tylko Żartowałem!” w kalendarzu jest najbliższy termin. Manufaktura Żartów Kraftowych jest na liście, ale bez zatwierdzonej daty. Scena, zapisy i cena dla widzów są na karcie cyklu. Link do biletów otwiera się u organizatora — parska.pl nie prowadzi własnej kasy.",
  ]),
  city("Poznań", "w Poznaniu", [
    "Open mic w Poznaniu: Kancelaria Stand-Upu w Szczęście Drink Barze i Open Stramic w 3eciej Stronie Baru mają w kalendarzu najbliższy termin. Zapisany jest też cykl „Stand-up Poznań – testy i nowe twarze” w Klubie Miasto; status ma do weryfikacji, więc nie opisujemy go jako potwierdzonego — datę i zasady zobaczysz na karcie. Wieczory w tych cyklach są po polsku. Bilety kupujesz u organizatora. parska.pl nie sprzedaje ich we własnej kasie.",
  ]),
  city("Lublin", "w Lublinie", [
    "Open mic w Lublinie to dwa cykle w Pubie Just Crafted. Stand-up Open Mic – Lubelscy Komicy jest po polsku i ma w kalendarzu najbliższe terminy. Lublin English Stand-Up Open Mic jest po angielsku i też ma datę na karcie; wpis o wstępie to dobrowolna dotacja, nie darmowe wejście. Scena i zasady zapisów są przy cyklu. Bilety albo zapisy otwierają się u organizatora — parska.pl nie prowadzi własnej kasy.",
  ]),
];

const BY_SLUG = new Map(OPEN_MIC_CITIES.map((entry) => [entry.slug, entry]));

export function openMicCityBySlug(slug: string): OpenMicCity | null {
  return BY_SLUG.get(slug) ?? null;
}

export function openMicCityByName(name: string): OpenMicCity | null {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  const exact = OPEN_MIC_CITIES.find((entry) => entry.name === trimmed);
  if (exact) return exact;
  const key = trimmed.toLocaleLowerCase("pl");
  return OPEN_MIC_CITIES.find((entry) => entry.name.toLocaleLowerCase("pl") === key) ?? null;
}

/** `/open-mic/Kraków` and any non-canonical spelling resolve to the slug. */
export function resolveOpenMicCityParam(param: string): { city: OpenMicCity; redirect: boolean } | null {
  let decoded = param;
  try {
    decoded = decodeURIComponent(param);
  } catch {
    return null;
  }
  const trimmed = decoded.trim().replace(/\s+/g, " ");
  if (!trimmed || trimmed === "dodaj") return null;
  const direct = openMicCityBySlug(trimmed);
  if (direct) return { city: direct, redirect: param !== direct.slug };
  const folded = openMicCityBySlug(slugify(trimmed));
  if (folded) return { city: folded, redirect: true };
  return null;
}

export function openMicCityTitle(city: OpenMicCity): string {
  return `Open mic ${city.name} — terminy i zapisy`;
}

/** Visible H1 without the site dot. The page adds the dot accent. */
export function openMicCityHeading(city: OpenMicCity): string {
  return `Open mic ${city.inCity}`;
}

/**
 * Counter on a city landing. `inCity` is the same phrase as the H1
 * ("w Krakowie", "we Wrocławiu"), including the preposition, so this
 * does not build a second locative table. The number is that city's
 * cycle count — the same figure previously shown before "z".
 */
export function openMicCityCountLabel(count: number, city: OpenMicCity): string {
  return `${count} ${city.inCity}`;
}

export function openMicCityDescription(city: OpenMicCity): string {
  return `Open miki stand-upowe ${city.inCity}: sceny, zapisy i najbliższe terminy. Część wieczorów ma wstęp wolny, część bilety. parska.pl nie sprzedaje biletów we własnej kasie.`;
}

/** First three national questions. The city sentence is separate visible copy, not a fourth question. */
export function openMicCityFaqs(): OpenMicFaq[] {
  return OPEN_MIC_FAQS.slice(0, 3).map((item) => ({ question: item.question, answer: item.answer }));
}

export function openMicCityFaqNote(city: OpenMicCity): string {
  return `Tu widać tylko ${city.name}.`;
}

/**
 * Clean city URL when the only filter is a landing city.
 * Day and language stay on `/open-mic` so the combobox does not drop them.
 * An explicit blank city (`?miasto=`) stays on the national list.
 */
export function publicOpenMicHref(
  filters: Partial<OpenMicFilters> = {},
  options?: { keepBlankCity?: boolean },
): string {
  const miasto = filters.miasto?.trim() ?? "";
  if (!miasto || filters.dzien || filters.jezyk) return openMicHref(filters, options);
  const landing = openMicCityByName(miasto);
  if (!landing) return openMicHref(filters, options);
  return `/open-mic/${landing.slug}`;
}

const SIDE_FILTERS = ["dzien", "jezyk"] as const;

function hasSideFilters(searchParams: URLSearchParams): boolean {
  return SIDE_FILTERS.some((key) => {
    const value = searchParams.get(key);
    return value != null && value.trim() !== "";
  });
}

function withoutKeys(path: string, searchParams: URLSearchParams, drop: readonly string[]): string {
  const extra = new URLSearchParams();
  const skip = new Set(drop);
  for (const [key, value] of searchParams.entries()) {
    if (skip.has(key)) continue;
    extra.append(key, value);
  }
  const qs = extra.toString();
  return qs ? `${path}?${qs}` : path;
}

function listingWithCity(cityName: string, searchParams: URLSearchParams): string {
  const parsed = parseOpenMicSearchParams({
    miasto: cityName,
    dzien: searchParams.get("dzien") ?? undefined,
    jezyk: searchParams.get("jezyk") ?? undefined,
  });
  const href = openMicHref({ ...parsed.filters, miasto: cityName });
  const query = href.includes("?") ? href.slice(href.indexOf("?") + 1) : "";
  const extra = new URLSearchParams(query);
  for (const [key, value] of searchParams.entries()) {
    if (key === "miasto" || key === "dzien" || key === "jezyk" || extra.has(key)) continue;
    extra.append(key, value);
  }
  const qs = extra.toString();
  return qs ? `/open-mic?${qs}` : "/open-mic";
}

/**
 * Path (plus query) for a real HTTP 308, or null when the request should render.
 * `/open-mic/dodaj` is never redirected. Unknown cities are not redirected (the page 404s).
 */
export function openMicRedirectPath(pathname: string, searchParams: URLSearchParams): string | null {
  const trimmedPath = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const trailing = trimmedPath !== pathname;

  if (trimmedPath === "/open-mic/dodaj" || trimmedPath.startsWith("/open-mic/dodaj/")) return null;

  if (trimmedPath === "/open-mic") {
    const landing = searchParams.has("miasto") ? openMicCityByName(searchParams.get("miasto") ?? "") : null;
    if (landing && !hasSideFilters(searchParams)) {
      return withoutKeys(`/open-mic/${landing.slug}`, searchParams, ["miasto", "dzien", "jezyk"]);
    }
    if (trailing) return withoutKeys("/open-mic", searchParams, []);
    return null;
  }

  const match = trimmedPath.match(/^\/open-mic\/([^/]+)$/);
  if (!match) return null;
  const resolved = resolveOpenMicCityParam(match[1] ?? "");
  if (!resolved) return null;
  if (hasSideFilters(searchParams)) return listingWithCity(resolved.city.name, searchParams);
  if (
    resolved.redirect ||
    trailing ||
    searchParams.has("miasto") ||
    searchParams.has("dzien") ||
    searchParams.has("jezyk")
  ) {
    return withoutKeys(`/open-mic/${resolved.city.slug}`, searchParams, ["miasto", "dzien", "jezyk"]);
  }
  return null;
}

/** Absolute 308 target. Null when the URL is already the one we want to render. */
export function openMicMiddlewareRedirect(requestUrl: URL): URL | null {
  const path = openMicRedirectPath(requestUrl.pathname, requestUrl.searchParams);
  if (!path) return null;
  const target = new URL(path, requestUrl.origin);
  if (target.pathname === requestUrl.pathname && target.search === requestUrl.search) return null;
  return target;
}
