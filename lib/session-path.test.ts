import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { shouldRefreshSession } from "./session-path.ts";

test("session refresh is limited to account and admin paths", () => {
  for (const path of ["/admin", "/admin/login", "/zaloguj", "/auth/callback", "/ulubione", "/konto", "/konto/push"]) {
    assert.equal(shouldRefreshSession(path), true, path);
  }
  for (const path of ["/", "/standup", "/formaty", "/standuperzy", "/administrator", "/ulubione-archiwum"]) {
    assert.equal(shouldRefreshSession(path), false, path);
  }
});

test("middleware matcher is the same prefix list and still sets x-pathname", () => {
  const source = readFileSync(new URL("../middleware.ts", import.meta.url), "utf8");
  assert.match(source, /x-pathname/);
  assert.match(source, /getClaims\(\)/);
  assert.match(source, /shouldRefreshSession/);
  assert.doesNotMatch(source, /matcher:\s*\[\s*"\/:path\*"/);
  for (const path of ["/admin", "/admin/:path*", "/zaloguj", "/auth/:path*", "/ulubione", "/konto", "/konto/:path*"]) {
    assert.match(source, new RegExp(path.replace(/[/*]/g, "\\$&")));
  }
});

test("the public layout does not read cookies or headers", () => {
  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /AuthStatus/);
  assert.doesNotMatch(layout, /cookies\(/);
  assert.doesNotMatch(layout, /headers\(/);
  const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(page, /cookies\(/);
  assert.doesNotMatch(page, /headers\(/);
  const login = readFileSync(new URL("../app/zaloguj/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(login, /cookies\(/);
  assert.doesNotMatch(login, /headers\(/);
});
