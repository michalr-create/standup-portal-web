import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatGain,
  formatGainPct,
  formatViewCount,
  formatViews,
  odcinekLabel,
  programLabel,
} from "./view-count.ts";

test("formatViewCount uses Polish compact units", () => {
  assert.equal(formatViewCount(Number.NaN), "");
  assert.equal(formatViewCount(-1), "");
  assert.equal(formatViewCount(0), "0");
  assert.equal(formatViewCount(1), "1");
  assert.equal(formatViewCount(999), "999");
  assert.equal(formatViewCount(1000), "1 tys.");
  assert.equal(formatViewCount(1200), "1,2 tys.");
  assert.equal(formatViewCount(1250), "1,3 tys.");
  assert.equal(formatViewCount(12_000), "12 tys.");
  assert.equal(formatViewCount(12_500), "12,5 tys.");
  assert.equal(formatViewCount(20_000), "20 tys.");
  assert.equal(formatViewCount(1_000_000), "1 mln");
  assert.equal(formatViewCount(1_200_000), "1,2 mln");
  assert.equal(formatViewCount(47_426_570), "47,4 mln");
  assert.equal(formatViewCount(999_950), "1 mln");
  assert.equal(formatViewCount(1_234), "1,2 tys.");
  assert.equal(formatViewCount(12_340), "12,3 tys.");
});

test("formatViews picks the Polish noun", () => {
  assert.equal(formatViews(1), "1 wy\u015bwietlenie");
  assert.equal(formatViews(2), "2 wy\u015bwietlenia");
  assert.equal(formatViews(5), "5 wy\u015bwietle\u0144");
  assert.equal(formatViews(22), "22 wy\u015bwietlenia");
  assert.equal(formatViews(1_200_000), "1,2 mln wy\u015bwietle\u0144");
});

test("gain labels keep a sign", () => {
  assert.equal(formatGain(86_000), "+86 tys.");
  assert.equal(formatGain(1_200_000), "+1,2 mln");
  assert.equal(formatGainPct(3.36), "+3,4%");
  assert.equal(formatGainPct(32.4), "+32%");
  assert.equal(formatGainPct(1240), "+1\u00a0240%");
});

test("program and episode plurals", () => {
  assert.equal(programLabel(1), "program");
  assert.equal(programLabel(3), "programy");
  assert.equal(programLabel(5), "program\u00f3w");
  assert.equal(programLabel(12), "program\u00f3w");
  assert.equal(odcinekLabel(1), "odcinek");
  assert.equal(odcinekLabel(4), "odcinki");
  assert.equal(odcinekLabel(11), "odcink\u00f3w");
});
