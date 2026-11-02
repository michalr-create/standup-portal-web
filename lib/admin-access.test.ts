import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { adminGate, readAdminAccess } from "./admin-access.ts";

const user = { id: "user-1", email: "michal@example.com", app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: "" };

test("no user is sent to login", () => {
  assert.equal(adminGate(null, false), "login");
  assert.equal(adminGate(null, true), "login");
});

test("a signed-in user who is not on the allowlist is forbidden", () => {
  assert.equal(adminGate("user-1", false), "forbidden");
});

test("an allowlisted user is allowed", () => {
  assert.equal(adminGate("user-1", true), "allow");
});

test("readAdminAccess calls is_admin and fails closed", async () => {
  const calls: string[] = [];
  const denied = await readAdminAccess({
    auth: {
      getUser: async () => ({ data: { user: user as never }, error: null }),
    },
    rpc: async (fn) => {
      calls.push(fn);
      return { data: false, error: null };
    },
  });
  assert.deepEqual(calls, ["is_admin"]);
  assert.equal(denied.gate, "forbidden");

  const broken = await readAdminAccess({
    auth: {
      getUser: async () => ({ data: { user: user as never }, error: null }),
    },
    rpc: async () => ({ data: null, error: { message: "function missing" } }),
  });
  assert.equal(broken.gate, "forbidden");

  const thrown = await readAdminAccess({
    auth: {
      getUser: async () => ({ data: { user: user as never }, error: null }),
    },
    rpc: async () => {
      throw new Error("network");
    },
  });
  assert.equal(thrown.gate, "forbidden");

  const allowed = await readAdminAccess({
    auth: {
      getUser: async () => ({ data: { user: user as never }, error: null }),
    },
    rpc: async () => ({ data: true, error: null }),
  });
  assert.equal(allowed.gate, "allow");
  assert.equal(allowed.user?.id, "user-1");
});

test("admin entry points use the allowlist helper", () => {
  const layout = readFileSync(new URL("../app/admin/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /getAdminAccess/);
  assert.match(layout, /forbidden\(/);
  assert.match(layout, /redirect\("\/admin\/login"\)/);

  for (const file of ["actions.ts", "actions-sources.ts", "actions-fetch.ts"]) {
    const source = readFileSync(new URL(`../app/admin/${file}`, import.meta.url), "utf8");
    assert.match(source, /import \{ requireAuth \} from "@\/lib\/admin-auth"/);
    assert.doesNotMatch(source, /async function requireAuth/);
    assert.doesNotMatch(source, /getCurrentUser/);
  }

  const helper = readFileSync(new URL("./admin-auth.ts", import.meta.url), "utf8");
  assert.match(helper, /readAdminAccess/);
  assert.match(helper, /forbidden\(/);
});
