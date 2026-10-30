export const LISTED_EVENT_STATUSES = ["on_sale", "sold_out"] as const;
export type ListedEventStatus = (typeof LISTED_EVENT_STATUSES)[number];

/** Nearest dates across all favorited people, not per person. */
export const FAVORITE_UPCOMING_LIMIT = 12;
/**
 * Raw favorite rows read before joint bills collapse. A show is one row per
 * person (largest bills in the catalog are four), so the scan is wider than
 * the card limit.
 */
export const FAVORITE_UPCOMING_SCAN_LIMIT = FAVORITE_UPCOMING_LIMIT * 4;
export const FAVORITE_PERSON_SLUG_CAP = 100;

/** Nearest upcoming dates on a standuper profile. The rest live on /trasy. */
export const PROFILE_TOUR_LIMIT = 8;

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

/**
 * Bilety24 only redirects to Kupbilecik. It stays in the provider enum because
 * older `event_ticket_links` rows still use it, but it is not a storefront:
 * tour cards leave it out.
 */
const AGGREGATOR_PROVIDERS = new Set<TicketProvider>(["bilety24"]);

export function isVisibleTicketProvider(provider: TicketProvider): boolean {
  return !AGGREGATOR_PROVIDERS.has(provider);
}

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
  person: { slug: string; name: string };
  people?: readonly { slug: string; name: string }[];
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
  /** Raw `events.ticket_url`, before the visible storefront is chosen. */
  source_ticket_url?: string;
  links: TicketLink[];
  /** Poster from `events.image_url`. Null when every merged copy is empty. */
  image_url?: string | null;
  /** First linked comedian. `people` is the full bill. */
  person: TourPerson;
  people: TourPerson[];
};

/** Row shown on /ulubione. Only people the browser already stored as favorites. */
export type FavoriteUpcomingEvent = {
  id: number;
  starts_at: string;
  city: string;
  status: ListedEventStatus;
  ticket_url: string;
  person: { name: string; slug: string };
  people?: { name: string; slug: string }[];
};

type PeopleEmbed = {
  name: string | null;
  slug: string | null;
  photo_url: string | null;
};

export type EventPersonEmbed = {
  person_id?: number | null;
  people?: PeopleEmbed | PeopleEmbed[] | null;
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
  /** Poster. Empty on most rows; merge keeps the first non-empty copy. */
  image_url?: string | null;
  event_ticket_links?: LinkEmbed | LinkEmbed[] | null;
  /** Legacy headliner (`events.person_id`). */
  people: PeopleEmbed | PeopleEmbed[] | null;
  /** Full bill. Empty means the row has not been linked and `people` is used. */
  event_people?: EventPersonEmbed | EventPersonEmbed[] | null;
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
  const page = filters.page ?? 1;
  if (osoba) params.set("osoba", osoba);
  if (miasto) params.set("miasto", miasto);
  if (od) params.set("od", od);
  if (doDnia) params.set("do", doDnia);
  if (bilety) params.set("bilety", bilety);
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
  const dropPortal = raw.portal != null;

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
  };

  const pageRaw = first(raw.page);
  const parsedPage = parsePositivePage(pageRaw);
  const pageNeedsRedirect = parsedPage == null || (pageRaw != null && pageRaw !== "" && parsedPage === 1);
  const page = parsedPage != null && parsedPage > 1 ? parsedPage : 1;

  const changed =
    osoba.changed || miasto.changed || od.changed || doChanged || bilety.changed || dropPortal || pageNeedsRedirect;
  return {
    filters,
    page,
    redirectHref: changed ? trasyHref({ ...filters, page }) : null,
  };
}

export function activeTrasyFilterCount(filters: TrasyFilters): number {
  return [filters.osoba, filters.miasto, filters.od, filters.doDnia, filters.bilety].filter(
    (value) => value !== "",
  ).length;
}

