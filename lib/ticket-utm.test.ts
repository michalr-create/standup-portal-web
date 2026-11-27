import assert from "node:assert/strict";
import { test } from "node:test";
import {
  analyticsTicketProvider,
  formatComedianSlugs,
  providerFromTicketHost,
  withTicketUtm,
} from "./ticket-utm.ts";

test("withTicketUtm appends parska params and keeps the original query and hash", () => {
  const href = withTicketUtm("https://kupbilecik.pl/adam?ref=mail#mapa", {
    placement: "wystep_primary",
    eventId: 42,
  });
  const url = new URL(href);
  assert.equal(url.searchParams.get("ref"), "mail");
  assert.equal(url.searchParams.get("utm_source"), "parska");
  assert.equal(url.searchParams.get("utm_medium"), "referral");
  assert.equal(url.searchParams.get("utm_campaign"), "bilety");
  assert.equal(url.searchParams.get("utm_content"), "wystep_primary");
  assert.equal(url.searchParams.get("utm_term"), "event-42");
  assert.equal(url.hash, "#mapa");
  assert.equal(href.startsWith("https://kupbilecik.pl/adam?ref=mail&"), true);
});

test("withTicketUtm does not overwrite utm params the shop already set", () => {
  const href = withTicketUtm("https://goingapp.pl/show?utm_source=shop&utm_medium=email", {
    placement: "karta_trasy_primary",
    eventId: 7,
  });
  const url = new URL(href);
  assert.equal(url.searchParams.get("utm_source"), "shop");
  assert.equal(url.searchParams.get("utm_medium"), "email");
  assert.equal(url.searchParams.get("utm_campaign"), "bilety");
  assert.equal(url.searchParams.get("utm_content"), "karta_trasy_primary");
  assert.equal(url.searchParams.get("utm_term"), "event-7");
});

test("withTicketUtm leaves non-http and broken urls alone", () => {
  assert.equal(withTicketUtm("javascript:alert(1)", { placement: "ulubione_bilety", eventId: 1 }), "javascript:alert(1)");
  assert.equal(withTicketUtm("not a url", { placement: "ulubione_bilety", eventId: 1 }), "not a url");
  assert.equal(
    withTicketUtm("https://www.Sklep.Example/bilet", { placement: "karta_trasy_secondary", eventId: 3 }).startsWith(
      "https://www.Sklep.Example/bilet?",
    ),
    true,
  );
});

test("provider mapping never reports bilety24", () => {
  assert.equal(providerFromTicketHost("https://www.kupbilecik.pl/x"), "kupbilecik");
  assert.equal(providerFromTicketHost("https://goingapp.pl/x"), "going");
  assert.equal(providerFromTicketHost("https://bilety24.pl/x"), "other");
  assert.equal(analyticsTicketProvider("bilety24", "https://kupbilecik.pl/x"), "kupbilecik");
  assert.equal(analyticsTicketProvider("going", "https://example.com"), "going");
  assert.equal(analyticsTicketProvider(null, "https://ebilet.pl/a"), "ebilet");
});

test("comedian slugs join with a pipe and stop at 255 characters", () => {
  assert.equal(formatComedianSlugs([{ slug: "anna" }, { slug: "" }, { slug: "mateusz" }]), "anna|mateusz");
  const long = formatComedianSlugs([{ slug: "a".repeat(300) }]);
  assert.equal(long.length, 255);
});
