import assert from "node:assert/strict";
import { test } from "node:test";
import { attendanceMode, goingCountLabel, shownGoingCount } from "./event-plans.ts";

const now = new Date("2026-11-21T18:00:00.000Z");

test("attended is only for events that have already started", () => {
  assert.equal(attendanceMode("2026-11-21T17:59:00.000Z", now), "attended");
  assert.equal(attendanceMode("2026-11-21T18:00:00.000Z", now), "attended");
  assert.equal(attendanceMode("2026-11-21T18:01:00.000Z", now), "going");
  assert.equal(attendanceMode("nie-data", now), "going");
});

test("the public count is a Polish phrase and hides zero", () => {
  assert.equal(goingCountLabel(0), null);
  assert.equal(goingCountLabel(-1), null);
  assert.equal(goingCountLabel(1), "Idzie 1 osoba");
  assert.equal(goingCountLabel(2), "Idą 2 osoby");
  assert.equal(goingCountLabel(4), "Idą 4 osoby");
  assert.equal(goingCountLabel(5), "Idzie 5 osób");
  assert.equal(goingCountLabel(12), "Idzie 12 osób");
  assert.equal(goingCountLabel(22), "Idą 22 osoby");
});

test("the reader's own toggle adjusts the aggregate without double counting", () => {
  assert.equal(shownGoingCount(3, true, true), 3);
  assert.equal(shownGoingCount(3, true, false), 2);
  assert.equal(shownGoingCount(3, false, true), 4);
  assert.equal(shownGoingCount(0, false, true), 1);
  assert.equal(shownGoingCount(1, true, false), 0);
});
