import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { isSameOriginSignOut } from "./sign-out.ts";

const button = readFileSync(new URL("../app/components/SignOutButton.tsx", import.meta.url), "utf8");
const route = readFileSync(new URL("../app/auth/signout/route.ts", import.meta.url), "utf8");
const provider = readFileSync(new URL("../app/components/LibraryProvider.tsx", import.meta.url), "utf8");

test("sign-out accepts only a same-origin POST", () => {
  const home = "https://parska.pl";
  assert.equal(
    isSameOriginSignOut({ origin: home, referer: null, requestOrigin: home }),
    true,
  );
  assert.equal(
    isSameOriginSignOut({
      origin: "https://evil.example",
      referer: home + "/ulubione",
      requestOrigin: home,
    }),
    false,
  );
  assert.equal(
    isSameOriginSignOut({ origin: null, referer: home + "/ulubione", requestOrigin: home }),
    true,
  );
  assert.equal(
    isSameOriginSignOut({ origin: "  ", referer: "https://evil.example/x", requestOrigin: home }),
    false,
  );
  assert.equal(
    isSameOriginSignOut({ origin: null, referer: null, requestOrigin: home }),
    false,
  );
  assert.equal(
    isSameOriginSignOut({ origin: null, referer: "not a url", requestOrigin: home }),
    false,
  );
});

test("POST /auth/signout clears the session cookie and hard-redirects home", () => {
  assert.match(route, /export async function POST/);
  assert.doesNotMatch(route, /export async function GET/);
  assert.match(route, /isSameOriginSignOut/);
  assert.match(route, /supabase\.auth\.signOut\(\{\s*scope:\s*"local"\s*\}\)/);
  assert.match(route, /Promise\.race/);
  assert.match(route, /setTimeout\(resolve, 4000\)/);
  assert.match(route, /catch/);
  assert.match(route, /response\.cookies\.set/);
  assert.match(route, /new URL\("\/", request\.url\)/);
  assert.match(route, /status:\s*303/);
  assert.doesNotMatch(route, /redirect\("\/"\)/);
});

test("every logout control uses the same POST and shows pending feedback", () => {
  assert.match(button, /action="\/auth\/signout"/);
  assert.match(button, /method="post"/);
  assert.match(button, /disabled=\{pending\}/);
  assert.match(button, /aria-busy=\{pending\}/);
  assert.match(button, /Wylogowuję…/);
  assert.match(button, /animate-spin/);
  assert.match(button, /clearAccountLibrary/);
  assert.match(button, /event\.preventDefault\(\)/);
  assert.match(button, /requestAnimationFrame/);
  assert.match(button, /form\.submit\(\)/);

  for (const file of [
    "../app/ulubione/page.tsx",
    "../app/components/AuthStatus.tsx",
    "../app/forbidden.tsx",
    "../app/admin/components/LogoutButton.tsx",
  ]) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.match(source, /SignOutButton/);
    assert.doesNotMatch(source, /auth\/actions/);
    assert.doesNotMatch(source, /supabase\.auth\.signOut/);
    assert.doesNotMatch(source, /router\.(push|refresh)/);
  }

  const drawer = readFileSync(new URL("../app/components/MobileDrawer.tsx", import.meta.url), "utf8");
  assert.match(drawer, /<AuthStatus variant="drawer"/);
  assert.match(drawer, /<AdminNavLink variant="drawer"/);
});

test("a signed-out browser drops the account library cache", () => {
  assert.match(provider, /clearAccountLibrary/);
  assert.match(provider, /INITIAL_SESSION/);
  assert.match(provider, /SIGNED_OUT/);
  assert.match(provider, /if \(!userId\)[\s\S]*clearAccountLibrary/);
});
