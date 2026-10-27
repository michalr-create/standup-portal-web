export const LISTED_EVENT_STATUSES = ["on_sale", "sold_out"] as const;
export type ListedEventStatus = (typeof LISTED_EVENT_STATUSES)[number];

export const TICKET_PROVIDERS = [
  "kupbilecik",
  "going",
  "ebilet",
  "ticketmaster",
  "bilety24",
  "eventim",
  "biletomat",
  "other",
] as const;
export type TicketProvider = (typeof TICKET_PROVIDERS)[number];

export const PROVIDER_LABELS: Record<TicketProvider, string> = {
  kupbilecik: "Kupbilecik",
  going: "Going",
  ebilet: "eBilet",
  ticketmaster: "Ticketmaster",
  bilety24: "Bilety24",
  eventim: "Eventim",
  biletomat: "Biletomat",
  other: "Inny portal",
};

export const BILETY_OPTIONS = [
  { value: "", label: "Wszystkie" },
  { value: "dostepne", label: "W sprzedaży" },
  { value: "wyprzedane", label: "Wyprzedane" },
] as const;

export type BiletyFilter = "" | "dostepne" | "wyprzedane";

export type TrasyFilters = {
  osoba: string;
  miasto: string;
  od: string;
  doDnia: string;
  bilety: BiletyFilter;
  portal: TicketProvider | "";
};

export type TrasySearch = {
  osoba?: string | string[];
  miasto?: string | string[];
  od?: string | string[];
  do?: string | string[];
  bilety?: string | string[];
  portal?: string | string[];
  page?: string | string[];
};

export type EventFacetSource = {
  city: string;
  links: { ticket_provider: TicketProvider }[];
  person: { slug: string; name: string };
};

export type TourPerson = {
  name: string;
  slug: string;
  photo_url: string | null;
};

export type TicketLink = {
  ticket_url: string;
  ticket_provider: TicketProvider;
  external_id: string;
  is_primary: boolean;
};

export type TourEvent = {
  id: number;
  person_id: number;
  title: string | null;
  starts_at: string;
  city: string;
  venue: string;
  venue_address: string | null;
  price_from: number | null;
  currency: string;
  status: ListedEventStatus;
  ticket_url: string;
  ticket_provider: TicketProvider;
  links: TicketLink[];
  person: TourPerson;
};

type PeopleEmbed = {
  name: string | null;
  slug: string | null;
  photo_url: string | null;
};

export type EventRow = {
  id: number;
  person_id: number;
  title: string | null;
  starts_at: string;
  city: string;
  venue: string;
  venue_address: string | null;
  price_from: number | string | null;
  currency: string | null;
  status: string;
  ticket_url: string;
  ticket_provider: string;
  external_id?: string | null;
  event_ticket_links?: LinkEmbed | LinkEmbed[] | null;
  people: PeopleEmbed | PeopleEmbed[] | null;
};

type LinkEmbed = {
  ticket_url: string | null;
  ticket_provider: string | null;
  external_id: string | null;
  is_primary: boolean | null;
};

export type EventFacets = {
  people: { slug: string; name: string }[];
  cities: string[];
  portals: TicketProvider[];
};

export type MonthGroup = {
  key: string;
  label: string;
  events: TourEvent[];
};

const WARSAW = "Europe/Warsaw";
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CITY = /^[\p{L}\p{M}][\p{L}\p{M}0-9 .'\-]{0,79}$/u;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function many<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function canonicalizeSlug(raw: string | undefined): { value: string; changed: boolean } {
  if (raw == null || raw === "") return { value: "", changed: false };
  const trimmed = raw.trim().toLowerCase();
  if (!SLUG.test(trimmed)) return { value: "", changed: true };
  return { value: trimmed, changed: trimmed !== raw };
}

function canonicalizeCity(raw: string | undefined): { value: string; changed: boolean } {
  if (raw == null || raw === "") return { value: "", changed: false };
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!CITY.test(trimmed)) return { value: "", changed: true };
  return { value: trimmed, changed: trimmed !== raw };
}

export function isIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const utc = new Date(Date.UTC(year, month - 1, day));
  return utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day;
}

function canonicalizeDate(raw: string | undefined): { value: string; changed: boolean } {
  if (raw == null || raw === "") return { value: "", changed: false };
  const trimmed = raw.trim();
  if (!isIsoDate(trimmed)) return { value: "", changed: true };
  return { value: trimmed, changed: trimmed !== raw };
}

