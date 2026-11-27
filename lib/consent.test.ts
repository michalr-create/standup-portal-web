import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CONSENT_VERSION,
  acceptAllConsent,
  hasConsent,
  parseConsent,
  rejectOptionalConsent,
  saveConsent,
} from "./consent.ts";

const NOW = Date.parse("2026-11-26T12:00:00.000Z");

test("missing consent leaves every optional category off", () => {
  assert.equal(parseConsent(null, NOW), null);
  assert.equal(parseConsent("", NOW), null);
  assert.equal(hasConsent("analytics", null, NOW), false);
  assert.equal(hasConsent("functional", undefined, NOW), false);
  assert.equal(hasConsent("embeds", null, NOW), false);
  assert.equal(hasConsent("marketing", null, NOW), false);
  assert.equal(hasConsent("necessary", null, NOW), true);
});

test("a saved choice lasts twelve months and then asks again", () => {
  const fresh = parseConsent(JSON.stringify({ v: CONSENT_VERSION, t: NOW, analytics: true, functional: false, embeds: false }), NOW);
  assert.equal(fresh?.analytics, true);
  const withinYear = NOW + 1000 * 60 * 60 * 24 * 300;
  assert.equal(parseConsent(JSON.stringify({ v: CONSENT_VERSION, t: NOW, analytics: true }), withinYear)?.analytics, true);
  const afterYear = NOW + 1000 * 60 * 60 * 24 * 400;
  assert.equal(parseConsent(JSON.stringify({ v: CONSENT_VERSION, t: NOW, analytics: true }), afterYear), null);
  assert.equal(hasConsent("analytics", JSON.stringify({ v: CONSENT_VERSION, t: NOW, analytics: true }), afterYear), false);
});

test("an old banner version is treated as no decision", () => {
  assert.equal(parseConsent(JSON.stringify({ v: 0, t: NOW, analytics: true }), NOW), null);
});

test("reject optional stores only necessary and accept all turns on the used categories", () => {
  const memory = new Map<string, string>();
  const store = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
  };
  const original = globalThis.window;
  const documentCookie: string[] = [];
  Object.assign(globalThis, {
    window: { localStorage: store, location: { protocol: "https:" } },
    document: {
      get cookie() {
        return documentCookie.join("; ");
      },
      set cookie(value: string) {
        documentCookie.push(value);
      },
      dispatchEvent() {
        return true;
      },
    },
  });
  try {
    const rejected = rejectOptionalConsent(NOW);
    assert.equal(rejected.functional, false);
    assert.equal(rejected.analytics, false);
    assert.equal(rejected.embeds, false);
    assert.equal(rejected.marketing, false);
    const accepted = acceptAllConsent(NOW);
    assert.equal(accepted.functional, true);
    assert.equal(accepted.analytics, true);
    assert.equal(accepted.embeds, true);
    assert.equal(accepted.marketing, false);
    const custom = saveConsent({ functional: true, analytics: false, embeds: true }, NOW);
    assert.equal(custom.analytics, false);
    assert.equal(custom.embeds, true);
    assert.match(documentCookie.at(-1) ?? "", /parska_consent=/);
    assert.match(documentCookie.at(-1) ?? "", /Max-Age=/);
  } finally {
    if (original === undefined) {
      delete (globalThis as { window?: unknown }).window;
      delete (globalThis as { document?: unknown }).document;
    } else {
      globalThis.window = original;
    }
  }
});