export function hasActiveTrasyFilters(filters: TrasyFilters): boolean {
  return activeTrasyFilterCount(filters) > 0;
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
  if (primaryProvider && isVisibleTicketProvider(primaryProvider) && primaryUrl) {
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
      if (!provider || !isVisibleTicketProvider(provider) || !url || !externalId) return null;
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

function toTourPerson(person: PeopleEmbed | null): TourPerson | null {
  if (!person) return null;
  const name = person.name?.trim() || "";
  const slug = person.slug?.trim() || "";
  if (!name && !slug) return null;
  return {
    name: name || "Standuper",
    slug,
    photo_url: person.photo_url?.trim() || null,
  };
}

function personKey(person: TourPerson, personId: number | null): string {
  if (person.slug) return `slug:${person.slug}`;
  if (personId != null) return `id:${personId}`;
  return `name:${person.name}`;
}

/**
 * Comedians billed on one `events` row. `event_people` is the bill; the
 * legacy `events.person_id` embed is used only when that junction is empty.
 * The legacy headliner stays first when they are on the bill.
 */
export function peopleFromEventRow(row: {
  person_id?: number | null;
  people?: PeopleEmbed | PeopleEmbed[] | null;
  event_people?: EventPersonEmbed | EventPersonEmbed[] | null;
}): TourPerson[] {
  const billed: { personId: number | null; person: TourPerson }[] = [];
  const seen = new Set<string>();
  for (const link of many(row.event_people)) {
    const person = toTourPerson(one(link.people));
    if (!person) continue;
    const personId = typeof link.person_id === "number" ? link.person_id : null;
    const key = personKey(person, personId);
    if (seen.has(key)) continue;
    seen.add(key);
    billed.push({ personId, person });
  }
  if (billed.length === 0) {
    const person = toTourPerson(one(row.people));
    return person ? [person] : [];
  }
  const primaryId = typeof row.person_id === "number" ? row.person_id : null;
  billed.sort((a, b) => {
    const rank = (personId: number | null) => (personId != null && personId === primaryId ? 0 : 1);
    const byPrimary = rank(a.personId) - rank(b.personId);
    if (byPrimary !== 0) return byPrimary;
    const aId = a.personId ?? Number.MAX_SAFE_INTEGER;
    const bId = b.personId ?? Number.MAX_SAFE_INTEGER;
    if (aId !== bId) return aId - bId;
    return a.person.name.localeCompare(b.person.name, "pl");
  });
  return billed.map((item) => item.person);
}

export function toTourEvent(row: EventRow): TourEvent | null {
  const status = listedStatus(row.status);
  const roster = peopleFromEventRow(row);
  const person = roster[0];
  const starts = new Date(row.starts_at);
  if (!status || !person || Number.isNaN(starts.getTime())) return null;
  const links = ticketLinksFromRow(row);
  const primary = links.find((link) => link.is_primary) ?? links[0];
  if (!primary) return null;
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
    source_ticket_url: row.ticket_url?.trim() || primary.ticket_url,
    links,
    image_url: row.image_url?.trim() || null,
    person,
    people: roster,
  };
}

/** Comedians on a card. A solo row keeps the single `person`. */
export function eventPeople<T extends { slug: string; name: string }>(event: {
  person?: T | null;
  people?: readonly T[] | null;
}): T[] {
  if (event.people && event.people.length > 0) return [...event.people];
  return event.person ? [event.person] : [];
}

/**
 * Ticket URL used to tell two rows apart as the same night. Query and hash
 * are ignored; the host is compared case-insensitively.
 */
export function occurrenceUrlKey(url: string | null | undefined): string {
  const trimmed = url?.trim() ?? "";
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    const pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${parsed.protocol}//${parsed.host.toLowerCase()}${pathname}`;
  } catch {
    const noHash = trimmed.split("#")[0] ?? "";
    const noQuery = noHash.split("?")[0] ?? "";
    return noQuery.replace(/\/+$/, "");
  }
}

