import { trasyHref, type TrasyFilters } from "./events.ts";
import { slugify } from "./slugify.ts";

/**
 * City landings. `description` is the approved lead (2–4 sentences).
 * It stays empty until that copy is accepted — do not invent city text here.
 * `inCity` is only the grammatical locative required by "Stand-up w …".
 */
export type CityLanding = {
  slug: string;
  name: string;
  inCity: string;
  description: string;
};

function landing(name: string, inCity: string, description = ""): CityLanding {
  return { slug: slugify(name), name, inCity, description };
}

/** Ten cities with the most upcoming dates on 25 November 2026. */
export const CITY_LANDINGS: readonly CityLanding[] = [
  landing("Warszawa", "Warszawie"),
  landing("Kraków", "Krakowie"),
  landing("Wrocław", "Wrocławiu"),
  landing("Gdańsk", "Gdańsku"),
  landing("Poznań", "Poznaniu"),
  landing("Bydgoszcz", "Bydgoszczy"),
  landing("Szczecin", "Szczecinie"),
  landing("Łódź", "Łodzi"),
  landing("Białystok", "Białymstoku"),
  landing("Gdynia", "Gdyni"),
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

export function resolveCityParam(param: string): { city: CityLanding; redirect: boolean } | null {
  const trimmed = param.trim();
  const direct = cityLandingBySlug(trimmed);
  if (direct) return { city: direct, redirect: direct.slug !== trimmed };
  const folded = cityLandingBySlug(slugify(trimmed));
  if (folded) return { city: folded, redirect: true };
  return null;
}
