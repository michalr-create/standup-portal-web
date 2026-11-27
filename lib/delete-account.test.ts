import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import {
  DELETE_ACCOUNT_PHRASE,
  DELETED_ACCOUNT_PATH,
  confirmationMatches,
  postDeleteAccount,
  type DeleteUserResult,
  type DeletionDeps,
} from "./delete-account.ts";

const HOME = "https://parska.pl";
const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";

function deps(overrides: Partial<DeletionDeps> & { onDelete?: (userId: string) => void } = {}): DeletionDeps & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    getUserId: overrides.getUserId ?? (async () => USER_ID),
    deleteUser: overrides.deleteUser ?? (async (userId) => {
      calls.push(userId);
      overrides.onDelete?.(userId);
      return { ok: true } satisfies DeleteUserResult;
    }),
  };
}

function request(partial: { confirmation?: string; accept?: string | null; origin?: string | null } = {}) {
  return {
    origin: partial.origin === undefined ? HOME : partial.origin,
    referer: null,
    requestOrigin: HOME,
    accept: partial.accept === undefined ? "application/json" : partial.accept,
    confirmation: partial.confirmation ?? DELETE_ACCOUNT_PHRASE,
  };
}

test("account deletion API rejects a missing session", async () => {
  const used = deps({ getUserId: async () => null });
  const outcome = await postDeleteAccount(request(), used);
  assert.equal(outcome.status, 401);
  assert.equal(outcome.error, "unauthorized");
  assert.equal(outcome.signOut, false);
  assert.equal(outcome.location, undefined);
  assert.deepEqual(used.calls, []);
});

test("account deletion API rejects the wrong confirmation and does not delete", async () => {
  for (const confirmation of ["", "usun", "USUN", "usuń", "USUŃ konto", `${OTHER_ID}`, `USUŃ ${OTHER_ID}`]) {
    const used = deps();
    const outcome = await postDeleteAccount(request({ confirmation }), used);
    assert.equal(outcome.status, 400, confirmation);
    assert.equal(outcome.error, "confirmation");
    assert.equal(outcome.signOut, false);
    assert.deepEqual(used.calls, []);
  }
  assert.equal(confirmationMatches(`  ${DELETE_ACCOUNT_PHRASE}\n`), true);
  assert.equal(confirmationMatches(DELETE_ACCOUNT_PHRASE), true);
});

test("account deletion API deletes only the authenticated user", async () => {
  const used = deps();
  const outcome = await postDeleteAccount(
    request({ accept: "text/html,application/xhtml+xml", confirmation: `  ${DELETE_ACCOUNT_PHRASE}  ` }),
    used,
  );
  assert.equal(outcome.status, 303);
  assert.equal(outcome.location, DELETED_ACCOUNT_PATH);
  assert.equal(outcome.signOut, true);
  assert.deepEqual(used.calls, [USER_ID]);
  assert.equal(used.calls.includes(OTHER_ID), false);
});

test("a failed delete stays signed in and a missing auth user still signs out", async () => {
  const failed = deps({
    deleteUser: async () => ({ ok: false }),
  });
  const failure = await postDeleteAccount(request(), failed);
  assert.equal(failure.status, 500);
  assert.equal(failure.error, "delete_failed");
  assert.equal(failure.signOut, false);

  const thrown = deps({
    deleteUser: async () => {
      throw new Error("other-user@example.com");
    },
  });
  const boom = await postDeleteAccount(request(), thrown);
  assert.equal(boom.status, 500);
  assert.equal(boom.error, "delete_failed");
  assert.equal(JSON.stringify(boom).includes("other-user"), false);

  const gone = deps({
    deleteUser: async (userId) => {
      assert.equal(userId, USER_ID);
      return { ok: true, missing: true };
    },
  });
  const already = await postDeleteAccount(request({ accept: "text/html" }), gone);
  assert.equal(already.status, 303);
  assert.equal(already.location, DELETED_ACCOUNT_PATH);
  assert.equal(already.signOut, true);
});