export function occurrenceKey(event: {
  ticket_url: string;
  source_ticket_url?: string;
  starts_at: string;
  city: string;
  venue: string;
}): string {
  const starts = new Date(event.starts_at);
  const when = Number.isNaN(starts.getTime()) ? event.starts_at : starts.toISOString();
  const url = occurrenceUrlKey(event.source_ticket_url || event.ticket_url);
  if (url) return `url\u0000${url}\u0000${when}`;
  const city = event.city.trim().toLocaleLowerCase("pl");
  const venue = event.venue.trim().toLocaleLowerCase("pl");
  return `place\u0000${city}\u0000${venue}\u0000${when}`;
}

function unionTicketLinks(events: readonly TourEvent[]): TicketLink[] {
  const seenIds = new Set<string>();
  const seenUrls = new Set<string>();
  const links: TicketLink[] = [];
  let primaryKept = false;
  for (const event of events) {
    for (const link of event.links) {
      const idKey = `${link.ticket_provider}:${link.external_id}`;
      const urlKey = occurrenceUrlKey(link.ticket_url) || link.ticket_url.trim();
      if (seenIds.has(idKey) || (urlKey && seenUrls.has(urlKey))) continue;
      seenIds.add(idKey);
      if (urlKey) seenUrls.add(urlKey);
      const isPrimary = link.is_primary && !primaryKept;
      if (isPrimary) primaryKept = true;
      links.push({ ...link, is_primary: isPrimary });
    }
  }
  if (!primaryKept && links.length > 0) links[0] = { ...links[0], is_primary: true };
  links.sort(
    (a, b) =>
      Number(b.is_primary) - Number(a.is_primary) ||
      a.ticket_provider.localeCompare(b.ticket_provider, "pl") ||
      a.external_id.localeCompare(b.external_id),
  );
  return links;
}

function preferredImage(events: readonly { image_url?: string | null }[]): string | null {
  for (const event of events) {
    const image = event.image_url?.trim();
    if (image) return image;
  }
  return null;
}

