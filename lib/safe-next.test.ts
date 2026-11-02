import assert from "node:assert/strict";
import { test } from "node:test";
import { authCallbackUrl, safeNextPath } from "./safe-next.ts";

test("missing next lands on favorites", () => {
  assert.equal(safeNextPath(null), "/ulubione");
  assert.equal(safeNextPath("  "), "/ulubione");
});

test("in-app paths are kept, including query and hash", () => {
  assert.equal(safeNextPath("/konto?tab=push"), "/konto?tab=push");
  assert.equal(safeNextPath("/ulubione#tours"), "/ulubione#tours");
});

test("off-site targets are rejected", () => {
  assert.equal(safeNextPath("https://evil.example/phish"), "/ulubione");
  assert.equal(safeNextPath("//evil.example"), "/ulubione");
  assert.equal(safeNextPath("/\\evil.example"), "/ulubione");
  assert.equal(safeNextPath("https://parska.pl.evil.example"), "/ulubione");
});

test("callback URL uses the given origin and a safe next", () => {
  assert.equal(
    authCallbackUrl("https://parska.pl", "/ulubione"),
    "https://parska.pl/auth/callback?next=%2Fulubione",
  );
  assert.equal(
    authCallbackUrl("http://localhost:3000", "https://evil.example"),
    "http://localhost:3000/auth/callback?next=%2Fulubione",
  );
});
