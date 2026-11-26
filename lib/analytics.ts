import type { BeforeSendEvent } from "@vercel/analytics/next";
import { validateAnalyticsEvent, type AnalyticsEventName } from "./analytics-events.ts";
import { hasConsent } from "./consent.ts";

/**
 * Hobby plan: custom `track()` events do not work. Pageviews go through `<Analytics />` only.
 * The call below stays in the source so a later Pro project can flip this one constant.
 */
export const VERCEL_CUSTOM_EVENTS_ENABLED = false;

const DEDUPE_MS = 1000;
const recent = new Map<string, number>();

const SENSITIVE_PARAMS = ["code", "token", "token_hash", "access_token", "refresh_token"];

export function resetAnalyticsDedupe(): void {
  recent.clear();
}

export function dedupeKey(name: string, props: Record<string, unknown>): string {
  return `${name}:${stableProps(props)}`;
}

function stableProps(props: Record<string, unknown>): string {
  const keys = Object.keys(props).sort();
  return JSON.stringify(keys.map((key) => [key, props[key]]));
}

/** Collapse a pointerdown plus the click that follows it into one event. */
export function shouldRecordAnalytics(name: string, props: Record<string, unknown>, now = Date.now()): boolean {
  const key = dedupeKey(name, props);
  const previous = recent.get(key);
  if (previous != null && now - previous < DEDUPE_MS) return false;
  recent.set(key, now);
  if (recent.size > 200) {
    const oldest = recent.keys().next().value;
    if (oldest) recent.delete(oldest);
  }
  return true;
}

/**
 * Drop auth callback URLs entirely. Strip magic-link secrets from any other URL.
 * Inbound marketing utm_* stay — they are not secrets.
 */
export function sanitizeAnalyticsUrl(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl, "https://parska.pl");
  } catch {
    return null;
  }
  if (url.pathname === "/auth/callback" || url.pathname.startsWith("/auth/callback/")) return null;
  for (const key of SENSITIVE_PARAMS) url.searchParams.delete(key);
  if (url.pathname === "/zaloguj" || url.pathname.startsWith("/auth/")) {
    url.searchParams.delete("error");
  }
  return url.toString();
}

export function analyticsBeforeSend(event: BeforeSendEvent): BeforeSendEvent | null {
  if (!hasConsent("analytics")) return null;
  const url = sanitizeAnalyticsUrl(event.url);
  if (url === null) return null;
  return { ...event, url };
}

function maybeTrackVercel(name: string, props: Record<string, unknown>): void {
  if (!VERCEL_CUSTOM_EVENTS_ENABLED) return;
  if (name !== "kup_bilet") return;
  const provider = props.provider;
  const placement = props.placement;
  if (typeof provider !== "string" || typeof placement !== "string") return;
  void import("@vercel/analytics").then(({ track }) => {
    track(name, { provider, placement });
  });
}

/**
 * Client-side first-party event. No-ops without analytics consent and on the server.
 * Server routes use `trackParska` from `lib/analytics-server.ts` so the service role
 * key never sits in this module.
 */
export function trackParska(name: AnalyticsEventName, props: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;
  if (!hasConsent("analytics")) return;
  const validated = validateAnalyticsEvent(name, props);
  if (!validated.ok) return;
  if (!shouldRecordAnalytics(validated.event.name, validated.event.props)) return;
  maybeTrackVercel(validated.event.name, validated.event.props);
  const body = JSON.stringify({ name: validated.event.name, props: validated.event.props });
  if (body.length > 4000) return;
  void fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
    credentials: "same-origin",
  }).catch(() => {
    // A failed log must not block the click that already started navigation.
  });
}
