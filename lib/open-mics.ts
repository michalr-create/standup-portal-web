/**
 * Open-mic listing rules. Dates live in open_mic_dates, not in events,
 * so /trasy never sees them. Weekday filters use upcoming dates in
 * Europe/Warsaw and fall back to recurrence_text only when a cycle has
 * no upcoming date.
 */

export const OPEN_MIC_LANGUAGES = ["pl", "en", "pl/en"] as const;
export type OpenMicLanguage = (typeof OPEN_MIC_LANGUAGES)[number];

export const PUBLIC_OPEN_MIC_STATUSES = ["active", "to_verify"] as const;
export type PublicOpenMicStatus = (typeof PUBLIC_OPEN_MIC_STATUSES)[number];

/** Same values as public.events.status. EventScheduled from a feed maps to on_sale. */
export const OPEN_MIC_DATE_STATUSES = ["on_sale", "sold_out", "cancelled", "unknown"] as const;
export type OpenMicDateStatus = (typeof OPEN_MIC_DATE_STATUSES)[number];

/** Shown under "Najbliższe terminy". cancelled is stored but not listed. */
export const LISTED_OPEN_MIC_DATE_STATUSES = ["on_sale", "sold_out", "unknown"] as const;

export const OPEN_MIC_WEEKDAYS = [
  { value: 1, label: "poniedziałek" },
  { value: 2, label: "wtorek" },
  { value: 3, label: "środa" },
  { value: 4, label: "czwartek" },
  { value: 5, label: "piątek" },
  { value: 6, label: "sobota" },
  { value: 7, label: "niedziela" },
] as const;

export type OpenMicWeekday = (typeof OPEN_MIC_WEEKDAYS)[number]["value"];

export type OpenMicCycle = {
  id: number;
  name: string;
  slug: string;
  city: string | null;
  venue: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  recurrence_text: string | null;
  language: OpenMicLanguage | null;
  signup_info: string | null;
  signup_url: string | null;
  rules: string | null;
  audience_price_text: string | null;
  organizer: string | null;
  status: PublicOpenMicStatus;
};

export type OpenMicDate = {
  id: number;
  open_mic_id: number | null;
  title: string | null;
  starts_at: string;
  city: string | null;
  venue: string | null;
  provider: "kupbilecik" | "other";
  url: string | null;
  status: OpenMicDateStatus;
};

export type OpenMicFilters = {
  miasto: string;
  dzien: OpenMicWeekday | 0;
  jezyk: OpenMicLanguage | "";
};

export type OpenMicSearch = {
  miasto?: string | string[];
  dzien?: string | string[];
  jezyk?: string | string[];
};

export type OpenMicView = {
  cycles: OpenMicCycle[];
  dates: OpenMicDate[];
  cities: string[];
  /** Visible cycles before filters. Zero means the empty catalog state. */
  catalogCount: number;
};

const WARSAW = "Europe/Warsaw";
const CITY = /^[\p{L}\p{M}][\p{L}\p{M}0-9 .'\-]{0,79}$/u;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LETTER = "a-ząćęłńóśźż";

const RECURRENCE_RULES: { weekday: OpenMicWeekday; pattern: RegExp }[] = [
  { weekday: 1, pattern: new RegExp(`(?:^|[^${LETTER}])poniedzia[łl](?:ek|ki|kowy|kowych|ku|kach)?(?![${LETTER}])`, "i") },
  { weekday: 2, pattern: new RegExp(`(?:^|[^${LETTER}])wtork(?:ek|i|u|owy|owych|owe|a|iem)?(?![${LETTER}])`, "i") },
  { weekday: 3, pattern: new RegExp(`(?:^|[^${LETTER}])[sś]rod(?:a|y|ę|e|owy|owych|owe|ami)?(?![${LETTER}])`, "i") },
  { weekday: 4, pattern: new RegExp(`(?:^|[^${LETTER}])czwart(?:ek|ki|ku|kowy|kowych|kowe|kach)?(?![${LETTER}])`, "i") },
  { weekday: 5, pattern: new RegExp(`(?:^|[^${LETTER}])pi[ąa]t(?:ek|ki|ku|kowy|kowych|kowe|kach)?(?![${LETTER}])`, "i") },
  { weekday: 6, pattern: new RegExp(`(?:^|[^${LETTER}])sobot(?:a|y|ę|e|ni|nia|nią|nich|nie)?(?![${LETTER}])`, "i") },
  { weekday: 7, pattern: new RegExp(`(?:^|[^${LETTER}])niedziel(?:a|e|ę|i|ny|ne|na|nych)?(?![${LETTER}])`, "i") },
];

const ENGLISH_WEEKDAYS: Record<string, OpenMicWeekday> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7,
};

