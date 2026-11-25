import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { shouldRefreshSession } from "./session-path.ts";
import {
  aliasLookupUrl,
  aliasRedirectUrl,
  aliasSection,
  canonicalFromAliasPayload,
  lookupAliasSlug,
} from "./slug-alias-middleware.ts";

test("only a single public standuper or format segment is an alias candidate", () => {
  assert.deepEqual(aliasSection("/standuper/ukasz-kowalski"), {
    section: "standuper",
    slug: "ukasz-kowalski",
  });
  assert.deepEqual(aliasSection("/format/micha-leja-show"), {
    section: "format",
    slug: "micha-leja-show",
  });
  assert.equal(aliasSection("/standuper/ukasz-kowalski/trasy"), null);
  assert.equal(aliasSection("/standuper"), null);
  assert.equal(aliasSection("/standuperzy/ukasz-kowalski"), null);
  assert.equal(aliasSection("/format/Micha"), null);
  assert.equal(aliasSection("/standuper/../admin"), null);
  assert.equal(aliasSection("/komik/ukasz-kowalski"), null);
});

test("the alias read is one filtered REST row and the redirect keeps the query", () => {
  const lookup = aliasLookupUrl("https://example.supabase.co/", "standuper", "ukasz-kowalski");
  const parsed = new URL(lookup);
  assert.equal(parsed.origin, "https://example.supabase.co");
  assert.equal(parsed.pathname, "/rest/v1/people_slug_aliases");
  assert.equal(parsed.searchParams.get("slug"), "eq.ukasz-kowalski");
  assert.equal(parsed.searchParams.get("select"), "people(slug)");
  assert.equal(parsed.searchParams.get("limit"), "1");

  const show = new URL(aliasLookupUrl("https://example.supabase.co", "format", "micha-leja-show"));
  assert.equal(show.pathname, "/rest/v1/show_slug_aliases");
  assert.equal(show.searchParams.get("select"), "shows(slug)");

  assert.equal(
    canonicalFromAliasPayload([{ people: { slug: "lukasz-kowalski" } }], "people"),
    "lukasz-kowalski",
  );
  assert.equal(
    canonicalFromAliasPayload([{ shows: [{ slug: "michal-leja-show" }] }], "shows"),
    "michal-leja-show",
  );
  assert.equal(canonicalFromAliasPayload([], "people"), null);
  assert.equal(canonicalFromAliasPayload({ message: "nope" }, "people"), null);
  assert.equal(canonicalFromAliasPayload([{ people: { slug: "../admin" } }], "people"), null);

  const target = aliasRedirectUrl(
    new URL("https://parska.pl/standuper/ukasz-kowalski?page=2&utm=x"),
    "standuper",
    "ukasz-kowalski",
    "lukasz-kowalski",
  );
  assert.equal(target?.pathname, "/standuper/lukasz-kowalski");
  assert.equal(target?.search, "?page=2&utm=x");
  assert.equal(
    aliasRedirectUrl(
      new URL("https://parska.pl/standuper/lukasz-kowalski"),
      "standuper",
      "lukasz-kowalski",
      "lukasz-kowalski",
    ),
    null,
  );
  assert.equal(
    aliasRedirectUrl(new URL("https://parska.pl/standuper/ukasz-kowalski"), "standuper", "ukasz-kowalski", null),
    null,
  );
});

test("a live slug is remembered as a miss and an alias resolves once", async () => {
  const calls: string[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    calls.push(String(input));
    const url = String(input);
    if (url.includes("ukasz-kowalski")) {
      return new Response(JSON.stringify([{ people: { slug: "lukasz-kowalski" } }]), { status: 200 });
    }
    return new Response("[]", { status: 200 });
  }) as typeof fetch;

  try {
    const env = { url: "https://example.supabase.co", key: "anon" };
    assert.equal(await lookupAliasSlug("standuper", "lukasz-kowalski", env), null);
    assert.equal(await lookupAliasSlug("standuper", "lukasz-kowalski", env), null);
    assert.equal(await lookupAliasSlug("standuper", "ukasz-kowalski", env), "lukasz-kowalski");
    assert.equal(await lookupAliasSlug("standuper", "ukasz-kowalski", env), "lukasz-kowalski");
    assert.equal(calls.length, 2);
  } finally {
    globalThis.fetch = original;
  }
});

test("middleware returns 308 before the session refresh and does not refresh public profiles", () => {
  const source = readFileSync(new URL("../middleware.ts", import.meta.url), "utf8");
  const body = source.slice(source.indexOf("export async function middleware"));
  assert.ok(body.indexOf("historicalSlugRedirect") < body.indexOf("shouldRefreshSession"));
  assert.match(source, /NextResponse\.redirect\(target, 308\)/);
  assert.match(source, /"\/standuper\/:slug"/);
  assert.match(source, /"\/format\/:slug"/);
  assert.doesNotMatch(source, /permanentRedirect\(/);
  assert.equal(shouldRefreshSession("/standuper/ukasz-kowalski"), false);
  assert.equal(shouldRefreshSession("/format/micha-leja-show"), false);
});