test("a cross-site form cannot delete the account", async () => {
  const jsonDeps = deps();
  const json = await postDeleteAccount(request({ origin: "https://evil.example" }), jsonDeps);
  assert.equal(json.status, 403);
  assert.equal(json.error, "forbidden");
  assert.equal(json.signOut, false);
  assert.deepEqual(jsonDeps.calls, []);

  const htmlDeps = deps();
  const html = await postDeleteAccount(
    request({ origin: "https://evil.example", accept: "text/html" }),
    htmlDeps,
  );
  assert.equal(html.status, 303);
  assert.equal(html.location, "/");
  assert.equal(html.signOut, false);
  assert.deepEqual(htmlDeps.calls, []);
});

test("a browser form is redirected instead of receiving a raw error code", async () => {
  const loggedOut = deps({ getUserId: async () => null });
  const html = await postDeleteAccount(request({ accept: "text/html" }), loggedOut);
  assert.equal(html.status, 303);
  assert.equal(html.location, "/zaloguj?next=/ulubione");
  assert.equal(html.signOut, false);

  const wrong = await postDeleteAccount(
    request({ accept: "text/html,application/xhtml+xml", confirmation: "nie" }),
    deps(),
  );
  assert.equal(wrong.status, 303);
  assert.equal(wrong.location, "/ulubione?usuniecie=potwierdzenie");
});

test("the route uses the session id and the service role only on the server", () => {
  const route = readFileSync(new URL("../app/auth/usun-konto/route.ts", import.meta.url), "utf8");
  assert.match(route, /export async function POST/);
  assert.doesNotMatch(route, /export async function GET/);
  assert.match(route, /postDeleteAccount/);
  assert.match(route, /supabase\.auth\.getUser\(\)/);
  assert.match(route, /return data\.user\?\.id \?\? null/);
  assert.match(route, /getAdminSupabase\(\)\.auth\.admin\.deleteUser\(userId, false\)/);
  assert.match(route, /if \(outcome\.signOut\)/);
  assert.match(route, /supabase\.auth\.signOut\(\{\s*scope:\s*"local"\s*\}\)/);
  assert.match(route, /form\.get\("confirmation"\)/);
  assert.match(route, /"confirmation" in body/);
  assert.doesNotMatch(route, /form\.get\("user/);
  assert.doesNotMatch(route, /body\.user|userId"\s*:|"user_id"/);
  assert.match(route, /status === 404 \|\| code === "user_not_found"/);
  assert.match(route, /console\.error\("account delete failed"/);
  assert.doesNotMatch(route, /error\.message/);

  const ui = readFileSync(new URL("../app/ulubione/DeleteAccount.tsx", import.meta.url), "utf8");
  const page = readFileSync(new URL("../app/ulubione/page.tsx", import.meta.url), "utf8");
  assert.match(page, /<DeleteAccount \/>/);
  assert.match(ui, /Usuń konto/);
  assert.match(ui, /action="\/auth\/usun-konto"/);
  assert.match(ui, /method="post"/);
  assert.match(ui, /name="confirmation"/);
  assert.match(ui, /pattern=\{DELETE_ACCOUNT_PHRASE\}/);
  assert.match(ui, /Wpisz USUŃ, żeby potwierdzić/);
  assert.match(ui, /typed\.trim\(\) !== DELETE_ACCOUNT_PHRASE/);
  assert.match(ui, /library\.signedIn/);
  assert.doesNotMatch(ui, /supabase-admin|SUPABASE_SERVICE_KEY|auth\.admin\.deleteUser/);
  assert.doesNotMatch(page, /supabase-admin|SUPABASE_SERVICE_KEY/);

  const done = readFileSync(new URL("../app/konto/usuniete/page.tsx", import.meta.url), "utf8");
  assert.match(done, /Konto zostało usunięte/);
  assert.match(done, /noindexMetadata/);
  assert.match(done, /href="\/"/);
});

test("every foreign key to auth.users cascades on delete", () => {
  const dir = new URL("../supabase/migrations/", import.meta.url);
  const files = readdirSync(dir).filter((name) => name.endsWith(".sql"));
  let refs = 0;
  for (const name of files) {
    const sql = readFileSync(new URL(name, dir), "utf8");
    const matches = sql.match(/references\s+auth\.users\s*\(\s*id\s*\)[^,\n]*/gi) ?? [];
    for (const match of matches) {
      refs += 1;
      assert.match(match, /on delete cascade/i, `${name}: ${match}`);
    }
  }
  assert.ok(refs >= 12, `expected the account tables to reference auth.users, found ${refs}`);
});