const WEEKDAY_NAME: Record<string, OpenMicWeekday> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function numberId(value: unknown): number | null {
  const id = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

function coord(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
  if (!Number.isFinite(n)) return null;
  return n;
}

function isWeekday(value: number): value is OpenMicWeekday {
  return value >= 1 && value <= 7;
}

function isLanguage(value: string): value is OpenMicLanguage {
  return (OPEN_MIC_LANGUAGES as readonly string[]).includes(value);
}

export function languageBadge(language: OpenMicLanguage | null): string | null {
  if (language === "pl") return "PL";
  if (language === "en") return "EN";
  if (language === "pl/en") return "PL/EN";
  return null;
}

export function languageLabel(language: OpenMicLanguage): string {
  if (language === "pl") return "polski";
  if (language === "en") return "angielski";
  return "polski i angielski";
}

export function weekdayLabel(weekday: OpenMicWeekday): string {
  return OPEN_MIC_WEEKDAYS.find((day) => day.value === weekday)?.label ?? "";
}

export function cyklLabel(count: number): string {
  if (count === 1) return "cykl";
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 > 20)) return "cykle";
  return "cykli";
}

export function warsawWeekday(iso: string): OpenMicWeekday | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const name = new Intl.DateTimeFormat("en-US", { timeZone: WARSAW, weekday: "short" }).format(date);
  const weekday = WEEKDAY_NAME[name];
  return weekday ?? null;
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
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  let hour = read("hour");
  if (hour === 24) hour = 0;
  return Date.UTC(read("year"), read("month") - 1, read("day"), hour, read("minute"), read("second"));
}

function warsawLocalToUtc(year: number, month: number, day: number, hour: number, minute: number): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const offset = warsawWallClockAsUtc(new Date(guess)) - guess;
  let utc = guess - offset;
  const offset2 = warsawWallClockAsUtc(new Date(utc)) - utc;
  if (offset2 !== offset) utc = guess - offset2;
  return new Date(utc);
}

function warsawYmd(instant: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: WARSAW,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  return { year: read("year"), month: read("month"), day: read("day") };
}

function addCalendarDays(year: number, month: number, day: number, add: number): { year: number; month: number; day: number } {
  const utc = new Date(Date.UTC(year, month - 1, day + add));
  return { year: utc.getUTCFullYear(), month: utc.getUTCMonth() + 1, day: utc.getUTCDate() };
}

/** Next Warsaw wall-clock slot on `weekday` (1 = Monday) that is still ahead of `now`. */
export function upcomingWarsawSlot(now: Date, weekday: OpenMicWeekday, hour: number, minute = 0): string {
  const start = warsawYmd(now);
  for (let add = 0; add < 14; add += 1) {
    const date = addCalendarDays(start.year, start.month, start.day, add);
    const instant = warsawLocalToUtc(date.year, date.month, date.day, hour, minute);
    if (warsawWeekday(instant.toISOString()) === weekday && instant.getTime() >= now.getTime()) {
      return instant.toISOString();
    }
  }
  return warsawLocalToUtc(start.year, start.month, start.day, hour, minute).toISOString();
}

export function weekdaysFromRecurrence(text: string | null | undefined): OpenMicWeekday[] {
  if (!text?.trim()) return [];
  const found = new Set<OpenMicWeekday>();
  for (const rule of RECURRENCE_RULES) {
    if (rule.pattern.test(text)) found.add(rule.weekday);
  }
  const english = text.match(/\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?\b/gi) ?? [];
  for (const word of english) {
    const weekday = ENGLISH_WEEKDAYS[word.toLowerCase().replace(/s$/, "")];
    if (weekday) found.add(weekday);
  }
  return [...found].sort((a, b) => a - b);
}

export function cycleWeekdays(
  cycle: { id: number; recurrence_text: string | null },
  dates: readonly { open_mic_id: number | null; starts_at: string }[],
): OpenMicWeekday[] {
  const fromDates = new Set<OpenMicWeekday>();
  for (const date of dates) {
    if (date.open_mic_id !== cycle.id) continue;
    const weekday = warsawWeekday(date.starts_at);
    if (weekday) fromDates.add(weekday);
  }
  if (fromDates.size > 0) return [...fromDates].sort((a, b) => a - b);
  return weekdaysFromRecurrence(cycle.recurrence_text);
}

