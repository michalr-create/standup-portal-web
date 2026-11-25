import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const sql = readFileSync(
  new URL("../supabase/migrations/20261125210000_public_past_events_and_source_people.sql", import.meta.url),
  "utf8",
);

test("past public shows stay readable and YouTube links can be joined", () => {
  assert.match(sql, /status in \('on_sale', 'sold_out'\)/);
  assert.doesNotMatch(sql, /starts_at/);
  assert.match(sql, /Public can read listed events/);
  assert.match(sql, /Public can read listed event ticket links/);
  assert.match(sql, /Public can read listed event people/);
  assert.match(sql, /to_regclass\('public\.event_people'\)/);
  assert.match(sql, /Public can read source default people/);
  assert.match(sql, /on public\.source_default_people/);
  assert.match(sql, /to anon, authenticated/);
  assert.match(sql, /using \(true\)/);
  assert.doesNotMatch(sql, /grant insert|grant update|grant delete|for insert|for update|for delete/i);
  assert.doesNotMatch(sql, /cancelled/);
});
