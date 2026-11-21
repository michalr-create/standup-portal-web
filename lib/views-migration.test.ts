import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const sql = readFileSync(
  new URL("../supabase/migrations/20261121180000_content_view_snapshots.sql", import.meta.url),
  "utf8",
);

test("snapshots keep one view total per item per day and are public to read", () => {
  assert.match(sql, /create table if not exists public\.content_view_snapshots/);
  assert.match(
    sql,
    /content_item_id bigint not null references public\.content_items \(id\) on delete cascade/,
  );
  assert.match(sql, /captured_on date not null/);
  assert.match(sql, /view_count bigint not null/);
  assert.match(sql, /captured_at timestamptz not null default now\(\)/);
  assert.match(sql, /primary key \(content_item_id, captured_on\)/);
  assert.match(sql, /content_view_snapshots_captured_on_idx[\s\S]*\(captured_on\)/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /for select[\s\S]*to anon, authenticated[\s\S]*using \(true\)/);
  assert.match(sql, /grant select on table public\.content_view_snapshots to anon, authenticated/);
  assert.match(sql, /grant all on table public\.content_view_snapshots to service_role/);
  assert.doesNotMatch(sql, /delete from public\.content_view_snapshots/i);
  assert.doesNotMatch(sql, /for insert/);
  assert.doesNotMatch(sql, /for update/);
  assert.doesNotMatch(sql, /for delete/);
});

test("weekly gain is cumulative from the oldest snapshot in the window", () => {
  assert.match(sql, /function public\.ranking_views_gain/);
  assert.match(sql, /p_days integer default 7/);
  assert.match(sql, /p_limit integer default 10/);
  assert.match(sql, /p_scope text default 'all'/);
  assert.match(sql, /least\(p\.days, \(p\.today - m\.base_on\) \+ 1\)/);
  assert.match(sql, /coalesce\(m\.snapshot_days, 0\) >= 2/);
  assert.match(sql, /w\.captured_on < p\.today/);
  assert.match(sql, /\(v\.view_count - b\.base_view_count\) as gain/);
  assert.match(sql, /v\.view_count - b\.base_view_count\)::numeric \* 100/);
  assert.match(sql, /greatest\(coalesce\(p_min_base, 0\), 20000\)/);
  assert.match(sql, /p\.scope = 'all'[\s\S]*v\.category_slug = 'standup'[\s\S]*v\.is_special/);
  assert.match(sql, /window_days/);
  assert.match(sql, /grant execute on function public\.ranking_views_gain\(integer, integer, text, text, bigint\) to anon, authenticated, service_role/);
});

test("other rankings skip shorts and merged rows, and the worker owns later snapshots", () => {
  assert.match(sql, /ci\.merged_into_id is null/);
  assert.match(sql, /coalesce\(c\.slug, ''\) <> 'shorts'/);
  assert.match(sql, /t\.slug = 'special'/);
  assert.match(sql, /function public\.ranking_classics/);
  assert.match(sql, /function public\.ranking_month/);
  assert.match(sql, /function public\.ranking_specials_year/);
  assert.match(sql, /function public\.ranking_people_views/);
  assert.match(sql, /function public\.ranking_people_specials/);
  const parts = readFileSync(
    new URL("../supabase/migrations/20261121210000_program_parts_and_profile_indexes.sql", import.meta.url),
    "utf8",
  );
  assert.match(parts, /show_default_people_person_id_idx/);
  assert.match(parts, /events_person_listed_starts_idx/);
  assert.match(parts, /content_items_show_approved_published_idx/);
  assert.match(parts, /function public\.program_part_keys/);
  assert.match(parts, /count\(distinct program_key\)/);
  assert.match(parts, /program BENSHI/);
  assert.doesNotMatch(parts, /apply_migration/);
  assert.match(sql, /function public\.ranking_shows/);
  assert.match(sql, /security definer/);
  assert.match(sql, /revoke all on function public\.capture_content_view_snapshots\(date\) from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.capture_content_view_snapshots\(date\) to service_role/);
  assert.match(sql, /select public\.capture_content_view_snapshots\(null\)/);
  assert.match(sql, /on conflict \(content_item_id, captured_on\) do update/);
});