function normCity(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("pl");
}

export function isListedOpenMicDate(date: OpenMicDate, now: Date): boolean {
  if (!(LISTED_OPEN_MIC_DATE_STATUSES as readonly string[]).includes(date.status)) return false;
  const starts = Date.parse(date.starts_at);
  return Number.isFinite(starts) && starts >= now.getTime();
}

export function listedOpenMicDates(
  cycles: readonly OpenMicCycle[],
  dates: readonly OpenMicDate[],
  now: Date,
): OpenMicDate[] {
  const ids = new Set(cycles.map((cycle) => cycle.id));
  return dates
    .filter((date) => date.open_mic_id != null && ids.has(date.open_mic_id) && isListedOpenMicDate(date, now))
    .sort((a, b) => {
      const delta = Date.parse(a.starts_at) - Date.parse(b.starts_at);
      return delta !== 0 ? delta : a.id - b.id;
    });
}

function cycleMatchesCity(cycle: OpenMicCycle, dates: readonly OpenMicDate[], city: string): boolean {
  if (!city) return true;
  if (normCity(cycle.city) === city) return true;
  return dates.some((date) => date.open_mic_id === cycle.id && normCity(date.city) === city);
}

function dateMatchesCity(date: OpenMicDate, parent: OpenMicCycle | undefined, city: string): boolean {
  if (!city) return true;
  const own = normCity(date.city);
  if (own) return own === city;
  return normCity(parent?.city) === city;
}

function nextTimestamp(cycle: OpenMicCycle, dates: readonly OpenMicDate[]): number {
  let best = Number.POSITIVE_INFINITY;
  for (const date of dates) {
    if (date.open_mic_id !== cycle.id) continue;
    const starts = Date.parse(date.starts_at);
    if (Number.isFinite(starts) && starts < best) best = starts;
  }
  return best;
}

export function nextOpenMicDate(cycle: OpenMicCycle, dates: readonly OpenMicDate[]): OpenMicDate | null {
  let best: OpenMicDate | null = null;
  let bestTime = Number.POSITIVE_INFINITY;
  for (const date of dates) {
    if (date.open_mic_id !== cycle.id) continue;
    const starts = Date.parse(date.starts_at);
    if (!Number.isFinite(starts) || starts > bestTime) continue;
    if (starts === bestTime && best && date.id >= best.id) continue;
    best = date;
    bestTime = starts;
  }
  return best;
}

export function facetCities(cycles: readonly OpenMicCycle[], dates: readonly OpenMicDate[]): string[] {
  const byKey = new Map<string, string>();
  const add = (value: string | null) => {
    const display = value?.trim().replace(/\s+/g, " ") ?? "";
    if (!display) return;
    const key = display.toLocaleLowerCase("pl");
    if (!byKey.has(key)) byKey.set(key, display);
  };
  for (const cycle of cycles) add(cycle.city);
  for (const date of dates) add(date.city);
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, "pl"));
}

export function hasActiveOpenMicFilters(filters: OpenMicFilters): boolean {
  return Boolean(filters.miasto || filters.dzien || filters.jezyk);
}

export function buildOpenMicView(
  cycles: readonly OpenMicCycle[],
  dates: readonly OpenMicDate[],
  filters: OpenMicFilters,
  now: Date,
): OpenMicView {
  const upcoming = listedOpenMicDates(cycles, dates, now);
  const city = normCity(filters.miasto);
  const matched = cycles.filter((cycle) => {
    if (filters.jezyk && cycle.language !== filters.jezyk) return false;
    if (filters.dzien && !cycleWeekdays(cycle, upcoming).includes(filters.dzien)) return false;
    if (!cycleMatchesCity(cycle, upcoming, city)) return false;
    return true;
  });
  const byId = new Map(matched.map((cycle) => [cycle.id, cycle]));
  const visibleDates = upcoming.filter((date) => {
    const parent = date.open_mic_id == null ? undefined : byId.get(date.open_mic_id);
    if (!parent) return false;
    if (filters.dzien && warsawWeekday(date.starts_at) !== filters.dzien) return false;
    return dateMatchesCity(date, parent, city);
  });
  const sortedCycles = [...matched].sort((a, b) => {
    const delta = nextTimestamp(a, visibleDates) - nextTimestamp(b, visibleDates);
    if (delta !== 0) return delta;
    return a.name.localeCompare(b.name, "pl");
  });
  return {
    cycles: sortedCycles,
    dates: visibleDates,
    cities: facetCities(cycles, upcoming),
    catalogCount: cycles.length,
  };
}

