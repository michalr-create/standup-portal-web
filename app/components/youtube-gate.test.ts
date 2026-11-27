import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript") as typeof import("typescript");
const React = require("react") as typeof import("react");
const { renderToStaticMarkup } = require("react-dom/server") as typeof import("react-dom/server");

function compile(source: string): string {
  return ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
}

function loadClickToLoad() {
  const dir = mkdtempSync(join(tmpdir(), "yt-gate-"));
  const reactPath = require.resolve("react");
  const jsxPath = require.resolve("react/jsx-runtime");
  const linkPath = join(dir, "link.cjs");
  const gatePath = join(dir, "gate.cjs");
  const embedPath = join(dir, "embed.cjs");
  const consentPath = join(dir, "consent.cjs");
  const imagePath = join(dir, "image.cjs");
  const altPath = join(dir, "alt.cjs");
  const viewPath = join(dir, "view.cjs");
  writeFileSync(embedPath, compile(readFileSync(new URL("../../lib/youtube-embed.ts", import.meta.url), "utf8")).replaceAll(
    "exports.youtubeEmbedSrc = youtubeEmbedSrc;",
    "exports.youtubeEmbedSrc = youtubeEmbedSrc;",
  ));
  writeFileSync(
    linkPath,
    [
      `const React = require(${JSON.stringify(reactPath)});`,
      "function Link({ href, children, ...rest }) { return React.createElement('a', { href, ...rest }, children); }",
      "module.exports = Link; module.exports.default = Link; module.exports.__esModule = true;",
    ].join("\n"),
  );
  writeFileSync(
    consentPath,
    [
      "exports.hasConsent = () => false;",
      "exports.getConsent = () => null;",
      "exports.saveConsent = () => ({});",
      "exports.CONSENT_CHANGED_EVENT = 'parska-consent-changed';",
    ].join("\n"),
  );
  const gateJs = compile(readFileSync(new URL("./useYoutubeGate.ts", import.meta.url), "utf8"))
    .replaceAll('require("@/lib/consent")', `require(${JSON.stringify(consentPath)})`)
    .replaceAll('require("@/lib/youtube-embed")', `require(${JSON.stringify(embedPath)})`)
    .replaceAll('require("react")', `require(${JSON.stringify(reactPath)})`);
  writeFileSync(gatePath, gateJs);
  writeFileSync(altPath, "exports.IMAGE_SIZE = { youtubePoster: { width: 480, height: 360 } };");
  writeFileSync(
    imagePath,
    [
      `const React = require(${JSON.stringify(reactPath)});`,
      "function SizedImage(props) { return React.createElement('img', { src: props.src, alt: props.alt || '' }); }",
      "module.exports.default = SizedImage; module.exports.__esModule = true;",
    ].join("\n"),
  );
  const view = compile(readFileSync(new URL("./YoutubeClickToLoad.tsx", import.meta.url), "utf8"))
    .replaceAll('require("next/link")', `require(${JSON.stringify(linkPath)})`)
    .replaceAll('require("./SizedImage")', `require(${JSON.stringify(imagePath)})`)
    .replaceAll('require("@/lib/image-alt")', `require(${JSON.stringify(altPath)})`)
    .replaceAll('require("./useYoutubeGate")', `require(${JSON.stringify(gatePath)})`)
    .replaceAll('require("@/lib/youtube-embed")', `require(${JSON.stringify(embedPath)})`)
    .replaceAll('require("react/jsx-runtime")', `require(${JSON.stringify(jsxPath)})`)
    .replaceAll('require("react")', `require(${JSON.stringify(reactPath)})`);
  writeFileSync(viewPath, view);
  return require(viewPath).default as (props: { videoId: string; title: string }) => React.ReactElement;
}

const YoutubeClickToLoad = loadClickToLoad();

test("YoutubeClickToLoad renders no iframe until a play click or embeds consent", () => {
  const html = renderToStaticMarkup(
    React.createElement(YoutubeClickToLoad, { videoId: "abcdefghijk", title: "Wentyl" }),
  );
  assert.doesNotMatch(html, /<iframe/i);
  assert.doesNotMatch(html, /youtube\.com\/embed|youtube-nocookie\.com\/embed/);
  assert.match(html, /Odtwórz/);
  assert.match(html, /Wczytamy odtwarzacz YouTube/);
  assert.match(html, /i\.ytimg\.com/);
  assert.match(html, /Zapamiętaj wybór/);
});

test("TicketOutboundLink puts UTM on the href and tracks on pointerdown", () => {
  const source = readFileSync(new URL("./TicketOutboundLink.tsx", import.meta.url), "utf8");
  assert.match(source, /withTicketUtm\(href, \{ placement, eventId \}\)/);
  assert.match(source, /onPointerDown=\{track\}/);
  assert.match(source, /onClick=\{track\}/);
  assert.match(source, /trackParska\("kup_bilet"/);
  assert.match(source, /rel="noopener noreferrer"/);
  assert.match(source, /target="_blank"/);
});
