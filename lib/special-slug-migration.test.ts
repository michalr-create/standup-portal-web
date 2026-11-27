import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { RESERVED_CONTENT_SLUGS } from "./slugify.ts";

const sql = readFileSync(
  new URL("../supabase/migrations/20261125190000_content_items_special_slug.sql", import.meta.url),
  "utf8",
);

/** Words baked into the already-applied backfill. Later reservations live in a newer migration. */
const BACKFILL_RESERVED = ["admin", "api", "dodaj", "feed", "index", "page", "robots", "rss", "sitemap"];

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
  for (const reserved of BACKFILL_RESERVED) {
    assert.match(sql, new RegExp(`'${reserved}'`));
  }
  for (const reserved of ["2026", "najlepsze", "za-darmo"]) {
    assert.equal(RESERVED_CONTENT_SLUGS.includes(reserved as (typeof RESERVED_CONTENT_SLUGS)[number]), true);
    assert.doesNotMatch(sql, new RegExp(`'${reserved}'`));
  }
  const followUp = readFileSync(
    new URL("../supabase/migrations/20261126220000_reserved_content_slugs.sql", import.meta.url),
    "utf8",
  );
  for (const reserved of ["2026", "najlepsze", "za-darmo"]) {
    assert.match(followUp, new RegExp(`'${reserved}'`));
  }
  assert.match(followUp, /update public\.content_items/);
  assert.match(sql, /base \|\| '-' \|\| rec\.id::text/);
  assert.doesNotMatch(sql, /display_title/);
});