export function openMicHref(filters: Partial<OpenMicFilters> = {}): string {
  const params = new URLSearchParams();
  const miasto = filters.miasto?.trim() ?? "";
  const dzien = filters.dzien ?? 0;
  const jezyk = filters.jezyk ?? "";
  if (miasto) params.set("miasto", miasto);
  if (isWeekday(dzien)) params.set("dzien", String(dzien));
  if (jezyk) params.set("jezyk", jezyk);
  const qs = params.toString();
  return qs ? `/open-mic?${qs}` : "/open-mic";
}

function canonicalizeCity(raw: string | undefined): { value: string; changed: boolean } {
  if (raw == null || raw === "") return { value: "", changed: false };
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!CITY.test(trimmed)) return { value: "", changed: true };
  return { value: trimmed, changed: trimmed !== raw };
}

function canonicalizeWeekday(raw: string | undefined): { value: OpenMicWeekday | 0; changed: boolean } {
  if (raw == null || raw === "") return { value: 0, changed: false };
  const trimmed = raw.trim();
  const day = Number(trimmed);
  if (!isWeekday(day) || String(day) !== trimmed) return { value: 0, changed: true };
  return { value: day, changed: trimmed !== raw };
}

function canonicalizeLanguage(raw: string | undefined): { value: OpenMicLanguage | ""; changed: boolean } {
  if (raw == null || raw === "") return { value: "", changed: false };
  const trimmed = raw.trim().toLowerCase();
  if (!isLanguage(trimmed)) return { value: "", changed: true };
  return { value: trimmed, changed: trimmed !== raw };
}

export function parseOpenMicSearchParams(raw: OpenMicSearch): {
  filters: OpenMicFilters;
  redirectHref: string | null;
} {
  const miasto = canonicalizeCity(first(raw.miasto));
  const dzien = canonicalizeWeekday(first(raw.dzien));
  const jezyk = canonicalizeLanguage(first(raw.jezyk));
  const filters: OpenMicFilters = { miasto: miasto.value, dzien: dzien.value, jezyk: jezyk.value };
  const changed = miasto.changed || dzien.changed || jezyk.changed;
  return { filters, redirectHref: changed ? openMicHref(filters) : null };
}

export function openMicFacetRedirect(filters: OpenMicFilters, cities: readonly string[]): string | null {
  if (!filters.miasto) return null;
  const match = cities.find((city) => normCity(city) === normCity(filters.miasto));
  if (!match) return openMicHref({ ...filters, miasto: "" });
  if (match !== filters.miasto) return openMicHref({ ...filters, miasto: match });
  return null;
}

