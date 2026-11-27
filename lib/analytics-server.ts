import { cookies } from "next/headers";
import type { AnalyticsEventName } from "./analytics-events.ts";
import { insertAnalyticsEvent } from "./analytics-log.ts";
import { hasConsent } from "./consent.ts";

/**
 * Server-side `trackParska`. Reads the first-party consent cookie.
 * Missing consent is off. Nothing here stores an email, user id, or IP.
 */
export async function trackParska(
  name: AnalyticsEventName,
  props: Record<string, unknown> = {},
): Promise<void> {
  const jar = await cookies();
  const raw = jar.get("parska_consent")?.value ?? null;
  if (!hasConsent("analytics", raw)) return;
  await insertAnalyticsEvent(name, props);
}