function canonicalizeBilety(raw: string | undefined): { value: BiletyFilter; changed: boolean } {
  if (raw == null || raw === "") return { value: "", changed: false };
  const trimmed = raw.trim();
  if (trimmed === "dostepne" || trimmed === "wyprzedane") {
    return { value: trimmed, changed: trimmed !== raw };
  }
  return { value: "", changed: true };
}

export function trasyHref(filters: Partial<TrasyFilters> & { page?: number } = {}): string {
  const params = new URLSearchParams();
  const osoba = filters.osoba?.trim() ?? "";
  const miasto = filters.miasto?.trim() ?? "";
  const od = filters.od?.trim() ?? "";
  const doDnia = filters.doDnia?.trim() ?? "";
  const bilety = filters.bilety ?? "";
  const portal = filters.portal ?? "";
  const page = filters.page ?? 1;
  if (osoba) params.set("osoba", osoba);
  if (miasto) params.set("miasto", miasto);
  if (od) params.set("od", od);
  if (doDnia) params.set("do", doDnia);
  if (bilety) params.set("bilety", bilety);
  if (portal) params.set("portal", portal);
  if (Number.isFinite(page) && page > 1) params.set("page", String(Math.floor(page)));
  const qs = params.toString();
  return qs ? `/trasy?${qs}` : "/trasy";
}

function parsePositivePage(raw: string | undefined): number | null {
  if (raw == null || raw === "") return 1;
  if (!/^[1-9]\d{0,4}$/.test(raw)) return null;
  return Number(raw);
}

export function parseTrasySearchParams(raw: TrasySearch): {
  filters: TrasyFilters;
  page: number;
  redirectHref: string | null;
} {
  const osoba = canonicalizeSlug(first(raw.osoba));
  const miasto = canonicalizeCity(first(raw.miasto));
  const od = canonicalizeDate(first(raw.od));
  const doDnia = canonicalizeDate(first(raw.do));
  const bilety = canonicalizeBilety(first(raw.bilety));
  const portal = canonicalizePortal(first(raw.portal));

  let doValue = doDnia.value;
  let doChanged = doDnia.changed;
  if (od.value && doValue && od.value > doValue) {
    doValue = "";
    doChanged = true;
  }

  const filters: TrasyFilters = {
    osoba: osoba.value,
    miasto: miasto.value,
    od: od.value,
    doDnia: doValue,
    bilety: bilety.value,
    portal: portal.value,
  };

  const pageRaw = first(raw.page);
  const parsedPage = parsePositivePage(pageRaw);
  const pageNeedsRedirect = parsedPage == null || (pageRaw != null && pageRaw !== "" && parsedPage === 1);
  const page = parsedPage != null && parsedPage > 1 ? parsedPage : 1;

  const changed =
    osoba.changed || miasto.changed || od.changed || doChanged || bilety.changed || portal.changed || pageNeedsRedirect;
  return {
    filters,
    page,
    redirectHref: changed ? trasyHref({ ...filters, page }) : null,
  };
}

export function hasActiveTrasyFilters(filters: TrasyFilters): boolean {
  return Boolean(filters.osoba || filters.miasto || filters.od || filters.doDnia || filters.bilety || filters.portal);
}

function warsawWallClockAsUtc(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: WARSAW,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  let hour = read("hour");
  if (hour === 24) hour = 0;
  return Date.UTC(read("year"), read("month") - 1, read("day"), hour, read("minute"), read("second"));
}

export function warsawLocalToUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute, second);
  const offset = warsawWallClockAsUtc(new Date(guess)) - guess;
  let utc = guess - offset;
  const offset2 = warsawWallClockAsUtc(new Date(utc)) - utc;
  if (offset2 !== offset) utc = guess - offset2;
  return new Date(utc);
}

export function warsawDayBounds(isoDate: string): { start: Date; end: Date } | null {
  if (!isIsoDate(isoDate)) return null;
  const [year, month, day] = isoDate.split("-").map(Number);
  const start = warsawLocalToUtc(year, month, day, 0, 0, 0);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const end = warsawLocalToUtc(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), 0, 0, 0);
  return { start, end };
}

