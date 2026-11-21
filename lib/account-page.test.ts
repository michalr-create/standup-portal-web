import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const page = readFileSync(new URL("../app/ulubione/page.tsx", import.meta.url), "utf8");
const auth = readFileSync(new URL("../app/components/AuthStatus.tsx", import.meta.url), "utf8");
const later = readFileSync(new URL("../app/components/WatchLaterButton.tsx", import.meta.url), "utf8");
const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const homeLater = readFileSync(new URL("../app/components/WatchLaterSection.tsx", import.meta.url), "utf8");
const favorites = readFileSync(new URL("../app/components/FavoritesSection.tsx", import.meta.url), "utf8");

test("Konto opens the account and the account page can sign out", () => {
  assert.match(auth, /<Link href="\/ulubione"[\s\S]*?>\s*Konto\s*<\/Link>/);
  assert.doesNotMatch(auth, /aria-haspopup/);
  assert.match(page, /signOut/);
  assert.match(page, /Wyloguj/);
});

test("followed people and shows still link to the directories", () => {
  assert.match(page, /hasAny \|\| hasLater[\s\S]{0,500}href="\/standuperzy"/);
  assert.match(page, /Dodaj standupera/);
  assert.match(page, /href="\/formaty"/);
  assert.match(page, /Dodaj format/);
});

test("the account collapses tours and the favorite feed, then offers the rest", () => {
  assert.match(page, /Najnowsze treści w Ulubione/);
  assert.match(page, /Pokaż wszystkie/);
  assert.match(page, /id="do-obejrzenia"/);
  assert.match(page, /Do obejrzenia/);
  assert.doesNotMatch(page, /Do obejrzenia później/);
  assert.doesNotMatch(page, /Zgłoś błąd/);
  assert.doesNotMatch(page, /ReportMaterialLink/);
});

test("missing catalog entries are reported from the account with the new kinds", () => {
  assert.match(page, /Zgłoś brakujące/);
  assert.match(page, /MISSING_REPORT_KINDS/);
  const report = readFileSync(new URL("./content-report.ts", import.meta.url), "utf8");
  assert.match(report, /missing_event: "Brakujący występ"/);
  assert.match(report, /missing_person: "Brakujący standuper"/);
});

test("cards no longer offer Zgłoś błąd", () => {
  for (const file of [
    "../app/components/ItemsBrowser.tsx",
    "../app/components/ScrollRow.tsx",
    "../app/components/VideoModal.tsx",
    "../app/components/RankingCards.tsx",
  ]) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.doesNotMatch(source, /Zgłoś błąd/);
    assert.doesNotMatch(source, /ReportMaterialLink/);
  }
});

test("watch later is Do obejrzenia and the home row is signed-in only", () => {
  assert.match(later, /Usuń z listy Do obejrzenia/);
  assert.match(later, />\s*\{on \? "Usuń z listy Do obejrzenia" : "Do obejrzenia"\}/);
  assert.doesNotMatch(later, /Później/);
  assert.match(home, /<WatchLaterSection \/>/);
  assert.match(homeLater, /library\.signedIn/);
  assert.match(homeLater, /WATCH_LATER_HOME_LIMIT/);
  assert.match(homeLater, /href="\/ulubione#do-obejrzenia"/);
  assert.match(favorites, /polubie\{"\\u0144"\}/);
  assert.doesNotMatch(favorites, /\\u0119/);
});
