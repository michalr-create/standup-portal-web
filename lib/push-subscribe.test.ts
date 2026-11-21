import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { planPushSubscribe } from "./push-subscribe.ts";

test("an endpoint owned by someone else is not rewritten", () => {
  const me = "11111111-1111-4111-8111-111111111111";
  const them = "22222222-2222-4222-8222-222222222222";
  assert.equal(planPushSubscribe(null, me), "insert");
  assert.equal(planPushSubscribe(me, me), "update");
  assert.equal(planPushSubscribe(them, me), "reject");
  assert.equal(planPushSubscribe("", me), "reject");
});

test("subscribe updates only the caller's row and never upserts on the endpoint", () => {
  const route = readFileSync(new URL("../app/api/push/subscribe/route.ts", import.meta.url), "utf8");
  assert.match(route, /planPushSubscribe/);
  assert.doesNotMatch(route, /upsert/);
  const keysBlock = route.match(/const keys = \{[\s\S]*?\};/);
  assert.ok(keysBlock);
  assert.match(keysBlock[0], /failure_count: 0/);
  assert.doesNotMatch(keysBlock[0], /user_id/);
  assert.match(route, /\.update\(keys\)[\s\S]*?\.eq\("endpoint", parsed\.endpoint\)[\s\S]*?\.eq\("user_id", user\.id\)/);
  assert.match(route, /user_id: user\.id/);
  assert.match(route, /status: 409/);
  assert.match(route, /23505/);
  assert.doesNotMatch(route, /onConflict/);
});
