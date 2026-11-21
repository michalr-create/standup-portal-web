const HOME_CITY = /^[\p{L}\p{M}][\p{L}\p{M}0-9 .'\-]{0,79}$/u;

/** A city name, not an address. Null clears the saved city. */
export function normalizeHomeCity(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed || !HOME_CITY.test(trimmed)) return null;
  return trimmed;
}

export function matchHomeCity(home: string | null, cities: readonly string[]): string | null {
  const normalized = normalizeHomeCity(home);
  if (!normalized) return null;
  const key = normalized.toLocaleLowerCase("pl");
  return cities.find((city) => city.trim().toLocaleLowerCase("pl") === key) ?? null;
}

/** `?miasto=` is present and empty: the reader asked for every city. */
export function hasBlankCityParam(raw: { miasto?: string | string[] }): boolean {
  if (!Object.prototype.hasOwnProperty.call(raw, "miasto")) return false;
  const value = Array.isArray(raw.miasto) ? raw.miasto[0] : raw.miasto;
  return value == null || value.trim() === "";
}

/**
 * When the URL has no miasto key, add the saved city.
 * A present key, even empty, is the reader's choice and is left alone.
 */
export function hrefWithDefaultCity(pathname: string, search: string, city: string): string | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  if (params.has("miasto")) return null;
  const normalized = normalizeHomeCity(city);
  if (!normalized) return null;
  params.set("miasto", normalized);
  return `${pathname}?${params.toString()}`;
}
