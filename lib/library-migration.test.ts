import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const sql = readFileSync(
  new URL("../supabase/migrations/20261121140000_user_accounts_stage2_library.sql", import.meta.url),
  "utf8",
);

test("watched and watch later use bigint content ids, own-row RLS, and user plus FK indexes", () => {
  for (const table of ["watched_items", "watch_later"]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(
      sql,
      new RegExp(
        `${table} \\([\\s\\S]*user_id uuid not null references auth\\.users \\(id\\) on delete cascade[\\s\\S]*content_item_id bigint not null references public\\.content_items \\(id\\) on delete cascade[\\s\\S]*primary key \\(user_id, content_item_id\\)`,
      ),
    );
    assert.match(sql, new RegExp(`${table}_user_id_idx`));
    assert.match(sql, new RegExp(`${table}_content_item_id_idx`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`on public\\.${table}[\\s\\S]*for select[\\s\\S]*to authenticated[\\s\\S]*auth\\.uid\\(\\)\\) = user_id`));
    assert.match(sql, new RegExp(`on public\\.${table}[\\s\\S]*for insert[\\s\\S]*with check \\(\\(select auth\\.uid\\(\\)\\) = user_id\\)`));
    assert.match(sql, new RegExp(`on public\\.${table}[\\s\\S]*for delete[\\s\\S]*using \\(\\(select auth\\.uid\\(\\)\\) = user_id\\)`));
    assert.match(sql, new RegExp(`revoke all on table public\\.${table} from anon, authenticated`));
    assert.match(sql, new RegExp(`grant select, insert, delete on table public\\.${table} to authenticated`));
    assert.match(sql, new RegExp(`grant all on table public\\.${table} to service_role`));
  }
});

test("anonymous clients are not granted writes on the library tables", () => {
  assert.doesNotMatch(sql, /grant [^;]* to anon/);
  assert.doesNotMatch(sql, /for update/);
});
