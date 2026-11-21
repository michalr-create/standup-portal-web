import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const sql = readFileSync(
  new URL("../supabase/migrations/20261121150000_user_accounts_stage2_places.sql", import.meta.url),
  "utf8",
);

test("home city is an optional profile column the user can update", () => {
  assert.match(sql, /add column if not exists home_city text/);
  assert.match(sql, /profiles_home_city_check/);
  assert.match(sql, /char_length\(btrim\(home_city\)\) between 1 and 80/);
  assert.match(sql, /grant update \(display_name, push_enabled, home_city\) on table public\.profiles to authenticated/);
});

test("reminders and attendance are own-row tables with user and event indexes", () => {
  for (const table of ["event_reminders", "event_attendance"]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(sql, new RegExp(`${table}_user_id_idx`));
    assert.match(sql, new RegExp(`${table}_event_id_idx`));
    assert.match(
      sql,
      new RegExp(`event_id bigint not null references public\\.events \\(id\\) on delete cascade`),
    );
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`revoke all on table public\\.${table} from anon, authenticated`));
    assert.match(sql, new RegExp(`grant all on table public\\.${table} to service_role`));
  }
  assert.match(sql, /grant select, insert, delete on table public\.event_reminders to authenticated/);
  assert.match(sql, /grant select, insert, update, delete on table public\.event_attendance to authenticated/);
  assert.match(sql, /status in \('going', 'attended'\)/);
  assert.match(sql, /attended_requires_past_event/);
  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path = ''/);
});

test("the public count function returns a counter and the reminder list is the caller's", () => {
  assert.match(sql, /function public\.going_counts\(event_ids bigint\[\]\)/);
  assert.match(sql, /any \(\(coalesce\(event_ids, '\{\}'::bigint\[\]\)\)\[1:200\]\)/);
  assert.doesNotMatch(sql, /any \(coalesce\(event_ids, '\{\}'::bigint\[\]\)\[1:200\]\)/);
  assert.match(sql, /going_count bigint/);
  assert.match(sql, /a\.status = 'going'/);
  assert.match(sql, /grant execute on function public\.going_counts\(bigint\[\]\) to anon, authenticated, service_role/);
  assert.match(sql, /function public\.my_event_reminders\(\)/);
  assert.match(sql, /r\.user_id = \(select auth\.uid\(\)\)/);
  assert.match(sql, /revoke all on function public\.my_event_reminders\(\) from public, anon/);
  assert.doesNotMatch(sql, /grant execute on function public\.going_counts\(bigint\[\]\) to public/);
});
