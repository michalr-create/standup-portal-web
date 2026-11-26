import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { COOKIES_BODY } from "./legal/cookies.ts";
import { POLITYKA_BODY } from "./legal/polityka.ts";
import { REGULAMIN_BODY } from "./legal/regulamin.ts";
import { draftHasPlaceholder, legalPagesAreReady, PUBLISH_LEGAL_PAGES } from "./legal/publish.ts";

const require = createRequire(import.meta.url);
const React = require("react") as typeof import("react");
const { renderToStaticMarkup } = require("react-dom/server") as typeof import("react-dom/server");

test("legal pages stay unpublished while the drafts still have placeholders", () => {
  assert.equal(PUBLISH_LEGAL_PAGES, false);
  assert.equal(legalPagesAreReady(), false);
  for (const body of [POLITYKA_BODY, REGULAMIN_BODY, COOKIES_BODY]) {
    assert.equal(draftHasPlaceholder(body), true);
    assert.doesNotMatch(body, /Checklist wdrożeniowy/);
  }
  assert.doesNotMatch(COOKIES_BODY, /Część B/);
  assert.match(POLITYKA_BODY, /parska\.pl@gmail\.com/);
  assert.match(REGULAMIN_BODY, /parska\.pl@gmail\.com/);
  const pendingSource = readFileSync(new URL("../app/components/LegalPending.tsx", import.meta.url), "utf8");
  assert.match(pendingSource, /Dokument w przygotowaniu/);
  assert.doesNotMatch(pendingSource, /\[DO UZUPEŁNIENIA/);
  for (const route of ["polityka-prywatnosci", "regulamin", "cookies"]) {
    const page = readFileSync(new URL(`../app/${route}/page.tsx`, import.meta.url), "utf8");
    assert.match(page, /draftHasPlaceholder/);
    assert.match(page, /legalPagesAreReady/);
    assert.match(page, /LegalPending/);
  }
  const html = renderToStaticMarkup(
    React.createElement("article", null, "Dokument w przygotowaniu. Opublikujemy go po uzupełnieniu danych administratora i przeglądzie prawnym."),
  );
  assert.match(html, /Dokument w przygotowaniu/);
  assert.doesNotMatch(html, /DO UZUPEŁNIENIA/);
});