export function mapsSearchHref(cycle: Pick<OpenMicCycle, "address" | "city" | "lat" | "lng">): string | null {
  if (
    cycle.lat != null &&
    cycle.lng != null &&
    Number.isFinite(cycle.lat) &&
    Number.isFinite(cycle.lng)
  ) {
    return `https://www.google.com/maps/search/?api=1&query=${cycle.lat},${cycle.lng}`;
  }
  const parts = [cycle.address?.trim(), cycle.city?.trim()].filter(Boolean);
  if (parts.length === 0) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(", "))}`;
}

export function toOpenMicCycle(row: unknown): OpenMicCycle | null {
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  const id = numberId(record.id);
  const name = text(record.name);
  const slug = text(record.slug);
  const status = record.status === "active" || record.status === "to_verify" ? record.status : null;
  if (id == null || !name || !slug || !status || !SLUG.test(slug)) return null;
  const language = typeof record.language === "string" && isLanguage(record.language) ? record.language : null;
  let lat = coord(record.lat);
  let lng = coord(record.lng);
  if (lat == null || lng == null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    lat = null;
    lng = null;
  }
  return {
    id,
    name,
    slug,
    city: text(record.city),
    venue: text(record.venue),
    address: text(record.address),
    lat,
    lng,
    recurrence_text: text(record.recurrence_text),
    language,
    signup_info: text(record.signup_info),
    signup_url: text(record.signup_url),
    rules: text(record.rules),
    audience_price_text: text(record.audience_price_text),
    organizer: text(record.organizer),
    status,
  };
}

export function toOpenMicDate(row: unknown): OpenMicDate | null {
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  const id = numberId(record.id);
  const startsAt = text(record.starts_at);
  const provider = record.provider === "kupbilecik" || record.provider === "other" ? record.provider : null;
  const status = (OPEN_MIC_DATE_STATUSES as readonly string[]).includes(String(record.status))
    ? (record.status as OpenMicDateStatus)
    : null;
  if (id == null || !startsAt || Number.isNaN(Date.parse(startsAt)) || !provider || !status) return null;
  if (record.moderation_status != null && record.moderation_status !== "approved") return null;
  const openMicId = record.open_mic_id == null ? null : numberId(record.open_mic_id);
  if (record.open_mic_id != null && openMicId == null) return null;
  return {
    id,
    open_mic_id: openMicId,
    title: text(record.title),
    starts_at: new Date(startsAt).toISOString(),
    city: text(record.city),
    venue: text(record.venue),
    provider,
    url: text(record.url),
    status,
  };
}

export function slugifyOpenMicName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72)
    .replace(/-+$/g, "");
  return slug || "open-mic";
}

export function nextOpenMicSlug(base: string, taken: readonly string[]): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let n = 2; n < 1000; n += 1) {
    const candidate = `${base}-${n}`.slice(0, 80).replace(/-+$/g, "");
    if (!used.has(candidate)) return candidate;
  }
  return `${base}-x`.slice(0, 80);
}

export type OpenMicInsert = {
  name: string;
  city: string | null;
  venue: string | null;
  address: string | null;
  recurrence_text: string | null;
  language: OpenMicLanguage | null;
  signup_info: string | null;
  signup_url: string | null;
  rules: string | null;
  audience_price_text: string | null;
  organizer: string | null;
  source_urls: string[];
  submitted_by_email: string;
};

export type OpenMicSubmissionInput = {
  name: string;
  city: string;
  venue: string;
  address: string;
  recurrence: string;
  language: string;
  signupInfo: string;
  signupUrl: string;
  rules: string;
  price: string;
  organizer: string;
  email: string;
  sourceUrl: string;
  honeypot: string;
};

export type OpenMicSubmitState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; error: string };

export type SubmissionCheck =
  | { kind: "spam" }
  | { kind: "error"; error: string }
  | { kind: "valid"; row: OpenMicInsert };

const SAVE_LIMITS = {
  name: 120,
  city: 80,
  venue: 120,
  address: 200,
  recurrence: 300,
  signupInfo: 500,
  signupUrl: 500,
  rules: 1000,
  price: 120,
  organizer: 160,
  email: 200,
  sourceUrl: 500,
} as const;

function cleanLine(value: string, max: number): { value: string } | { error: string } {
  const trimmed = value.replace(/\r\n/g, "\n").trim();
  if (trimmed.length > max) return { error: "Jedno z pól jest za długie." };
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(trimmed)) return { error: "Jedno z pól ma niedozwolone znaki." };
  return { value: trimmed };
}

function httpUrl(value: string, max: number, label: string): { value: string | null } | { error: string } {
  const cleaned = cleanLine(value, max);
  if ("error" in cleaned) return cleaned;
  if (!cleaned.value) return { value: null };
  let url: URL;
  try {
    url = new URL(cleaned.value);
  } catch {
    return { error: `${label} musi zaczynać się od http:// lub https://.` };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { error: `${label} musi zaczynać się od http:// lub https://.` };
  }
  if (url.username || url.password) return { error: `${label} wygląda na nieprawidłowy.` };
  return { value: url.toString() };
}

