export const CONSENT_VERSION = 1;
export const CONSENT_STORAGE_KEY = "parska_consent";
export const CONSENT_CHANGED_EVENT = "parska-consent-changed";
export const OPEN_CONSENT_EVENT = "parska-open-consent";

/** Twelve months, then the banner asks again. */
export const CONSENT_MONTHS = 12;

export const CONSENT_CATEGORIES = ["necessary", "functional", "analytics", "embeds", "marketing"] as const;
export type ConsentCategory = (typeof CONSENT_CATEGORIES)[number];

export type ConsentChoice = {
  v: number;
  /** Epoch ms when the visitor saved this choice. */
  t: number;
  functional: boolean;
  analytics: boolean;
  embeds: boolean;
  /** Reserved. The banner keeps this off until a real marketing tool exists. */
  marketing: boolean;
};

export type ConsentUpdate = {
  functional: boolean;
  analytics: boolean;
  embeds: boolean;
};

function addMonths(epoch: number, months: number): number {
  const date = new Date(epoch);
  date.setMonth(date.getMonth() + months);
  return date.getTime();
}

export function consentExpired(choice: ConsentChoice, now = Date.now()): boolean {
  return now > addMonths(choice.t, CONSENT_MONTHS);
}

export function parseConsent(raw: string | null | undefined, now = Date.now()): ConsentChoice | null {
  if (!raw) return null;
  let text = raw.trim();
  if (!text) return null;
  if (text.includes("%")) {
    try {
      text = decodeURIComponent(text);
    } catch {
      return null;
    }
  }
  let data: Partial<ConsentChoice>;
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    data = parsed as Partial<ConsentChoice>;
  } catch {
    return null;
  }
  if (data.v !== CONSENT_VERSION) return null;
  if (typeof data.t !== "number" || !Number.isFinite(data.t)) return null;
  const choice: ConsentChoice = {
    v: CONSENT_VERSION,
    t: data.t,
    functional: data.functional === true,
    analytics: data.analytics === true,
    embeds: data.embeds === true,
    marketing: false,
  };
  if (consentExpired(choice, now)) return null;
  return choice;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split("; ");
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq) !== name) continue;
    return part.slice(eq + 1);
  }
  return null;
}

/** Stored choice, or null when the visitor has not decided, the record expired, or the version changed. */
export function getConsent(now = Date.now()): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
  } catch {
    raw = null;
  }
  const fromStore = parseConsent(raw, now);
  if (fromStore) return fromStore;
  return parseConsent(readCookie(CONSENT_STORAGE_KEY), now);
}

/**
 * Missing or expired consent is off for every optional category.
 * Necessary cookies stay on.
 */
export function hasConsent(category: ConsentCategory, raw?: string | null, now = Date.now()): boolean {
  if (category === "necessary") return true;
  const choice = raw !== undefined ? parseConsent(raw, now) : getConsent(now);
  if (!choice) return false;
  return choice[category] === true;
}

function writeCookie(serialized: string): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const maxAge = 60 * 60 * 24 * 366;
  document.cookie = `${CONSENT_STORAGE_KEY}=${encodeURIComponent(serialized)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export function saveConsent(update: ConsentUpdate, now = Date.now()): ConsentChoice {
  const choice: ConsentChoice = {
    v: CONSENT_VERSION,
    t: now,
    functional: update.functional === true,
    analytics: update.analytics === true,
    embeds: update.embeds === true,
    marketing: false,
  };
  const serialized = JSON.stringify(choice);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, serialized);
    } catch {
      // The cookie is the second copy. A blocked localStorage still records the choice.
    }
    writeCookie(serialized);
    document.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
  }
  return choice;
}

export function acceptAllConsent(now = Date.now()): ConsentChoice {
  return saveConsent({ functional: true, analytics: true, embeds: true }, now);
}

export function rejectOptionalConsent(now = Date.now()): ConsentChoice {
  return saveConsent({ functional: false, analytics: false, embeds: false }, now);
}

export function openConsentSettings(): void {
  if (typeof document === "undefined") return;
  document.dispatchEvent(new Event(OPEN_CONSENT_EVENT));
}
