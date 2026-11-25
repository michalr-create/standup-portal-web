import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { RESERVED_CONTENT_SLUGS } from "./slugify.ts";

const sql = readFileSync(
  new URL("../supabase/migrations/20261125190000_content_items_special_slug.sql", import.meta.url),
  "utf8",
);

test("the special slug migration is idempotent and skips the duplicate row", () => {
  assert.match(sql, /add column if not exists slug text/i);
  assert.match(sql, /create unique index if not exists content_items_slug_key/);
  assert.match(sql, /where slug is not null/);
  assert.match(sql, /status = 'approved'/);
  assert.match(sql, /merged_into_id is null/);
  assert.match(sql, /t\.slug = 'special'/);
  assert.match(sql, /t\.tag_type = 'topic'/);
  assert.match(sql, /ci\.id <> 47/);
  assert.match(sql, /where id = 47/);
  assert.match(sql, /translate\(lower\(input\), 'Łł', 'll'\)/);
  assert.match(sql, /normalize\([\s\S]*nfd\)/);
  assert.match(sql, /cp between 768 and 879/);
  assert.match(sql, /\[a-z0-9\]\+\(\?:-\[a-z0-9\]\+\)\*/);
  for (const reserved of RESERVED_CONTENT_SLUGS) {
    assert.match(sql, new RegExp(`'${reserved}'`));
  }
  assert.match(sql, /base \|\| '-' \|\| rec\.id::text/);
  assert.doesNotMatch(sql, /display_title/);
});