function countLinks(value: string): number {
  return value.match(/https?:\/\//gi)?.length ?? 0;
}

export function submissionFromForm(form: FormData): OpenMicSubmissionInput {
  const read = (key: string) => {
    const value = form.get(key);
    return typeof value === "string" ? value : "";
  };
  return {
    name: read("name"),
    city: read("city"),
    venue: read("venue"),
    address: read("address"),
    recurrence: read("recurrence"),
    language: read("language"),
    signupInfo: read("signup_info"),
    signupUrl: read("signup_url"),
    rules: read("rules"),
    price: read("price"),
    organizer: read("organizer"),
    email: read("email"),
    sourceUrl: read("source_url"),
    honeypot: read("hp_leave_blank"),
  };
}

export function validateOpenMicSubmission(input: OpenMicSubmissionInput): SubmissionCheck {
  if (input.honeypot.trim()) return { kind: "spam" };

  const name = cleanLine(input.name, SAVE_LIMITS.name);
  if ("error" in name) return { kind: "error", error: name.error };
  if (name.value.length < 2) return { kind: "error", error: "Podaj nazwę open micu (2–120 znaków)." };
  if (/https?:\/\//i.test(name.value)) return { kind: "error", error: "Podaj nazwę cyklu, bez linku." };

  const city = cleanLine(input.city, SAVE_LIMITS.city);
  if ("error" in city) return { kind: "error", error: city.error };
  if (city.value && !CITY.test(city.value)) return { kind: "error", error: "Podaj samo miasto, bez adresu." };

  const venue = cleanLine(input.venue, SAVE_LIMITS.venue);
  if ("error" in venue) return { kind: "error", error: venue.error };
  const address = cleanLine(input.address, SAVE_LIMITS.address);
  if ("error" in address) return { kind: "error", error: address.error };
  const recurrence = cleanLine(input.recurrence, SAVE_LIMITS.recurrence);
  if ("error" in recurrence) return { kind: "error", error: recurrence.error };
  const signupInfo = cleanLine(input.signupInfo, SAVE_LIMITS.signupInfo);
  if ("error" in signupInfo) return { kind: "error", error: signupInfo.error };
  const rules = cleanLine(input.rules, SAVE_LIMITS.rules);
  if ("error" in rules) return { kind: "error", error: rules.error };
  const price = cleanLine(input.price, SAVE_LIMITS.price);
  if ("error" in price) return { kind: "error", error: price.error };
  const organizer = cleanLine(input.organizer, SAVE_LIMITS.organizer);
  if ("error" in organizer) return { kind: "error", error: organizer.error };

  const languageRaw = input.language.trim().toLowerCase();
  if (languageRaw && !isLanguage(languageRaw)) {
    return { kind: "error", error: "Wybierz język: polski, angielski albo oba." };
  }

  const signupUrl = httpUrl(input.signupUrl, SAVE_LIMITS.signupUrl, "Link do zapisów");
  if ("error" in signupUrl) return { kind: "error", error: signupUrl.error };
  const sourceUrl = httpUrl(input.sourceUrl, SAVE_LIMITS.sourceUrl, "Link do źródła");
  if ("error" in sourceUrl) return { kind: "error", error: sourceUrl.error };

  const emailClean = cleanLine(input.email, SAVE_LIMITS.email);
  if ("error" in emailClean) return { kind: "error", error: emailClean.error };
  const email = emailClean.value.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { kind: "error", error: "Podaj adres e-mail, odezwiemy się gdyby trzeba było dopytać." };
  }

  const blob = [name.value, signupInfo.value, rules.value, organizer.value].join("\n");
  if (countLinks(blob) > 4) return { kind: "spam" };

  return {
    kind: "valid",
    row: {
      name: name.value,
      city: city.value || null,
      venue: venue.value || null,
      address: address.value || null,
      recurrence_text: recurrence.value || null,
      language: languageRaw ? (languageRaw as OpenMicLanguage) : null,
      signup_info: signupInfo.value || null,
      signup_url: signupUrl.value,
      rules: rules.value || null,
      audience_price_text: price.value || null,
      organizer: organizer.value || null,
      source_urls: sourceUrl.value ? [sourceUrl.value] : [],
      submitted_by_email: email,
    },
  };
}

export function emptyOpenMicFilters(): OpenMicFilters {
  return { miasto: "", dzien: 0, jezyk: "" };
}

/** Local screenshot fixture. Dates stay in the future relative to `now`. */
export function sampleOpenMicCatalog(now: Date): { cycles: OpenMicCycle[]; dates: OpenMicDate[] } {
  const tuesday = upcomingWarsawSlot(now, 2, 19, 0);
  const wednesday = upcomingWarsawSlot(now, 3, 19, 0);
  const friday = upcomingWarsawSlot(now, 5, 20, 0);
  const sunday = upcomingWarsawSlot(now, 7, 18, 0);
  const cycles: OpenMicCycle[] = [
    {
      id: 1,
      name: "Stand-up Open Mic w Resorcie",
      slug: "stand-up-open-mic-w-resorcie",
      city: "Warszawa",
      venue: "Resort Komedii",
      address: "ul. Bielańska 1",
      lat: 52.2447,
      lng: 21.0067,
      recurrence_text: "cyklicznie, najczęściej wtorki",
      language: "pl",
      signup_info: "Fanpage „Warszawski Stand-up”",
      signup_url: "https://www.facebook.com/",
      rules: null,
      audience_price_text: "bilet 25 zł",
      organizer: "Stand-up Polska",
      status: "active",
    },
    {
      id: 2,
      name: "Friday Night Open Mic",
      slug: "friday-night-open-mic",
      city: "Warszawa",
      venue: "Restauracja Gruzińska Madloba",
      address: "ul. Żelazna 41",
      lat: null,
      lng: null,
      recurrence_text: "co tydzień, piątek",
      language: "en",
      signup_info: "Instagram @badr.comedy",
      signup_url: null,
      rules: null,
      audience_price_text: "wstęp wolny (napiwki)",
      organizer: "Warsaw Comedy",
      status: "active",
    },
    {
      id: 3,
      name: "Comedy Lab – Środowy Stand-Up & Open Mic",
      slug: "comedy-lab-srodowy-open-mic",
      city: "Kraków",
      venue: "Pub 103,8 FM",
      address: "ul. Bożego Ciała 7",
      lat: null,
      lng: null,
      recurrence_text: "co tydzień, środa",
      language: "pl",
      signup_info: "e-mail openmic@comedylab.pl",
      signup_url: "https://comedylab.pl/open-mic/",
      rules: null,
      audience_price_text: "widzowie 20 zł",
      organizer: "Comedy Lab",
      status: "to_verify",
    },
    {
      id: 4,
      name: "Niedziela na wesoło",
      slug: "niedziela-na-wesolo",
      city: "Warszawa",
      venue: "City24 Restaurant Grill & Bar",
      address: "Al. Jerozolimskie 6",
      lat: null,
      lng: null,
      recurrence_text: "co tydzień, niedziela",
      language: "pl/en",
      signup_info: "Instagram @jakarturbowicz",
      signup_url: null,
      rules: null,
      audience_price_text: "bilet 20 zł",
      organizer: null,
      status: "active",
    },
  ];
  const dates: OpenMicDate[] = [
    {
      id: 101,
      open_mic_id: 1,
      title: "Stand-up Open Mic w Resorcie",
      starts_at: tuesday,
      city: "Warszawa",
      venue: "Resort Komedii",
      provider: "kupbilecik",
      url: "https://www.kupbilecik.pl/pl/event/222069/warszawa/stand-up-polska",
      status: "on_sale",
    },
    {
      id: 102,
      open_mic_id: 3,
      title: "Comedy Lab – open mic",
      starts_at: wednesday,
      city: "Kraków",
      venue: "Pub 103,8 FM",
      provider: "kupbilecik",
      url: "https://www.kupbilecik.pl/pl/event/221315/krakow/comedy-lab-laboratorium-komedii",
      status: "sold_out",
    },
    {
      id: 103,
      open_mic_id: 2,
      title: "Friday Night Open Mic",
      starts_at: friday,
      city: "Warszawa",
      venue: "Madloba",
      provider: "other",
      url: "https://warsawcomedy.com/",
      status: "on_sale",
    },
    {
      id: 104,
      open_mic_id: 4,
      title: "Niedziela na wesoło",
      starts_at: sunday,
      city: "Warszawa",
      venue: "City24",
      provider: "kupbilecik",
      url: "https://www.kupbilecik.pl/pl/event/225695/warszawa/niedziela-na-wesolo",
      status: "on_sale",
    },
    {
      id: 105,
      open_mic_id: 1,
      title: "Odwołany termin",
      starts_at: tuesday,
      city: "Warszawa",
      venue: "Resort Komedii",
      provider: "kupbilecik",
      url: "https://www.kupbilecik.pl/pl/event/1",
      status: "cancelled",
    },
    {
      id: 106,
      open_mic_id: null,
      title: "Bez cyklu",
      starts_at: friday,
      city: "Gdańsk",
      venue: "LOFT",
      provider: "kupbilecik",
      url: "https://www.kupbilecik.pl/pl/event/2",
      status: "on_sale",
    },
  ];
  return { cycles, dates };
}
