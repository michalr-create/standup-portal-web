import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const sql = readFileSync(
  new URL("../supabase/migrations/20261121160000_user_accounts_stage2_reports.sql", import.meta.url),
  "utf8",
);

test("reports are own-row inserts, admin can read and change status, and the day is capped", () => {
  assert.match(sql, /create table if not exists public\.content_reports/);
  assert.match(sql, /user_id uuid not null references auth\.users \(id\) on delete cascade/);
  assert.match(sql, /content_item_id bigint references public\.content_items \(id\) on delete set null/);
  assert.match(sql, /status text not null default 'new'/);
  assert.match(sql, /kind in \('missing_video', 'wrong_meta', 'new_open_mic'\)/);
  assert.match(sql, /content_reports_user_id_idx/);
  assert.match(sql, /content_reports_content_item_id_idx/);
  assert.match(sql, /alter table public\.content_reports enable row level security/);
  assert.match(sql, /for insert[\s\S]*with check \(\(select auth\.uid\(\)\) = user_id and status = 'new'\)/);
  assert.match(sql, /for select[\s\S]*auth\.uid\(\)\) = user_id or \(select public\.is_admin\(\)\)/);
  assert.match(sql, /for update[\s\S]*using \(\(select public\.is_admin\(\)\)\)/);
  assert.match(sql, /revoke all on table public\.content_reports from anon, authenticated/);
  assert.match(sql, /grant select, insert on table public\.content_reports to authenticated/);
  assert.match(sql, /grant update \(status\) on table public\.content_reports to authenticated/);
  assert.match(sql, /content_report_daily_limit/);
  assert.match(sql, /filed >= 10/);
  assert.match(sql, /Europe\/Warsaw/);
  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path = ''/);
  assert.doesNotMatch(sql, /grant [^;]* to anon;/);
});
