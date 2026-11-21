import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const sql = readFileSync(
  new URL("../supabase/migrations/20261121170000_user_accounts_stage3_push.sql", import.meta.url),
  "utf8",
);

test("push tables are idempotent, locked to the owner, and anonymous clients get no writes", () => {
  for (const table of ["push_subscriptions", "notification_prefs", "notification_log", "push_cursor"]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated`));
    assert.match(sql, new RegExp(`grant all on table public\\.${table} to service_role`));
  }
  assert.doesNotMatch(sql, /grant [^;]* to anon/);
  assert.match(sql, /endpoint text not null/);
  assert.match(sql, /constraint push_subscriptions_endpoint_key unique \(endpoint\)/);
  assert.match(sql, /p256dh text not null/);
  assert.match(sql, /auth text not null/);
  assert.match(sql, /user_agent text/);
  assert.match(sql, /last_success_at timestamptz/);
  assert.match(sql, /failure_count integer not null default 0/);
  assert.match(sql, /push_subscriptions_user_id_idx/);
  assert.match(sql, /user_id uuid not null references auth\.users \(id\) on delete cascade/);
});

test("notification prefs default to on and only the owner can change them", () => {
  for (const column of ["new_content_favorites", "events_home_city", "events_favorites", "event_reminders"]) {
    assert.match(sql, new RegExp(`${column} boolean not null default true`));
  }
  assert.match(sql, /grant update \(\s*new_content_favorites/);
  assert.match(sql, /on public\.notification_prefs[\s\S]*for update[\s\S]*to authenticated/);
  assert.match(sql, /with check \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.doesNotMatch(sql, /quiet/);
});

test("the log dedupes a user, kind, and subject, and authenticated clients cannot write it", () => {
  assert.match(sql, /constraint notification_log_user_kind_ref_key unique \(user_id, kind, ref_id\)/);
  assert.match(sql, /kind in \('new_content', 'new_event', 'event_reminder'\)/);
  assert.match(sql, /sent_at timestamptz not null default now\(\)/);
  assert.doesNotMatch(sql, /grant [^;]* on table public\.notification_log to authenticated/);
  assert.doesNotMatch(sql, /grant [^;]* on table public\.push_cursor to authenticated/);
  assert.doesNotMatch(sql, /on public\.notification_log[\s\S]*for insert/);
  assert.doesNotMatch(sql, /on public\.push_cursor[\s\S]*for insert/);
});

test("the cursor lease is service-role only and approvals are stamped without backdating the catalog", () => {
  assert.match(sql, /lease_until timestamptz/);
  assert.match(sql, /function public\.acquire_push_lease\(p_lease_until timestamptz\)/);
  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /c\.id = 'dispatch'/);
  assert.match(sql, /revoke all on function public\.acquire_push_lease\(timestamptz\) from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.acquire_push_lease\(timestamptz\) to service_role/);
  assert.match(sql, /add column if not exists approved_at timestamptz/);
  assert.match(sql, /set approved_at = coalesce\(created_at, now\(\)\)/);
  assert.match(sql, /where status = 'approved'/);
  assert.match(sql, /and approved_at is null/);
  assert.match(sql, /function public\.stamp_content_approved_at\(\)/);
  assert.match(sql, /new\.approved_at := now\(\)/);
  assert.match(sql, /content_items_stamp_approved_at/);
  assert.match(sql, /before insert or update of status, merged_into_id, approved_at/);
  assert.match(sql, /content_items_approved_dispatch_idx/);
  assert.match(sql, /events_created_at_idx/);
});

test("subscription writes for signed-in users stay on their own row and failure bookkeeping is not theirs", () => {
  assert.match(sql, /on public\.push_subscriptions[\s\S]*for select[\s\S]*to authenticated/);
  assert.match(sql, /on public\.push_subscriptions[\s\S]*for insert[\s\S]*with check \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(sql, /on public\.push_subscriptions[\s\S]*for delete[\s\S]*using \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(sql, /grant update \(p256dh, auth, user_agent\) on table public\.push_subscriptions to authenticated/);
  assert.doesNotMatch(sql, /grant update \(failure_count/);
  assert.match(sql, /endpoint like 'https:\/\/%'/);
});
