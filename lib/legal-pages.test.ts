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

function publishedDocument(title: string, body: string) {
  const ready = legalPagesAreReady() && !draftHasPlaceholder(body);
  const html = renderToStaticMarkup(
    ready
      ? React.createElement(LegalDocument, { title, source: body })
      : React.createElement("article", null, "Dokument w przygotowaniu. Opublikujemy go po uzupełnieniu danych administratora i przeglądzie prawnym."),
  );
  return { status: ready ? 200 : 404, html };
}

test("published legal pages return the documents without placeholders or noindex", () => {
  assert.equal(PUBLISH_LEGAL_PAGES, true);
  assert.equal(legalPagesAreReady(), true);
  for (const body of [POLITYKA_BODY, REGULAMIN_BODY, COOKIES_BODY]) {
    assert.equal(draftHasPlaceholder(body), false);
    assert.equal(body.includes("[DO UZUPEŁNIENIA"), false);
    assert.match(body, /Data ostatniej aktualizacji: 27 listopada 2026/);
    assert.match(body, /Michał Religa/);
    assert.match(body, new RegExp(ADDRESS.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(body, /parska\.pl@gmail\.com/);
    assert.doesNotMatch(body, /Checklist|Część B|uklad-i-ryzyka|Dla zespołu|Przed publikacją/);
    assert.doesNotMatch(body, /Dokument w przygotowaniu/);
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
  const documents = [
    ["polityka-prywatnosci", "Polityka prywatności", POLITYKA_BODY],
    ["regulamin", "Regulamin", REGULAMIN_BODY],
    ["cookies", "Cookies", COOKIES_BODY],
  ] as const;
  for (const [route, title, body] of documents) {
    const page = readFileSync(new URL(`../app/${route}/page.tsx`, import.meta.url), "utf8");
    assert.match(page, /draftHasPlaceholder/);
    assert.match(page, /legalPagesAreReady/);
    assert.match(page, /LegalPending/);
    assert.match(page, /const ready = legalPagesAreReady\(\) && !draftHasPlaceholder/);
    assert.match(page, /if \(!ready\) return <LegalPending/);
    assert.match(page, /return <LegalDocument/);
    const published = page.split("export const metadata: Metadata = ready")[1]?.split(": noindexMetadata")[0] ?? "";
    assert.match(published, /alternates:\s*\{\s*canonical:\s*PATH\s*\}/);
    assert.doesNotMatch(published, /noindex|index:\s*false/);
    const rendered = publishedDocument(title, body);
    assert.equal(rendered.status, 200);
    assert.match(rendered.html, /27 listopada 2026/);
    assert.doesNotMatch(rendered.html, /Dokument w przygotowaniu/);
    assert.doesNotMatch(rendered.html, /DO UZUPEŁNIENIA/);
  }

  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const drawer = readFileSync(new URL("../app/components/MobileDrawer.tsx", import.meta.url), "utf8");
  const links = readFileSync(new URL("../app/components/SiteLegalLinks.tsx", import.meta.url), "utf8");
  const banner = readFileSync(new URL("../app/components/ConsentBanner.tsx", import.meta.url), "utf8");
  assert.match(layout, /<SiteLegalLinks \/>/);
  assert.match(drawer, /<SiteLegalLinks tone="drawer"/);
  assert.match(links, /legalPagesAreReady\(\)/);
  for (const href of ["/polityka-prywatnosci", "/regulamin", "/cookies"]) {
    assert.match(links, new RegExp(`href="${href}"`));
    assert.match(banner, new RegExp(`href="${href}"`));
  }
  assert.match(banner, /legalPagesAreReady\(\)/);
  assert.match(banner, /Szczegóły:/);
  assert.match(banner, /Dokumenty:/);
});

test("updated legal drafts render the administrator data and tables", () => {
  const polityka = renderToStaticMarkup(React.createElement(LegalDocument, { title: "Polityka prywatności", source: POLITYKA_BODY }));
  assert.match(polityka, /Polityka prywatności/);
  assert.match(polityka, /Michał Religa/);
  assert.match(polityka, /Łukasińskiego 45D/);
  assert.match(polityka, /<table/);
  assert.match(polityka, /Vercel Inc\./);
  assert.match(polityka, /href="https:\/\/vercel\.com\/legal\/dpa"/);
  assert.match(polityka, /27 listopada 2026/);
  assert.match(polityka, /Konto można usunąć samodzielnie w ustawieniach konta/);
  assert.match(polityka, /Kopie zapasowe dostawców/);
  assert.match(polityka, /Zgłoszenia open mic/);
  assert.doesNotMatch(polityka, /nie ma obecnie przycisku/);
  assert.doesNotMatch(polityka, /DO UZUPEŁNIENIA/);
  assert.doesNotMatch(polityka, /Dokument w przygotowaniu/);
  assert.doesNotMatch(polityka, /Checklist/);

  const regulamin = renderToStaticMarkup(React.createElement(LegalDocument, { title: "Regulamin", source: REGULAMIN_BODY }));
  assert.match(regulamin, /punktem kontaktowym/);
  assert.match(regulamin, /<ol/);
  assert.match(regulamin, /Łukasińskiego 45D/);
  assert.match(regulamin, /usunąć Konto w ustawieniach, po potwierdzeniu żądania/);
  assert.doesNotMatch(regulamin, /nie ma obecnie przycisku/);
  assert.doesNotMatch(regulamin, /DO UZUPEŁNIENIA/);
  assert.doesNotMatch(regulamin, /Dokument w przygotowaniu/);
  assert.doesNotMatch(regulamin, /Checklist/);

  const cookies = renderToStaticMarkup(React.createElement(LegalDocument, { title: "Cookies", source: COOKIES_BODY }));
  assert.match(cookies, /Cookies/);
  assert.doesNotMatch(cookies, /Część A/);
  assert.doesNotMatch(cookies, /Część B/);
  assert.match(cookies, /parska_consent/);
  assert.match(cookies, /href="\/polityka-prywatnosci"/);
  assert.match(cookies, /Łukasińskiego 45D/);
  assert.match(cookies, /27 listopada 2026/);
  assert.doesNotMatch(cookies, /DO UZUPEŁNIENIA/);
  assert.doesNotMatch(cookies, /Dokument w przygotowaniu/);
});
