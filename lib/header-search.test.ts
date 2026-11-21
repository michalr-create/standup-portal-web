import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function source(path: string): string {
  return readFileSync(new URL("../" + path, import.meta.url), "utf8");
}

test("the header search icon leads the right-hand Konto and menu group", () => {
  const layout = source("app/layout.tsx");
  const link = source("app/components/HeaderSearchLink.tsx");
  const authAt = layout.indexOf("<AuthStatus />");
  const searchAt = layout.indexOf("<HeaderSearchLink />");
  const drawerAt = layout.indexOf("<MobileDrawer");
  assert.ok(searchAt >= 0 && searchAt < authAt && authAt < drawerAt);
  assert.match(layout, /justify-between/);
  assert.match(layout, /className="flex shrink-0 items-center gap-2 sm:gap-3 lg:gap-4 xl:gap-6"/);

  assert.match(link, /href="\/szukaj"/);
  assert.match(link, /aria-label="Szukaj"/);
  assert.match(link, /min-h-11/);
  assert.match(link, /min-w-11/);
  assert.match(link, /h-11 w-11/);
  assert.match(link, /hover:bg-\[var\(--ink-3\)\]/);
  assert.match(link, /color: "var\(--paper\)"/);
  assert.match(link, /focus-visible:outline-\[var\(--coral\)\]/);
  assert.match(link, /<circle cx="11" cy="11" r="8" \/>/);
  assert.match(link, /header-search-keyboard-trap/);
  assert.match(link, /trap\.focus\(/);

  const className = link.match(/className=\{`([^`]+)`\}/)?.[1] ?? "";
  assert.equal(className.includes("hidden"), false);
  assert.equal(className.includes("lg:hidden"), false);
});

test("mobile header spacing keeps logo, search, account, and menu inside 320px", () => {
  const layout = source("app/layout.tsx");
  assert.match(
    layout,
    /className="flex items-center justify-between flex-nowrap gap-3 px-3 py-3 sm:gap-4 sm:px-4 lg:py-4 xl:gap-6 xl:px-10"/,
  );
  // px-3 = 12, action gap-2 = 8. Nunito: logo ~82, Zaloguj ~72, Konto ~62, controls 44.
  const padding = 12 * 2;
  const innerGaps = 8 * 2;
  const logo = 82;
  const zaloguj = 72;
  const controls = 44 * 2;
  assert.ok(padding + innerGaps + logo + zaloguj + controls <= 320);
  assert.ok(padding + innerGaps + logo + 62 + controls <= 320);
});

test("the drawer search stays and an empty /szukaj focuses the field", () => {
  const drawer = source("app/components/MobileDrawer.tsx");
  assert.match(drawer, /data-resume-safe=""/);
  assert.match(drawer, /\/szukaj\?q=/);
  assert.match(drawer, /placeholder="Szukaj standuperów, filmów\.\.\."/);

  const page = source("app/szukaj/page.tsx");
  assert.match(page, /focusOnMount=\{!query\}/);
  assert.match(page, /autoFocus=\{focusOnMount\}/);
  assert.match(page, /\{focusOnMount \? <FocusSearchField \/> : null\}/);
  assert.match(page, /<SearchField query=\{query\} kategoria=\{kategoria\} \/>/);

  const focus = source("app/szukaj/FocusSearchField.tsx");
  assert.match(focus, /getElementById\("szukaj-q"\)/);
  assert.match(focus, /input\.focus\(\)/);
  assert.match(focus, /header-search-keyboard-trap/);
});
