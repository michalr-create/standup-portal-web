import assert from "node:assert/strict";
import { test } from "node:test";
import { buildEventIcs } from "./calendar-ics.ts";
import { calendarLinks } from "./calendar-links.ts";

const stampedAt = new Date("2026-11-21T10:00:00.000Z");

const show = {
  id: 15,
  title: "Żółć & łąka — stand-up",
  startsAt: "2026-11-21T19:30:00+01:00",
  city: "Łódź",
  venue: "Klub Świt",
  ticketUrl: "https://bilety.example/łódź?bilet=1&miasto=Łódź",
};

test("google and outlook use the same UTC slot as the ics file", () => {
  const links = calendarLinks(show);
  const ics = buildEventIcs({ ...show, stampedAt });
  assert.ok(links.google);
  assert.ok(links.outlook);
  assert.ok(ics);
  assert.match(links.google, /[?&]action=TEMPLATE(?:&|$)/);
  assert.match(links.google, /[?&]dates=20261121T183000Z\/20261121T203000Z(?:&|$)/);
  assert.match(ics, /DTSTART:20261121T183000Z/);
  assert.match(ics, /DTEND:20261121T203000Z/);
  assert.equal(links.ics, "/api/wydarzenia/15/kalendarz");

  const google = new URL(links.google);
  assert.equal(google.origin + google.pathname, "https://calendar.google.com/calendar/render");
  assert.equal(google.searchParams.get("text"), "Żółć & łąka — stand-up");
  assert.equal(google.searchParams.get("dates"), "20261121T183000Z/20261121T203000Z");
  assert.equal(google.searchParams.get("location"), "Klub Świt, Łódź");
  assert.equal(
    google.searchParams.get("details"),
    "https://bilety.example/łódź?bilet=1&miasto=Łódź\nhttps://parska.pl/wystep/15",
  );

  const outlook = new URL(links.outlook);
  assert.equal(outlook.origin + outlook.pathname, "https://outlook.live.com/calendar/0/action/compose");
  assert.equal(outlook.searchParams.get("subject"), "Żółć & łąka — stand-up");
  assert.equal(outlook.searchParams.get("startdt"), "2026-11-21T18:30:00.000Z");
  assert.equal(outlook.searchParams.get("enddt"), "2026-11-21T20:30:00.000Z");
  assert.equal(outlook.searchParams.get("body"), google.searchParams.get("details"));
  assert.equal(outlook.searchParams.get("location"), "Klub Świt, Łódź");
});

test("polish characters are percent-encoded in the href", () => {
  const links = calendarLinks(show);
  assert.ok(links.google);
  assert.ok(links.outlook);
  assert.doesNotMatch(links.google, /[ŻżŁłóąęśćńź—]/);
  assert.doesNotMatch(links.outlook, /[ŻżŁłóąęśćńź—]/);
  assert.match(links.google, /%26/);
  assert.match(links.outlook, /%26/);
  assert.match(links.google, /%C5%BB%C3%B3%C5%82%C4%87/);
  assert.match(links.google, /%C5%82%C3%B3d%C5%BA/);
  assert.match(links.outlook, /%C5%9Awit/);
});

test("a custom duration stays aligned with the ics end, and a bad start drops the web links", () => {
  const links = calendarLinks({ ...show, durationMinutes: 90 });
  const ics = buildEventIcs({ ...show, durationMinutes: 90, stampedAt });
  assert.match(links.google ?? "", /dates=20261121T183000Z\/20261121T200000Z/);
  assert.match(ics ?? "", /DTEND:20261121T200000Z/);

  const broken = calendarLinks({ ...show, startsAt: "nie-data" });
  assert.equal(broken.google, null);
  assert.equal(broken.outlook, null);
  assert.equal(broken.ics, "/api/wydarzenia/15/kalendarz");

  const untitled = calendarLinks({
    id: 4,
    title: "   ",
    startsAt: "2026-11-21T18:30:00.000Z",
    city: "Kraków",
    venue: "Studio",
    ticketUrl: "notaurl",
  });
  const google = new URL(untitled.google ?? "");
  assert.equal(google.searchParams.get("text"), "Kraków: Studio");
  assert.equal(google.searchParams.get("details"), "https://parska.pl/wystep/4");
  assert.equal(google.searchParams.get("location"), "Studio, Kraków");
});
