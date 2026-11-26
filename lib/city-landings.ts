import { trasyHref, type TrasyFilters } from "./events.ts";
import { slugify } from "./slugify.ts";

/**
 * City landings. `description` is the approved multi-paragraph lead
 * (accepted 2026-11-25). Blank lines separate paragraphs.
 * `inCity` is the full prepositional phrase ("w Warszawie", "we Wrocławiu").
 * Copy must use it as-is and must not prepend another "w".
 */
export type CityLanding = {
  slug: string;
  name: string;
  inCity: string;
  description: string;
};

function landing(name: string, inCity: string, paragraphs: readonly string[]): CityLanding {
  return { slug: slugify(name), name, inCity, description: paragraphs.join("\n\n") };
}

/** Blank-line paragraphs of an approved city lead. */
export function cityLeadParagraphs(description: string): string[] {
  return description
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

/** Ten cities with the most upcoming dates on 25 November 2026. */
export const CITY_LANDINGS: readonly CityLanding[] = [
  landing("Warszawa", "w Warszawie", [
    "Szukasz stand-up Warszawa? Na parska.pl zbieramy aktualne występy w stolicy i linki do biletów. W kalendarzu są zarówno wieczory klubowe, jak i większe koncerty w halach — każdy z datą, miejscem i przejściem do sklepu.",
    "Wśród scen, na których regularnie pojawia się stand-up, są m.in. Resort Komedii, Stand-up Lokal, Terminal Kultury Gocław, Klub Fair Play, Klub Stodoła, Perliczka Praska, Skład Butelek i COS Torwar. To lokale z naszego kalendarza, nie pełna mapa miasta: jeśli komik gra gdzie indziej, termin pojawi się tu, gdy trafi do bazy.",
    "Osobna sprawa to open mic Warszawa. W serwisie są cykle m.in. w Resorcie Komedii (Stand-up Polska), w Świetlicy Wolności (Warsaw Stand-up — piątki i wybrane soboty Big Mic), a także „Uwaga! Żarty!” w New Vegas Club, Oficjalny Open Mic Stand-up No Limits w Bazar Klubie i „Niedziela na wesoło”. Godziny, zasady i zapisy są przy konkretnych datach na stronie open miców.",
    "parska.pl nie sprzedaje biletów we własnej kasie. Przy występie jest link do sklepu — najczęściej Kupbilecik, czasem Going albo inny bileter. Kalendarz stand-up Warszawa uzupełniamy na bieżąco, więc warto wracać po nowe terminy i sprawdzać, co jeszcze jest w sprzedaży.",
  ]),
  landing("Kraków", "w Krakowie", [
    "Stand-up Kraków to u nas lista realnych terminów: kluby, domy kultury i większe sale, plus link do biletów przy każdym występie. Nie układamy „topu lokali” — pokazujemy to, co faktycznie jest w kalendarzu.",
    "Wśród miejsc z zaplanowanymi datami są m.in. Pub 103,8 FM, Klub Buda, Nowohuckie Centrum Kultury, ICE Kraków Congress Centre, Klub Akademicki Arka, Klub Kwadrat, a także — przy większych koncertach — TAURON Arena Kraków. Część wieczorów odbywa się też w Drukarni, Forum Fun & Food, klubie Gwarek, STUDIO, Zaścianku i Spółdzielni Ogniwo.",
    "Jeśli chcesz wejść na scenę albo po prostu zobaczyć nowe twarze, zajrzyj na open mic Kraków. W bazie są regularne wieczory Comedy Lab w Pubie 103,8 FM (środy i niedziele). Inne cykle, m.in. w Chicago Jazz Bar i Arcade Bee, też są zapisane w serwisie; aktualne daty i status warto sprawdzić na stronie open miców.",
    "Bilety kupujesz u organizatora albo w sklepie podlinkowanym przy dacie. parska.pl zbiera występy w jednym miejscu, żeby dało się szybko zobaczyć, co gra w najbliższych tygodniach, i wrócić, gdy pojawi się kolejny termin.",
  ]),
  landing("Wrocław", "we Wrocławiu", [
    "Stand-up Wrocław na parska.pl to aktualny kalendarz występów: od klubowych setów po większe wieczory w Halach Stulecia. Przy każdej dacie jest miejsce, godzina i link do biletów.",
    "Najczęściej w kalendarzu pojawia się Klub Wędrówki. Są też terminy w Sali Koncertowej Radia Wrocław, w Sali Audytoryjnej Hali Stulecia i w samej Hali Stulecia, a także pojedyncze daty m.in. w Centrum Kultury Nowy Pafawag, Coffee Planet i Czeskim Filmie. Jeśli szukasz konkretnego komika, najszybciej przejść przez listę występów albo profil standupera.",
    "Open mic Wrocław jest w serwisie osobno. W bazie są m.in. SUMO w Klubie Wędrówki, Social Komedia – Open Mic Pantery Stand-upu w Czeskim Filmie i Dziadowski Open Mic w Dziadach i Koktajlach. Monday Open Mic we Mleczarni też jest zapisany jako cykl; czy jest najbliższa data, widać na stronie open miców.",
    "Biletów nie sprzedajemy sami — przy występie jest odnośnik do sklepu. Kalendarz uzupełniamy na bieżąco, więc strona stand-up Wrocław jest po to, żeby sprawdzić, co jest w sprzedaży teraz, a nie po ogólną listę klubów.",
  ]),
  landing("Gdańsk", "w Gdańsku", [
    "Szukasz stand-up Gdańsk? Tu są terminy z naszego kalendarza: kluby w Śródmieściu, salę Filharmonii i większe koncerty w ERGO ARENIE na granicy Gdańska i Sopotu. Przy każdym występie jest data, miejsce i link do biletów.",
    "Wśród scen z zaplanowanymi datami są Klub Muzyczny Parlament, Pub 107, Polska Filharmonia Bałtycka, Pub G10, a także Klub Bunkier, Miasto. Klub Muzyczny i Scena Teatralna NOT. ERGO ARENA pojawia się przy dużych trasach — to ten sam obiekt po obu stronach granicy miast.",
    "Open mic Gdańsk jest w serwisie osobną ścieżką. Regularnie wpisany jest open mic Filipa „Śruby” Goździewskiego w Pubie 107 (niedziele). W bazie są też cykle w Lofcie (Stand Update Trójmiasto) i Open-Mic w Cesky Port; aktualne daty i status zapisów warto sprawdzić przy konkretnym wieczorze.",
    "parska.pl nie prowadzi własnej kasy. Bilety kupujesz w podlinkowanym sklepie. Kalendarz stand-up Gdańsk aktualizujemy, gdy pojawiają się kolejne terminy, więc warto tu wracać przed weekendem albo przed wyjściem na open mic.",
  ]),
  landing("Poznań", "w Poznaniu", [
    "Stand-up Poznań na parska.pl to lista nadchodzących występów, nie katalog wszystkich lokali w mieście. Pokazujemy daty, które są w bazie: kluby, aule i większe sale, plus link do biletów.",
    "W kalendarzu najczęściej pojawiają się TROPS Akademickie Centrum Kultury, 3ecia Strona Baru i BaRock Club. Są też terminy m.in. w Centrum Kongresowo Dydaktycznym UM, Auli Artis w Collegium Da Vinci, Teatrze Muzycznym, kinie Rialto, Kinie Teatr Apollo, klubie Krąg, scenie „My pod sceną” i Sali Ziemi Poznań Congress Center.",
    "Jeśli chcesz zobaczyć nowe twarze albo sam wejść na scenę, zajrzyj na open mic Poznań. W serwisie są m.in. Kancelaria Stand-Upu w Szczęście Drink Barze, Open Stramic w 3eciej Stronie Baru oraz wieczory testów w Klubie Miasto. Daty, godziny i zasady zapisów są przy konkretnych open micach.",
    "Bilety kupuje się u organizatora albo w sklepie podlinkowanym przy występie. Ta strona jest po to, żeby w jednym miejscu zobaczyć, co gra w Poznaniu w najbliższym czasie, i złapać bilet, zanim termin zniknie ze sprzedaży.",
  ]),
  landing("Bydgoszcz", "w Bydgoszczy", [
    "Stand-up Bydgoszcz w naszym kalendarzu to przede wszystkim regularne wieczory w Botanic Bydgoszcz i w Teatrze Adria. Obok nich pojawiają się terminy w Miejskim Centrum Kultury, a także pojedyncze daty w Bosko Barze, Point Clubie, pubie Over the Under i — przy większych wydarzeniach — w Grupie Moderator Arena.",
    "Przy każdym występie jest data, adres z bazy i link do biletów. Nie dopisujemy klubów „na wszelki wypadek”: jeśli kogoś tu nie ma, znaczy, że ten termin jeszcze nie trafił do kalendarza albo już się odbył.",
    "W serwisie jest też open mic Bydgoszcz — cykl w pubie Over the Under (status do weryfikacji, nowy sezon od października 2026). Zanim wyjdziesz, sprawdź na stronie open miców, czy jest już zatwierdzona data i jak wyglądają zapisy.",
    "parska.pl nie sprzedaje biletów we własnej kasie. Od występu przechodzisz do sklepu organizatora. Strona stand-up Bydgoszcz jest po to, żeby szybko zobaczyć najbliższe terminy i wrócić, gdy w kalendarzu pojawi się kolejny wieczór.",
  ]),
  landing("Szczecin", "w Szczecinie", [
    "Szukasz stand-up Szczecin? Na parska.pl są aktualne występy z naszego kalendarza: sceny klubowe, Centrum Kultury i — przy większych trasach — Enea Arena. Przy dacie znajdziesz miejsce, godzinę i link do biletów, bez zbędnego przeklikiwania po kilku sklepach naraz.",
    "Najczęściej pojawia się NOWA DEKADENCJA w Szczecińskim Centrum Kultury (Scena Dekadencja, czasem Scena Drugie Piętro) oraz Cafe Hormon. W kalendarzu są też Jazzment Klub, Exp Pub, Hotel Campanile i Amfiteatr – Teatr Letni. To lokale z bazy występów, nie kompletna mapa miasta.",
    "Open mic Szczecin jest opisany osobno. W serwisie jest m.in. Stand-up Ekspedycja w Exp Pubie. Zapisany jest też środowy open mic w klubie Szafa (status do weryfikacji) — czy jest najbliższa data, widać na stronie open miców.",
    "Biletów nie sprzedajemy sami. Przy występie jest odnośnik do sklepu, najczęściej Kupbilecika. Kalendarz stand-up Szczecin uzupełniamy na bieżąco, więc warto tu zajrzeć, zanim kupisz bilet albo zanim wybierzesz się na open mic. Jeśli komik gra też w innych miastach regionu, te daty zobaczysz na jego profilu albo w pełnym kalendarzu Tras.",
  ]),
  landing("Łódź", "w Łodzi", [
    "Stand-up Łódź na parska.pl to kalendarz nadchodzących występów: kluby, teatry i większe hale. Przy każdym terminie jest miejsce z adresem (gdy mamy go w bazie) i link do biletów. Nie układamy prywatnego rankingu lokali — pokazujemy to, co faktycznie jest w sprzedaży albo właśnie zapowiedziane.",
    "Wśród scen z zaplanowanymi datami są m.in. KIJ (także wpisywany jako Klub Kij), Przechowalnia, Teatr Muzyczny, kręgielnia Król Kul, Łódzkie Centrum Wydarzeń, Teatr DOM, Teatr V6, sala koncertowa Akademii Muzycznej, Sport Arena im. Józefa Żylińskiego i — przy dużych koncertach — Atlas Arena.",
    "Open mic Łódź jest w serwisie osobno. W bazie są m.in. Komik Out w KIJ oraz Ja Tylko Żartowałem! i Manufaktura Żartów Kraftowych w Przechowalni. Daty, godziny i zasady zapisów sprawdzisz przy konkretnym cyklu.",
    "parska.pl nie prowadzi kasy biletowej. Od występu przechodzisz do sklepu organizatora. Ta strona jest po to, żeby w jednym miejscu zobaczyć, co gra w Łodzi, i wrócić po kolejne terminy, gdy pojawią się w kalendarzu. Pełne nagrane programy tych samych komików znajdziesz w Specjalach, nie w kalendarzu Tras.",
  ]),
  landing("Białystok", "w Białymstoku", [
    "Stand-up Białystok w naszym serwisie to lista realnych dat, nie przewodnik po mieście. Pokazujemy występy, które są w kalendarzu, z miejscem i linkiem do biletów. Jeśli kogoś tu nie ma, znaczy, że ten termin jeszcze nie trafił do bazy albo już się odbył.",
    "Najczęściej pojawia się klub Zmiana Klimatu oraz Aula im. Janusza Korczaka na Wydziale Nauk o Edukacji Uniwersytetu w Białymstoku. W bazie są też terminy w Podlaskiej Adamczysze, Balance Klubie, Białostockim Ośrodku Kultury i kawiarni teatralnej BTL Lalki. Jeden przyszły występ ma w polu obiektu samą nazwę miasta i czeka na uzupełnienie adresu — do tego czasu lepiej sprawdzić szczegół w sklepie z biletami.",
    "Open mic Białystok jest wpisany jako cykl w Zmianie Klimatu (scena Piętro Niżej). Czy jest już najbliższa zatwierdzona data, widać na stronie open miców; nie dopisujemy tu terminów, których nie ma w bazie.",
    "Bilety kupujesz u organizatora albo w podlinkowanym sklepie. Kalendarz stand-up Białystok aktualizujemy, gdy pojawiają się kolejne występy, więc warto tu wracać przed wyjazdem albo przed weekendem.",
  ]),
  landing("Gdynia", "w Gdyni", [
    "Stand-up Gdynia na parska.pl to kalendarz nadchodzących występów w gdyńskich klubach i salach. Przy każdej dacie jest miejsce, godzina i link do biletów.",
    "Wśród scen z zaplanowanymi terminami są Desdemona, Nowy Harem Club, Teatro Gdynia i Sala Koncertowa Portu Gdynia. To lokale z naszej bazy — jeśli ktoś gra gdzie indziej w Trójmieście, warto zajrzeć też na strony Gdańska i Sopotu, bo duży koncert bywa zapisany po sąsiedzku (np. ERGO ARENA przy granicy Gdańska i Sopotu).",
    "W serwisie jest również open mic w Gdyni: cykl Noc Open Mic – Waber i Natan w PIF PAF. Aktualną datę i zasady zapisów sprawdzisz na stronie open miców; nie podajemy tu wieczoru, którego nie ma jeszcze w kalendarzu.",
    "parska.pl nie sprzedaje biletów we własnej kasie. Od występu przechodzisz do sklepu. Strona stand-up Gdynia jest po to, żeby szybko zobaczyć, co gra w mieście, i wrócić, gdy w kalendarzu pojawi się kolejny termin. Open mic i występy w sąsiednim Gdańsku nie zastępują tej listy — tu zostają tylko gdyńskie daty plus wyraźna adnotacja, gdy duża hala leży na granicy miast.",
  ]),
];

const BY_SLUG = new Map(CITY_LANDINGS.map((city) => [city.slug, city]));

export function cityLandingBySlug(slug: string): CityLanding | null {
  return BY_SLUG.get(slug.trim().toLowerCase()) ?? null;
}

export function cityLandingByName(name: string): CityLanding | null {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  const exact = CITY_LANDINGS.find((city) => city.name === trimmed);
  if (exact) return exact;
  const key = trimmed.toLocaleLowerCase("pl");
  return CITY_LANDINGS.find((city) => city.name.toLocaleLowerCase("pl") === key) ?? null;
}

/** `/trasy/krakow` plus the non-city filters. Page 1 stays clean. */
export function cityLandingHref(
  slug: string,
  filters: Partial<TrasyFilters> & { page?: number } = {},
): string {
  const query = trasyHref({
    osoba: filters.osoba,
    miasto: "",
    od: filters.od,
    doDnia: filters.doDnia,
    bilety: filters.bilety,
    page: filters.page,
  });
  const path = `/trasy/${slug}`;
  const qs = query.startsWith("/trasy?") ? query.slice("/trasy?".length) : "";
  return qs ? `${path}?${qs}` : path;
}

/**
 * `/trasy?miasto=Kraków` (with any other filters) becomes the landing.
 * Cities without a landing stay on the query URL.
 */
export function trasyLandingRedirect(filters: TrasyFilters, page = 1): string | null {
  const landing = cityLandingByName(filters.miasto);
  if (!landing) return null;
  return cityLandingHref(landing.slug, { ...filters, page });
}

/** Filter navigation: a landing city uses its path, everything else stays on `/trasy`. */
export function publicTrasyHref(
  filters: Partial<TrasyFilters> & { page?: number } = {},
  options?: { keepBlankCity?: boolean },
): string {
  const landing = cityLandingByName(filters.miasto ?? "");
  if (!landing) return trasyHref(filters, options);
  return cityLandingHref(landing.slug, filters);
}

/** `/trasy/{slug}` when this city has a landing. Other cities stay plain text. */
export function cityLandingPath(name: string): string | null {
  const landing = cityLandingByName(name);
  return landing ? `/trasy/${landing.slug}` : null;
}

/**
 * City chip and the small landing row. Other filters stay; `page` does not.
 * The city that is already selected toggles off (`?miasto=`), so a saved city
 * is not written back. A landing city goes to `/trasy/{slug}`.
 */
export function trasyCityChipHref(filters: TrasyFilters, city: string): string {
  const pressed = filters.miasto === city;
  return publicTrasyHref(
    {
      osoba: filters.osoba,
      miasto: pressed ? "" : city,
      od: filters.od,
      doDnia: filters.doDnia,
      bilety: filters.bilety,
    },
    pressed ? { keepBlankCity: true } : undefined,
  );
}

/** Footer link for one landing. Label is `Stand-up {name}`. */
export function cityLandingFooterLink(city: CityLanding): { href: string; label: string } {
  return { href: `/trasy/${city.slug}`, label: `Stand-up ${city.name}` };
}

export function resolveCityParam(param: string): { city: CityLanding; redirect: boolean } | null {
  const trimmed = param.trim();
  const direct = cityLandingBySlug(trimmed);
  if (direct) return { city: direct, redirect: direct.slug !== trimmed };
  const folded = cityLandingBySlug(slugify(trimmed));
  if (folded) return { city: folded, redirect: true };
  return null;
}
