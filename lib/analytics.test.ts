import assert from "node:assert/strict";
import { test } from "node:test";
import { validateAnalyticsEvent } from "./analytics-events.ts";
import { resetAnalyticsDedupe, sanitizeAnalyticsUrl, shouldRecordAnalytics, VERCEL_CUSTOM_EVENTS_ENABLED } from "./analytics.ts";

test("sanitizeAnalyticsUrl strips auth secrets and drops the callback url", () => {
  assert.equal(sanitizeAnalyticsUrl("https://parska.pl/auth/callback?code=secret&next=/ulubione"), null);
  const login = sanitizeAnalyticsUrl("https://parska.pl/zaloguj?error=auth&utm_source=newsletter&utm_campaign=listopad");
  assert.ok(login);
  const url = new URL(login);
  assert.equal(url.searchParams.get("error"), null);
  assert.equal(url.searchParams.get("utm_source"), "newsletter");
  assert.equal(url.searchParams.get("utm_campaign"), "listopad");
  const home = new URL(sanitizeAnalyticsUrl("https://parska.pl/?code=1&token=2&utm_medium=social") ?? "");
  assert.equal(home.searchParams.get("code"), null);
  assert.equal(home.searchParams.get("token"), null);
  assert.equal(home.searchParams.get("utm_medium"), "social");
});

test("a double click within a second records one event", () => {
  resetAnalyticsDedupe();
  const props = { event_id: 4, placement: "wystep_primary" };
  assert.equal(shouldRecordAnalytics("kup_bilet", props, 1_000), true);
  assert.equal(shouldRecordAnalytics("kup_bilet", props, 1_400), false);
  assert.equal(shouldRecordAnalytics("kup_bilet", props, 2_200), true);
});

test("kup_bilet rejects bilety24, email, and a missing city", () => {
  const base = {
    event_id: 9,
    provider: "kupbilecik",
    city: "Kraków",
    comedian: "anna|mateusz",
    price_from: 70,
    currency: "pln",
    placement: "wystep_primary",
    is_primary: true,
    status: "on_sale",
  };
  const ok = validateAnalyticsEvent("kup_bilet", base);
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.event.props.currency, "PLN");
  assert.equal(validateAnalyticsEvent("kup_bilet", { ...base, provider: "bilety24" }).ok, false);
  assert.equal(validateAnalyticsEvent("kup_bilet", { ...base, email: "a@b.c" }).ok, false);
  assert.equal(validateAnalyticsEvent("kup_bilet", { ...base, city: "" }).ok, false);
  assert.equal(validateAnalyticsEvent("login_magic_link_sent", { email: "a@b.c" }).ok, false);
  assert.equal(validateAnalyticsEvent("login_magic_link_sent", {}).ok, true);
  assert.equal(validateAnalyticsEvent("video_play", { content_id: 3, video_id: "abcdefghijk", category: "standup" }).ok, true);
});

test("vercel custom events stay off on the hobby plan", () => {
  assert.equal(VERCEL_CUSTOM_EVENTS_ENABLED, false);
});
