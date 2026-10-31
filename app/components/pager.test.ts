import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("pager status is screen-reader only and no longer prints the item range", () => {
  const pager = readFileSync(new URL("./Pager.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(pager, /pager-status/);
  assert.doesNotMatch(pager, /\\u00b7/);
  assert.match(pager, /<p className="sr-only">\{`Strona \$\{page\} z \$\{totalPages\}`\}<\/p>/);
  assert.match(pager, /className="pager-controls"/);
  assert.match(pager, /aria-current="page"/);
});
