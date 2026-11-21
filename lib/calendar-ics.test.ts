import assert from "node:assert/strict";
import { test } from "node:test";
import { buildEventIcs, escapeIcs } from "./calendar-ics.ts";

const stampedAt = new Date("2026-11-21T10:00:00.000Z");

test("a single event becomes a calendar file with a two hour slot", () => {
  const ics = buildEventIcs({
    id: 15,
    title: "Wentyl, Kraków",
    startsAt: "2026-11-21T18:30:00.000Z",
    city: "Kraków",
    venue: "Studio",
    ticketUrl: "https://goingapp.pl/w",
    stampedAt,
  });
  assert.ok(ics);
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /PRODID:-\/\/parska\.pl\/\/trasy\/\/PL/);
  assert.match(ics, /UID:event-15@parska\.pl/);
  assert.match(ics, /DTSTAMP:20261121T100000Z/);
  assert.match(ics, /DTSTART:20261121T183000Z/);
  assert.match(ics, /DTEND:20261121T203000Z/);
  assert.match(ics, /SUMMARY:Wentyl\\, Kraków/);
  assert.match(ics, /LOCATION:Studio\\, Kraków/);
  assert.match(ics, /URL:https:\/\/goingapp\.pl\/w/);
  assert.match(ics, /END:VEVENT\r\nEND:VCALENDAR\r\n$/);
  assert.equal(escapeIcs("a\nb;c"), "a\\nb\\;c");
});

test("a bad start does not produce a calendar file", () => {
  assert.equal(
    buildEventIcs({
      id: 1,
      title: "Wentyl",
      startsAt: "nie-data",
      city: "Kraków",
      venue: "Studio",
      stampedAt,
    }),
    null,
  );
  assert.equal(
    buildEventIcs({
      id: 0,
      title: "Wentyl",
      startsAt: "2026-11-21T18:30:00.000Z",
      city: "Kraków",
      venue: "Studio",
      stampedAt,
    }),
    null,
  );
});
