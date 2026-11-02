import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const sql = readFileSync(
  new URL("../supabase/migrations/20261102120000_user_accounts_stage1.sql", import.meta.url),
  "utf8",
);

test("admin seed inserts only when auth.users has exactly one row", () => {
  assert.match(sql, /\(select count\(\*\) from auth\.users\) = 1/);
  assert.match(sql, /id = \(select id from auth\.users order by created_at limit 1\)/);
  assert.doesNotMatch(sql, /from auth\.users limit 1/i);
});

test("is_admin is security definer, stable, and pins search_path", () => {
  assert.match(sql, /function public\.is_admin\(\)/);
  assert.match(sql, /stable/);
  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path = ''/);
});

test("favorite foreign keys use bigint, matching people.id and shows.id", () => {
  assert.match(sql, /person_id bigint not null references public\.people \(id\) on delete cascade/);
  assert.match(sql, /show_id bigint not null references public\.shows \(id\) on delete cascade/);
  assert.match(sql, /favorite_people_person_id_idx/);
  assert.match(sql, /favorite_shows_show_id_idx/);
});

test("authenticated is added to the catalog select policies and writes are revoked", () => {
  for (const table of [
    "content_items",
    "people",
    "shows",
    "tags",
    "content_tags",
    "categories",
    "sources",
    "show_default_people",
  ]) {
    assert.match(sql, new RegExp(`on public\\.${table}`));
  }
  assert.match(sql, /to anon, authenticated/);
  assert.match(sql, /status = 'approved'::text/);
  assert.match(sql, /is_active = true/);
  assert.match(sql, /revoke insert, update, delete on table public\.%I from anon, authenticated/);
  assert.match(sql, /'source_default_people'/);
});
