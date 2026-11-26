import { isAnalyticsTicketProvider, isTicketPlacement } from "./ticket-utm.ts";

export const ANALYTICS_EVENT_NAMES = [
  "kup_bilet",
  "przypomnij_mi",
  "dodaj_do_kalendarza",
  "ulubione",
  "login_magic_link_sent",
  "login_google_start",
  "login_success",
  "sign_up_success",
  "push_wlaczony",
  "video_play",
  "wejscie_na_profil",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

const FORBIDDEN_KEYS = new Set([
  "email",
  "e-mail",
  "user_id",
  "userid",
  "userId",
  "ip",
  "ip_address",
  "token",
  "code",
  "token_hash",
]);

export type ValidatedAnalyticsEvent = {
  name: AnalyticsEventName;
  props: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function keysAllowed(props: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(props).every((key) => allowed.includes(key));
}

function positiveId(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) return null;
  return value;
}

function plainText(value: unknown, max: number, allowEmpty = false): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length > max) return null;
  if (!allowEmpty && trimmed.length === 0) return null;
  if (/[\u0000-\u001f@]/.test(trimmed)) return null;
  return allowEmpty ? trimmed : trimmed;
}

function priceFrom(value: unknown): number | null | undefined {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1_000_000) return undefined;
  return value;
}

export function validateAnalyticsEvent(
  name: unknown,
  props: unknown,
): { ok: true; event: ValidatedAnalyticsEvent } | { ok: false } {
  if (typeof name !== "string" || !(ANALYTICS_EVENT_NAMES as readonly string[]).includes(name)) {
    return { ok: false };
  }
  const eventName = name as AnalyticsEventName;
  const raw = props == null ? {} : props;
  if (!isRecord(raw)) return { ok: false };
  for (const key of Object.keys(raw)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase()) || FORBIDDEN_KEYS.has(key)) return { ok: false };
  }

  const fail = { ok: false as const };

  if (eventName === "kup_bilet") {
    if (!keysAllowed(raw, ["event_id", "provider", "city", "comedian", "price_from", "currency", "placement", "is_primary", "status"])) {
      return fail;
    }
    const eventId = positiveId(raw.event_id);
    const city = plainText(raw.city, 80);
    const comedian = plainText(raw.comedian, 255, true);
    const currency = plainText(raw.currency, 8);
    const price = priceFrom(raw.price_from);
    if (
      eventId == null ||
      typeof raw.provider !== "string" ||
      !isAnalyticsTicketProvider(raw.provider) ||
      city == null ||
      comedian == null ||
      price === undefined ||
      currency == null ||
      typeof raw.placement !== "string" ||
      !isTicketPlacement(raw.placement) ||
      typeof raw.is_primary !== "boolean" ||
      (raw.status !== "on_sale" && raw.status !== "sold_out")
    ) {
      return fail;
    }
    return {
      ok: true,
      event: {
        name: eventName,
        props: {
          event_id: eventId,
          provider: raw.provider,
          city,
          comedian,
          price_from: price,
          currency: currency.toUpperCase(),
          placement: raw.placement,
          is_primary: raw.is_primary,
          status: raw.status,
        },
      },
    };
  }

  if (eventName === "przypomnij_mi") {
    if (!keysAllowed(raw, ["event_id", "action"])) return fail;
    const eventId = positiveId(raw.event_id);
    if (eventId == null || (raw.action !== "add" && raw.action !== "remove")) return fail;
    return { ok: true, event: { name: eventName, props: { event_id: eventId, action: raw.action } } };
  }

  if (eventName === "dodaj_do_kalendarza") {
    if (!keysAllowed(raw, ["event_id", "calendar", "ics_variant"])) return fail;
    const eventId = positiveId(raw.event_id);
    if (eventId == null || (raw.calendar !== "google" && raw.calendar !== "outlook" && raw.calendar !== "ics")) {
      return fail;
    }
    const props: Record<string, unknown> = { event_id: eventId, calendar: raw.calendar };
    if ("ics_variant" in raw) {
      if (raw.ics_variant !== "apple" && raw.ics_variant !== "other") return fail;
      props.ics_variant = raw.ics_variant;
    }
    return { ok: true, event: { name: eventName, props } };
  }

  if (eventName === "ulubione") {
    if (!keysAllowed(raw, ["target", "slug", "action"])) return fail;
    const slug = plainText(raw.slug, 160);
    if ((raw.target !== "person" && raw.target !== "show") || slug == null || (raw.action !== "add" && raw.action !== "remove")) {
      return fail;
    }
    return { ok: true, event: { name: eventName, props: { target: raw.target, slug, action: raw.action } } };
  }

  if (eventName === "login_magic_link_sent" || eventName === "login_google_start") {
    if (Object.keys(raw).length !== 0) return fail;
    return { ok: true, event: { name: eventName, props: {} } };
  }

  if (eventName === "login_success" || eventName === "sign_up_success") {
    const allowed = eventName === "login_success" ? ["method", "is_new_user"] : ["method"];
    if (!keysAllowed(raw, allowed)) return fail;
    if (raw.method !== "email" && raw.method !== "google") return fail;
    const props: Record<string, unknown> = { method: raw.method };
    if (eventName === "login_success" && "is_new_user" in raw) {
      if (typeof raw.is_new_user !== "boolean") return fail;
      props.is_new_user = raw.is_new_user;
    }
    return { ok: true, event: { name: eventName, props } };
  }

  if (eventName === "push_wlaczony") {
    if (!keysAllowed(raw, ["result"])) return fail;
    if ("result" in raw && raw.result !== "ok") return fail;
    return { ok: true, event: { name: eventName, props: "result" in raw ? { result: "ok" } : {} } };
  }

  if (eventName === "video_play") {
    if (!keysAllowed(raw, ["content_id", "video_id", "category"])) return fail;
    const contentId = positiveId(raw.content_id);
    const videoId = plainText(raw.video_id, 32);
    if (contentId == null || videoId == null || !/^[A-Za-z0-9_-]{6,32}$/.test(videoId)) return fail;
    const props: Record<string, unknown> = { content_id: contentId, video_id: videoId };
    if ("category" in raw) {
      const category = plainText(raw.category, 80);
      if (category == null) return fail;
      props.category = category;
    }
    return { ok: true, event: { name: eventName, props } };
  }

  if (!keysAllowed(raw, ["slug"])) return fail;
  const slug = plainText(raw.slug, 160);
  if (slug == null) return fail;
  return { ok: true, event: { name: "wejscie_na_profil", props: { slug } } };
}