export function warsawToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: WARSAW,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${read("year")}-${read("month")}-${read("day")}`;
}

function parsePrice(value: number | string | null): number | null {
  if (value == null || value === "") return null;
  const price = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(price)) return null;
  return price;
}

function listedStatus(status: string): ListedEventStatus | null {
  if (status === "on_sale" || status === "sold_out") return status;
  return null;
}

function canonicalizePortal(raw: string | undefined): { value: TicketProvider | ""; changed: boolean } {
  if (raw == null || raw === "") return { value: "", changed: false };
  const trimmed = raw.trim().toLowerCase();
  if ((TICKET_PROVIDERS as readonly string[]).includes(trimmed)) {
    return { value: trimmed as TicketProvider, changed: trimmed !== raw };
  }
  return { value: "", changed: true };
}

function ticketProvider(provider: string | null | undefined): TicketProvider | null {
  const trimmed = provider?.trim().toLowerCase() ?? "";
  if ((TICKET_PROVIDERS as readonly string[]).includes(trimmed)) return trimmed as TicketProvider;
  return null;
}

function ticketLinksFromRow(row: EventRow): TicketLink[] {
  const primaryProvider = ticketProvider(row.ticket_provider);
  const primaryUrl = row.ticket_url?.trim() ?? "";
  const primaryId = row.external_id?.trim() ?? "";
  const links: TicketLink[] = [];
  if (primaryProvider && primaryUrl) {
    links.push({
      ticket_url: primaryUrl,
      ticket_provider: primaryProvider,
      external_id: primaryId,
      is_primary: true,
    });
  }

  const extraRows = many(row.event_ticket_links);
  const seen = new Set(links.map((link) => `${link.ticket_provider}:${link.external_id}`));
  const seenUrls = new Set(links.map((link) => link.ticket_url));
  const normalized = extraRows
    .map((link) => {
      const provider = ticketProvider(link.ticket_provider);
      const url = link.ticket_url?.trim() ?? "";
      const externalId = link.external_id?.trim() ?? "";
      if (!provider || !url || !externalId) return null;
      return {
        ticket_url: url,
        ticket_provider: provider,
        external_id: externalId,
        is_primary: link.is_primary === true,
      };
    })
    .filter((link): link is TicketLink => link !== null)
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.ticket_provider.localeCompare(b.ticket_provider));

  for (const link of normalized) {
    const key = `${link.ticket_provider}:${link.external_id}`;
    if (seen.has(key) || seenUrls.has(link.ticket_url)) continue;
    seen.add(key);
    seenUrls.add(link.ticket_url);
    links.push(link);
  }
  return links;
}

export function toTourEvent(row: EventRow): TourEvent | null {
  const status = listedStatus(row.status);
  const person = one(row.people);
  const starts = new Date(row.starts_at);
  if (!status || !person || Number.isNaN(starts.getTime())) return null;
  const links = ticketLinksFromRow(row);
  const primary = links.find((link) => link.is_primary) ?? links[0];
  if (!primary) return null;
  const name = person.name?.trim() || "Standuper";
  const slug = person.slug?.trim() || "";
  const title = row.title?.trim() || null;
  return {
    id: row.id,
    person_id: row.person_id,
    title,
    starts_at: starts.toISOString(),
    city: row.city,
    venue: row.venue,
    venue_address: row.venue_address?.trim() || null,
    price_from: parsePrice(row.price_from),
    currency: row.currency?.trim() || "PLN",
    status,
    ticket_url: primary.ticket_url,
    ticket_provider: primary.ticket_provider,
    links,
    person: {
      name,
      slug,
      photo_url: person.photo_url?.trim() || null,
    },
  };
}

export function statusToBilety(status: ListedEventStatus): BiletyFilter {
  return status === "on_sale" ? "dostepne" : "wyprzedane";
}

export function upcomingBounds(filters: TrasyFilters, now: Date): {
  start: Date;
  end: Date | null;
  statuses: ListedEventStatus[];
} {
  const from = filters.od ? warsawDayBounds(filters.od) : null;
  const to = filters.doDnia ? warsawDayBounds(filters.doDnia) : null;
  const start = new Date(Math.max(now.getTime(), from?.start.getTime() ?? now.getTime()));
  const end = to?.end ?? null;
  const statuses: ListedEventStatus[] =
    filters.bilety === "dostepne" ? ["on_sale"] : filters.bilety === "wyprzedane" ? ["sold_out"] : ["on_sale", "sold_out"];
  return { start, end, statuses };
}

export function filterUpcomingEvents(
  events: TourEvent[],
  filters: TrasyFilters,
  now: Date,
): TourEvent[] {
  const bounds = upcomingBounds(filters, now);
  const lower = bounds.start.getTime();
  const upper = bounds.end?.getTime() ?? Number.POSITIVE_INFINITY;
  const statuses = new Set(bounds.statuses);

  return events.filter((event) => {
    const time = new Date(event.starts_at).getTime();
    if (Number.isNaN(time) || time < lower || time >= upper) return false;
    if (filters.osoba && event.person.slug !== filters.osoba) return false;
    if (filters.miasto && event.city !== filters.miasto) return false;
    if (!statuses.has(event.status)) return false;
    if (filters.portal && !event.links.some((link) => link.ticket_provider === filters.portal)) return false;
    return true;
  });
}

export function eventFacets(events: readonly EventFacetSource[]): EventFacets {
  const people = new Map<string, string>();
  const cities = new Set<string>();
  const portals = new Set<TicketProvider>();
  for (const event of events) {
    if (event.person.slug) people.set(event.person.slug, event.person.name);
    if (event.city) cities.add(event.city);
    for (const link of event.links) portals.add(link.ticket_provider);
  }
  return {
    people: [...people.entries()]
      .map(([slug, name]) => ({ slug, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "pl")),
    cities: [...cities].sort((a, b) => a.localeCompare(b, "pl")),
    portals: [...portals].sort((a, b) => PROVIDER_LABELS[a].localeCompare(PROVIDER_LABELS[b], "pl")),
  };
}

const TOP_CITY_LIMIT = 10;

// Largest tour cities, in chip order. A name is included only when facets.cities has it.
const TOP_CITY_RANK = [
  "Warszawa",
  "Kraków",
  "Wrocław",
  "Gdańsk",
  "Poznań",
  "Łódź",
  "Szczecin",
  "Bydgoszcz",
  "Lublin",
  "Białystok",
  "Katowice",
  "Gdynia",
  "Częstochowa",
  "Radom",
  "Toruń",
  "Kielce",
  "Rzeszów",
  "Gliwice",
  "Olsztyn",
  "Bielsko-Biała",
  "Zielona Góra",
  "Opole",
  "Gorzów Wielkopolski",
  "Elbląg",
  "Płock",
  "Włocławek",
  "Tarnów",
  "Koszalin",
] as const;

export function topFacetCities(cities: readonly string[]): string[] {
  const present = new Set(cities);
  const chips: string[] = [];
  for (const city of TOP_CITY_RANK) {
    if (!present.has(city)) continue;
    chips.push(city);
    if (chips.length === TOP_CITY_LIMIT) break;
  }
  return chips;
}

function foldPl(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("pl")
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function peopleSelectOptions(
  people: readonly { slug: string; name: string }[],
  query: string,
  selectedSlug = "",
): { slug: string; name: string }[] {
  const needle = foldPl(query);
  const matched = needle
    ? people.filter((person) => foldPl(person.name).includes(needle))
    : [...people];
  if (!selectedSlug || matched.some((person) => person.slug === selectedSlug)) return matched;
  const selected = people.find((person) => person.slug === selectedSlug);
  return selected ? [selected, ...matched] : matched;
}

export function facetRedirect(filters: TrasyFilters, facets: EventFacets, page = 1): string | null {
  const next: TrasyFilters = { ...filters };
  let changed = false;
  if (next.osoba && !facets.people.some((person) => person.slug === next.osoba)) {
    next.osoba = "";
    changed = true;
  }
  if (next.miasto && !facets.cities.includes(next.miasto)) {
    next.miasto = "";
    changed = true;
  }
  if (next.portal && !facets.portals.includes(next.portal)) {
    next.portal = "";
    changed = true;
  }
  return changed ? trasyHref({ ...next, page }) : null;
}

function warsawPart(iso: string, type: Intl.DateTimeFormatPartTypes): string {
  const parts = new Intl.DateTimeFormat("pl-PL", {
    timeZone: WARSAW,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  return parts.find((part) => part.type === type)?.value ?? "";
}

export function groupEventsByMonth(events: TourEvent[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const event of events) {
    const year = warsawPart(event.starts_at, "year");
    const month = warsawPart(event.starts_at, "month");
    const key = `${year}-${month}`;
    const label = new Intl.DateTimeFormat("pl-PL", {
      timeZone: WARSAW,
      month: "long",
      year: "numeric",
    }).format(new Date(event.starts_at));
    const current = groups[groups.length - 1];
    if (!current || current.key !== key) {
      groups.push({ key, label, events: [event] });
    } else {
      current.events.push(event);
    }
  }
  return groups;
}

export function formatEventWhen(iso: string): string {
  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: WARSAW,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatPrice(price: number | null, currency: string): string | null {
  if (price == null) return null;
  const formatted = new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: Number.isInteger(price) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(price);
  const unit = currency.toUpperCase() === "PLN" ? "zł" : currency;
  return `od ${formatted} ${unit}`;
}

export function statusLabel(status: ListedEventStatus): string {
  return status === "on_sale" ? "W sprzedaży" : "Wyprzedane";
}

export function providerLabel(provider: TicketProvider): string {
  return PROVIDER_LABELS[provider];
}

export function terminLabel(count: number): string {
  if (count === 1) return "termin";
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 > 20)) return "terminy";
  return "terminów";
}