function mergeOccurrence(group: readonly TourEvent[]): TourEvent {
  const ordered = [...group].sort((a, b) => a.id - b.id);
  const base = ordered[0];
  const people: TourPerson[] = [];
  const seen = new Set<string>();
  for (const event of ordered) {
    for (const person of eventPeople(event)) {
      const key = person.slug || `name:${person.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      people.push(person);
    }
  }
  const links = unionTicketLinks(ordered);
  const primary = links.find((link) => link.is_primary) ?? links[0] ?? null;
  const title = base.title ?? ordered.find((event) => event.title)?.title ?? null;
  const venueAddress = base.venue_address ?? ordered.find((event) => event.venue_address)?.venue_address ?? null;
  const price = base.price_from ?? ordered.find((event) => event.price_from != null)?.price_from ?? null;
  const roster = people.length > 0 ? people : [base.person];
  return {
    ...base,
    id: base.id,
    person_id: base.person_id,
    title,
    venue_address: venueAddress,
    price_from: price,
    ticket_url: primary?.ticket_url ?? base.ticket_url,
    ticket_provider: primary?.ticket_provider ?? base.ticket_provider,
    source_ticket_url: base.source_ticket_url ?? base.ticket_url,
    links: links.length > 0 ? links : base.links,
    image_url: preferredImage(ordered),
    person: roster[0],
    people: roster,
  };
}

/**
 * One card per real show. People come from `event_people` when that bill is
 * present. Duplicate `events` rows for the same night (`external_id` like
 * `2418520:1` and `2418520:2`) stay until the worker companion change lands,
 * so those rows are still collapsed here.
 *
 * Key: normalized ticket URL (query and hash stripped) + start time. Rows with
 * no URL fall back to city + venue + start time. The kept id is the smallest.
 * A non-null image_url wins over an empty one.
 */
export function mergeTourEvents(events: readonly TourEvent[]): TourEvent[] {
  const groups = new Map<string, TourEvent[]>();
  for (const event of events) {
    const key = occurrenceKey(event);
    const group = groups.get(key);
    if (group) group.push(event);
    else groups.set(key, [event]);
  }
  const merged = [...groups.values()].map((group) => mergeOccurrence(group));
  merged.sort((a, b) => {
    const delta = new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
    return delta !== 0 ? delta : a.id - b.id;
  });
  return merged;
}

/** Page of already-merged cards. `total` is the merged length, not raw rows. */
export function pageMergedEvents<T>(events: readonly T[], page: number, pageSize: number): { events: T[]; total: number } {
  const size = Number.isFinite(pageSize) ? Math.min(100, Math.max(1, Math.floor(pageSize))) : 24;
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const offset = (safePage - 1) * size;
  return { events: events.slice(offset, offset + size), total: events.length };
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

export function favoritePersonSlugs(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of raw) {
    if (typeof value !== "string") continue;
    const slug = value.trim().toLowerCase();
    if (slug.length > 80 || !SLUG.test(slug) || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
    if (out.length >= FAVORITE_PERSON_SLUG_CAP) break;
  }
  return out;
}

function favoriteResultLimit(limit: number | undefined): number {
  if (limit == null || !Number.isFinite(limit)) return FAVORITE_UPCOMING_LIMIT;
  return Math.min(FAVORITE_UPCOMING_LIMIT, Math.max(0, Math.floor(limit)));
}

export function eventsForFavoritePeople<T extends FavoriteUpcomingEvent>(
  events: readonly T[],
  slugs: readonly string[],
  now = new Date(),
  limit?: number,
): T[] {
  const allowed = new Set(favoritePersonSlugs(slugs));
  if (allowed.size === 0) return [];
  const cutoff = now.getTime();
  const seen = new Set<number>();
  const matched: T[] = [];
  for (const event of events) {
    if (event == null || typeof event.id !== "number") continue;
    const roster = eventPeople(event);
    if (!roster.some((person) => allowed.has(person.slug)) || seen.has(event.id)) continue;
    if (event.status !== "on_sale" && event.status !== "sold_out") continue;
    const time = new Date(event.starts_at).getTime();
    if (Number.isNaN(time) || time < cutoff) continue;
    seen.add(event.id);
    matched.push(event);
  }
  matched.sort((a, b) => {
    const delta = new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
    return delta !== 0 ? delta : a.id - b.id;
  });
  return matched.slice(0, favoriteResultLimit(limit));
}

export function pickFavoriteUpcomingEvents(
  events: readonly TourEvent[],
  slugs: readonly string[],
  now = new Date(),
  limit?: number,
): TourEvent[] {
  return eventsForFavoritePeople(mergeTourEvents(events), slugs, now, limit);
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
    if (filters.osoba && !eventPeople(event).some((person) => person.slug === filters.osoba)) return false;
    if (filters.miasto && event.city !== filters.miasto) return false;
    if (!statuses.has(event.status)) return false;
    return true;
  });
}

export function eventFacets(events: readonly EventFacetSource[]): EventFacets {
  const people = new Map<string, string>();
  const cities = new Set<string>();
  for (const event of events) {
    for (const person of eventPeople(event)) {
      if (person.slug) people.set(person.slug, person.name);
    }
    if (event.city) cities.add(event.city);
  }
  return {
    people: [...people.entries()]
      .map(([slug, name]) => ({ slug, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "pl")),
    cities: [...cities].sort((a, b) => a.localeCompare(b, "pl")),
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

export function peopleSelectOptions<T extends { slug: string; name: string }>(
  people: readonly T[],
  query: string,
  selectedSlug = "",
): T[] {
  const needle = foldPl(query);
  const matched = needle
    ? people.filter((person) => foldPl(person.name).includes(needle))
    : [...people];
  if (!selectedSlug || matched.some((person) => person.slug === selectedSlug)) return matched;
  const selected = people.find((person) => person.slug === selectedSlug);
  return selected ? [selected, ...matched] : matched;
}

const EVERYONE_OPTION = { slug: "", name: "Wszyscy" };

/** Options for the /trasy standuper combobox. "Wszyscy" stays available when it matches the query. */
export function personComboboxOptions(
  people: readonly { slug: string; name: string }[],
  query: string,
): { slug: string; name: string }[] {
  const matches = peopleSelectOptions(people, query);
  if (!query.trim()) return [EVERYONE_OPTION, ...matches];
  return [...peopleSelectOptions([EVERYONE_OPTION], query), ...matches];
}

/** Highlight the current person when the query is empty, otherwise the first real match. */
export function personComboboxActiveIndex(
  options: readonly { slug: string }[],
  query: string,
  selectedSlug: string,
): number {
  if (options.length === 0) return -1;
  if (query.trim()) {
    const firstPerson = options.findIndex((option) => option.slug !== "");
    return firstPerson >= 0 ? firstPerson : 0;
  }
  const selected = options.findIndex((option) => option.slug === selectedSlug);
  return selected >= 0 ? selected : 0;
}

/**
 * If focus has not yet cleared the committed name, a keystroke can land on the
 * end of that name. Keep only the characters added past it.
 */
export function comboboxTypedValue(raw: string, selectedName: string, replacePending: boolean): string {
  if (!replacePending || selectedName.length === 0) return raw;
  if (raw.startsWith(selectedName) && raw.length > selectedName.length) {
    return raw.slice(selectedName.length);
  }
  return raw;
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

/** Inclusive cap: "za 60 dni" still shows; later dates stay absolute-only. */
export const RELATIVE_WHEN_MAX_DAYS = 60;

function warsawCalendarDayOffset(instant: Date, from: Date): number {
  const eventDay = warsawToday(instant);
  const today = warsawToday(from);
  const [eventYear, eventMonth, eventDate] = eventDay.split("-").map(Number);
  const [todayYear, todayMonth, todayDate] = today.split("-").map(Number);
  const eventUtc = Date.UTC(eventYear, eventMonth - 1, eventDate);
  const todayUtc = Date.UTC(todayYear, todayMonth - 1, todayDate);
  return Math.round((eventUtc - todayUtc) / 86_400_000);
}

export function formatRelativeWhen(iso: string, now = new Date()): string | null {
  const starts = new Date(iso);
  if (Number.isNaN(starts.getTime())) return null;
  const days = warsawCalendarDayOffset(starts, now);
  if (!Number.isFinite(days) || days < 0 || days > RELATIVE_WHEN_MAX_DAYS) return null;
  if (days === 0) return "dziś";
  if (days === 1) return "jutro";
  return `za ${days} dni`;
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

export type ResolvedTicketLink = {
  link: TicketLink;
  href: string;
};

/**
 * One filled button for the primary storefront, plus outline badges for other
 * sellers. Aggregators and a second copy of the primary provider are omitted.
 */
export function visibleTicketLinks(
  links: readonly TicketLink[],
  hrefFor: (url: string) => string | null,
): { primary: ResolvedTicketLink | null; secondary: ResolvedTicketLink[] } {
  const visible: ResolvedTicketLink[] = [];
  for (const link of links) {
    if (!isVisibleTicketProvider(link.ticket_provider)) continue;
    const href = hrefFor(link.ticket_url);
    if (!href) continue;
    visible.push({ link, href });
  }
  const primary = visible.find((item) => item.link.is_primary) ?? visible[0] ?? null;
  if (!primary) return { primary: null, secondary: [] };
  const secondary = visible.filter(
    (item) => item.href !== primary.href && item.link.ticket_provider !== primary.link.ticket_provider,
  );
  return { primary, secondary };
}

/**
 * Same-tab profile for a tour card. Empty and non-canonical slugs return null
 * so the name stays plain text instead of a dead link.
 * Profile sections have no stable ids, so the path has no hash.
 */
export function standuperProfileHref(slug: string | null | undefined): string | null {
  const trimmed = slug?.trim() ?? "";
  if (!SLUG.test(trimmed)) return null;
  return `/standuper/${trimmed}`;
}

/** Secondary cue from a tour card to that profile. */
export function profileWatchLabel(hasTicketLink: boolean): string {
  return hasTicketLink ? "Obejrzyj przed biletem" : "Filmy artysty";
}

export function terminLabel(count: number): string {
  if (count === 1) return "termin";
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 > 20)) return "terminy";
  return "terminów";
}
