import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { COOKIES_BODY } from "./legal/cookies.ts";
import { POLITYKA_BODY } from "./legal/polityka.ts";
import { REGULAMIN_BODY } from "./legal/regulamin.ts";
import { draftHasPlaceholder, legalPagesAreReady, PUBLISH_LEGAL_PAGES } from "./legal/publish.ts";

const require = createRequire(import.meta.url);
const ts = require("typescript") as typeof import("typescript");
const React = require("react") as typeof import("react");
const { renderToStaticMarkup } = require("react-dom/server") as typeof import("react-dom/server");

const ADDRESS = "ul. Łukasińskiego 45D, 71-215 Szczecin";

function loadLegalDocument() {
  const reactPath = require.resolve("react");
  const jsxPath = require.resolve("react/jsx-runtime");
  const dir = mkdtempSync(join(tmpdir(), "legal-doc-"));
  const linkPath = join(dir, "link.cjs");
  const viewPath = join(dir, "LegalDocument.cjs");
  writeFileSync(
    linkPath,
    [
      `const React = require(${JSON.stringify(reactPath)});`,
      "function Link({ href, children, ...rest }) { return React.createElement('a', { href, ...rest }, children); }",
      "module.exports = Link; module.exports.default = Link; module.exports.__esModule = true;",
    ].join("\n"),
  );
  const compiled = ts.transpileModule(readFileSync(new URL("../app/components/LegalDocument.tsx", import.meta.url), "utf8"), {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText
    .replaceAll('require("next/link")', `require(${JSON.stringify(linkPath)})`)
    .replaceAll('require("react/jsx-runtime")', `require(${JSON.stringify(jsxPath)})`)
    .replaceAll('require("react")', `require(${JSON.stringify(reactPath)})`);
  writeFileSync(viewPath, compiled);
  return require(viewPath).default as (props: { title: string; source: string }) => React.ReactElement;
}

const LegalDocument = loadLegalDocument();

test("legal pages stay unpublished while the drafts still have placeholders", () => {
  assert.equal(PUBLISH_LEGAL_PAGES, false);
  assert.equal(legalPagesAreReady(), false);
  for (const body of [POLITYKA_BODY, REGULAMIN_BODY, COOKIES_BODY]) {
    assert.equal(draftHasPlaceholder(body), true);
    assert.equal(body.split("[DO UZUPEŁNIENIA").length - 1, 1);
    assert.match(body, /Data ostatniej aktualizacji: `\[DO UZUPEŁNIENIA: data publikacji\]`/);
    assert.match(body, /Michał Religa/);
    assert.match(body, new RegExp(ADDRESS.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(body, /parska\.pl@gmail\.com/);
    assert.doesNotMatch(body, /Checklist|Część B|uklad-i-ryzyka|Dla zespołu|Przed publikacją/);
    assert.doesNotMatch(body, /listopada 2026|2026-11-27/);
  }
  assert.match(POLITYKA_BODY, /## 11\. Zmiany polityki/);
  assert.match(POLITYKA_BODY, /Nie wyznaczył inspektora ochrony danych \(IOD\)/);
  assert.doesNotMatch(POLITYKA_BODY, /adres korespondencyjny/);
  assert.match(REGULAMIN_BODY, /## 16\. Postanowienia końcowe/);
  assert.match(REGULAMIN_BODY, /Nie posługuje się numerem NIP, REGON ani wpisem do CEIDG/);
  assert.doesNotMatch(REGULAMIN_BODY, /\[DO UZUPEŁNIENIA: adres\]|\[DO UZUPEŁNIENIA: NIP/);
  assert.match(COOKIES_BODY, /# Część A\. Zasady plików cookies/);
  assert.match(COOKIES_BODY, /## 6\. Podstawa/);
  assert.match(COOKIES_BODY, /art\. 399 ust\. 3 PKE/);
  assert.doesNotMatch(COOKIES_BODY, /do potwierdzenia przez prawnika/);
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

test("updated legal drafts render the administrator data and tables", () => {
  const polityka = renderToStaticMarkup(React.createElement(LegalDocument, { title: "Polityka prywatności", source: POLITYKA_BODY }));
  assert.match(polityka, /Polityka prywatności/);
  assert.match(polityka, /Michał Religa/);
  assert.match(polityka, /Łukasińskiego 45D/);
  assert.match(polityka, /<table/);
  assert.match(polityka, /Vercel Inc\./);
  assert.match(polityka, /href="https:\/\/vercel\.com\/legal\/dpa"/);
  assert.match(polityka, /DO UZUPEŁNIENIA: data publikacji/);
  assert.doesNotMatch(polityka, /Checklist/);

  const regulamin = renderToStaticMarkup(React.createElement(LegalDocument, { title: "Regulamin", source: REGULAMIN_BODY }));
  assert.match(regulamin, /punktem kontaktowym/);
  assert.match(regulamin, /<ol/);
  assert.match(regulamin, /Łukasińskiego 45D/);
  assert.doesNotMatch(regulamin, /Checklist/);

  const cookies = renderToStaticMarkup(React.createElement(LegalDocument, { title: "Cookies", source: COOKIES_BODY }));
  assert.match(cookies, /Cookies/);
  assert.doesNotMatch(cookies, /Część A/);
  assert.doesNotMatch(cookies, /Część B/);
  assert.match(cookies, /parska_consent/);
  assert.match(cookies, /href="\/polityka-prywatnosci"/);
  assert.match(cookies, /Łukasińskiego 45D/);
});
