import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { DRAWER_PRIMARY_LINKS, DRAWER_SECONDARY_LINKS } from "./drawer-nav.ts";

const drawer = readFileSync(new URL("../app/components/MobileDrawer.tsx", import.meta.url), "utf8");
const auth = readFileSync(new URL("../app/components/AuthStatus.tsx", import.meta.url), "utf8");
const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
const favourites = readFileSync(new URL("../app/ulubione/page.tsx", import.meta.url), "utf8");

test("burger links follow the two groups and Ulubione opens the favourites feed", () => {
  assert.deepEqual(
    DRAWER_PRIMARY_LINKS.map((link) => [link.href, link.label]),
    [
      ["/ulubione/tresci", "Ulubione"],
      ["/specjale", "Specjale"],
      ["/formaty", "Formaty"],
      ["/trasy", "Trasy"],
      ["/open-mic", "Open mic"],
      ["/standuperzy", "Standuperzy"],
    ],
  );
  assert.deepEqual(
    DRAWER_SECONDARY_LINKS.map((link) => [link.href, link.label]),
    [
      ["/nostalgia", "Nostalgia"],
      ["/rankingi", "Rankingi"],
      ["/wywiady", "Wywiady"],
      ["/kulisy", "Kulisy"],
      ["/standup", "Standup (kr\u00f3tsze materia\u0142y)"],
      ["/roast", "Roast"],
      ["/shorts", "Shorts"],
    ],
  );
  assert.equal(
    [...DRAWER_PRIMARY_LINKS, ...DRAWER_SECONDARY_LINKS].filter((link) => link.href === "/ulubione").length,
    0,
  );
  assert.equal(
    DRAWER_PRIMARY_LINKS.some((link) => link.href.startsWith("/zaloguj") || link.href === "/konto"),
    false,
  );
});

test("the drawer paints primary links, a rule, then secondary links", () => {
  const primary = drawer.indexOf("<DrawerLinks links={DRAWER_PRIMARY_LINKS}");
  const rule = drawer.indexOf("<hr");
  const secondary = drawer.indexOf("<DrawerLinks links={DRAWER_SECONDARY_LINKS}");
  assert.ok(primary !== -1 && rule > primary && secondary > rule);
  assert.match(drawer, /link\.href === "\/ulubione\/tresci" && <HeartIcon \/>/);
  assert.doesNotMatch(drawer, /Wszystkie formaty/);
  assert.doesNotMatch(drawer, /Wszyscy standuperzy/);
  assert.doesNotMatch(drawer, /Osoby/);
  assert.doesNotMatch(drawer, /withTourLink|showsOpen|MAX_VISIBLE_SHOWS/);
  assert.match(drawer, /containTab\(event, panel\)/);
  assert.match(drawer, /addEventListener\("keydown", onKeyDown, true\)/);
  assert.match(drawer, /event\.key === "Escape"/);
});

test("logout is last and Konto stays on the account page", () => {
  const primary = drawer.indexOf("<DrawerLinks links={DRAWER_PRIMARY_LINKS}");
  const secondary = drawer.indexOf("<DrawerLinks links={DRAWER_SECONDARY_LINKS}");
  const account = drawer.indexOf('<AuthStatus variant="drawer"');
  const admin = drawer.indexOf('<AdminNavLink variant="drawer"');
  const signOut = drawer.indexOf('slot="sign-out"');
  assert.ok(primary < secondary && secondary < account && account < admin && admin < signOut);

  assert.match(auth, /slot === "sign-out"/);
  assert.match(auth, /if \(!signedIn\) return null/);
  assert.match(auth, /<SignOutButton/);
  assert.match(auth, /<Link href="\/ulubione" onClick=\{onNavigate\}[\s\S]*?>\s*Konto\s*<\/Link>/);
  assert.match(auth, /<Link href="\/ulubione" className=\{chipClass\}[\s\S]*?>\s*Konto\s*<\/Link>/);
  assert.doesNotMatch(auth, /\/ulubione\/tresci/);
  assert.match(auth, /Zaloguj/);
  assert.doesNotMatch(auth, /Ulubione/);

  assert.match(favourites, /href="\/zaloguj\?next=\/ulubione"/);
  assert.match(favourites, /Zaloguj się/);

  assert.match(layout, /Wszystkie formaty/);
  assert.match(layout, /Wszyscy standuperzy/);
  assert.match(layout, /<MobileDrawer \/>/);
});
