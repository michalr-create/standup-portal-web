import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildSitemap } from "./seo.ts";
import { slugRedirectPath } from "./slug-redirect.ts";
import { slugify } from "./slugify.ts";

const sql = readFileSync(
  new URL("../supabase/migrations/20261125223000_person_and_show_slug_aliases.sql", import.meta.url),
  "utf8",
);

function renameRows(table: string): { id: number | null; from: string; to: string }[] {
  const marker = `insert into ${table}`;
  const start = sql.indexOf(marker);
  assert.ok(start > 0, marker);
  const end = sql.indexOf(";", start);
  const block = sql.slice(start, end);
  const pinned = [...block.matchAll(/\((\d+), '([^']+)', '([^']+)'\)/g)].map((match) => ({
    id: Number(match[1]),
    from: match[2],
    to: match[3],
  }));
  if (pinned.length > 0) return pinned;
  return [...block.matchAll(/\('([^']+)', '([^']+)'\)/g)].map((match) => ({
    id: null,
    from: match[1],
    to: match[2],
  }));
}

const PEOPLE: [string, string, string][] = [
  ["Błażej Krajewski", "b-azej-krajewski", "blazej-krajewski"],
  ["Bartłomiej Korbel", "bart-omiej-korbel", "bartlomiej-korbel"],
  ["Bartosz Młynarski", "bartosz-m-ynarski", "bartosz-mlynarski"],
  ["Ewa Błachnio", "ewa-b-achnio", "ewa-blachnio"],
  ["Gaweł Feliga", "gawe-feliga", "gawel-feliga"],
  ["Joanna Kołaczkowska", "joanna-ko-aczkowska", "joanna-kolaczkowska"],
  ["Kamil Kozieł", "kamil-kozie", "kamil-koziel"],
  ["Kuba Rużyłło", "kuba-ruzylo", "kuba-ruzyllo"],
  ["Mariusz Kałamaga", "mariusz-ka-amaga", "mariusz-kalamaga"],
  ["Mateusz Płocha", "mateusz-p-ocha", "mateusz-plocha"],
  ["Michał Gniazdowski", "micha-gniazdowski", "michal-gniazdowski"],
  ["Michał Juszczak", "micha-juszczak", "michal-juszczak"],
  ["Michał Kutek", "micha-kutek", "michal-kutek"],
  ["Michał Leja", "micha-leja", "michal-leja"],
  ["Michał Pałubski", "micha-pa-ubski", "michal-palubski"],
  ["Paweł Chałupka", "pawe-cha-upka", "pawel-chalupka"],
  ["Paweł Domagała", "pawe-domaga-a", "pawel-domagala"],
  ["Paweł Konkiel", "pawe-konkiel", "pawel-konkiel"],
  ["Paweł Ścierski", "pawe-scierski", "pawel-scierski"],
  ["Rafał Banaś", "rafa-banas", "rafal-banas"],
  ["Rafał Rutkowski", "rafa-rutkowski", "rafal-rutkowski"],
  ["Rafał Sumowski", "rafa-sumowski", "rafal-sumowski"],
  ["Tomek Kołecki", "tomek-ko-ecki", "tomek-kolecki"],
  ["Łukasz Kowalski", "ukasz-kowalski", "lukasz-kowalski"],
  ["Łukasz Wolski", "ukasz-wolski", "lukasz-wolski"],
];

const SHOWS: [string, string, string][] = [
  ["Gadająca Głowa (Bartosz Zalewski)", "gadajaca-g-owa-bartosz-zalewski", "gadajaca-glowa-bartosz-zalewski"],
  ["Hamburger Show! (Błażej Krajewski)", "hamburger-show-b-azej-krajewski", "hamburger-show-blazej-krajewski"],
  ["Michał Leja Show", "micha-leja-show", "michal-leja-show"],
  ["Odsłuch (Łukasz Kowalski)", "ods-uch-ukasz-kowalski", "odsluch-lukasz-kowalski"],
  ["Pytał Kacper Ruciński", "pyta-kacper-rucinski", "pytal-kacper-rucinski"],
  ["Śmieszny człowiek (Karol Kopiec i goście)", "smieszny-cz-owiek-karol-kopiec-i-goscie", "smieszny-czlowiek-karol-kopiec-i-goscie"],
  ["Z KARTKI (Michał Leja)", "z-kartki-micha-leja", "z-kartki-michal-leja"],
];

test("legacy slug redirects are 308 paths and reject unsafe targets", () => {
  assert.equal(
    slugRedirectPath("standuper", "ukasz-kowalski", "lukasz-kowalski"),
    "/standuper/lukasz-kowalski",
  );
  assert.equal(slugRedirectPath("standuper", "lukasz-kowalski", "lukasz-kowalski"), null);
  assert.equal(slugRedirectPath("standuper", "ukasz-kowalski", null), null);
  assert.equal(slugRedirectPath("standuper", "ukasz-kowalski", "../admin"), null);
  assert.equal(slugRedirectPath("standuper", "ukasz-kowalski", "Łukasz"), null);
  assert.equal(
    slugRedirectPath("format", "micha-leja-show", "michal-leja-show", 2),
    "/format/michal-leja-show?page=2",
  );
  assert.equal(
    slugRedirectPath("format", "micha-leja-show", "michal-leja-show", 1),
    "/format/michal-leja-show",
  );
});

test("the migration renames only cut-ł slugs and keeps intentional ones", () => {
  const people = renameRows("person_slug_renames");
  const shows = renameRows("show_slug_renames");
  assert.equal(people.length, 25);
  assert.equal(shows.length, 7);
  assert.deepEqual(
    people.map((row) => [row.from, row.to]),
    PEOPLE.map(([, from, to]) => [from, to]),
  );
  assert.deepEqual(
    shows.map((row) => [row.from, row.to]),
    SHOWS.map(([, from, to]) => [from, to]),
  );
  const byOld = new Map(people.map((row) => [row.from, row]));
  assert.equal(byOld.get("pawe-cha-upka")?.id, 15);
  assert.equal(byOld.get("pawe-cha-upka")?.to, "pawel-chalupka");
  assert.equal(byOld.get("rafa-rutkowski")?.id, 27);
  assert.equal(byOld.get("rafa-rutkowski")?.to, "rafal-rutkowski");
  assert.equal(byOld.get("micha-pa-ubski")?.id, 114);
  assert.equal(byOld.get("micha-pa-ubski")?.to, "michal-palubski");
  assert.equal(byOld.get("b-azej-krajewski")?.id, 99);
  assert.equal(byOld.get("b-azej-krajewski")?.to, "blazej-krajewski");
  assert.equal(byOld.get("micha-kutek")?.id, 25);
  assert.equal(byOld.get("micha-kutek")?.to, "michal-kutek");
  assert.equal(byOld.get("rafa-banas")?.id, 29);
  assert.equal(byOld.get("rafa-banas")?.to, "rafal-banas");
  assert.equal(slugify("Rafał Banaś"), "rafal-banas");
  assert.equal(byOld.get("ukasz-kowalski")?.id, 12);
  assert.match(sql, /where p\.id = r\.person_id/);
  assert.match(sql, /a pinned id did not receive its new slug/);
  for (const [name, , to] of [...PEOPLE, ...SHOWS]) {
    assert.equal(slugify(name), to);
  }
  assert.equal(slugify("Łukasz Testowy"), "lukasz-testowy");
  assert.equal(slugify("Łukasz Lotek Lodkowski"), "lukasz-lotek-lodkowski");
  assert.equal(slugify("A słuchaj tego"), "a-sluchaj-tego");
  assert.equal(slugify("W służbie ludzkości"), "w-sluzbie-ludzkosci");

  const peopleOld = new Set(people.map((row) => row.from));
  for (const kept of ["lotek", "rafal-paczes", "michal-kempa", "lukasz-kozlowski"]) {
    assert.equal(peopleOld.has(kept), false);
    assert.match(sql, new RegExp(`distinct from '${kept}'`));
  }
  const showOld = new Set(shows.map((row) => row.from));
  for (const kept of ["a-sluchaj-tego", "w-sluzbie-ludzkosci", "hamburger-show"]) {
    assert.equal(showOld.has(kept), false);
    assert.match(sql, new RegExp(`distinct from '${kept}'`));
  }

  assert.match(sql, /target slug already taken/);
  assert.match(sql, /person tag slug already taken/);
  assert.match(sql, /target slug is already an alias/);
  assert.match(sql, /update public\.tags/);
  assert.match(sql, /set slug = new\.slug/);
  assert.match(sql, /insert into public\.people_slug_aliases \(slug, person_id\)/);
  assert.match(sql, /insert into public\.show_slug_aliases \(slug, show_id\)/);
  assert.match(sql, /people_slug_aliases_person_id_idx/);
  assert.match(sql, /show_slug_aliases_show_id_idx/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /grant select on table public\.people_slug_aliases to anon, authenticated/);
  assert.match(sql, /grant select on table public\.show_slug_aliases to anon, authenticated/);
  assert.match(sql, /references public\.people \(id\) on delete cascade/);
  assert.match(sql, /references public\.shows \(id\) on delete cascade/);
  assert.doesNotMatch(sql, /security definer/);
});

test("sitemap and profile routes publish the current slug only", () => {
  const sitemap = readFileSync(new URL("../app/sitemap.ts", import.meta.url), "utf8");
  assert.match(sitemap, /people\.map\(\(person\) => person\.slug\)/);
  assert.match(sitemap, /shows\.map\(\(show\) => show\.slug\)/);
  assert.doesNotMatch(sitemap, /slug_aliases/);

  const urls = buildSitemap(
    ["lukasz-kowalski"],
    ["michal-leja-show"],
  ).map((entry) => entry.url);
  assert.equal(urls.includes("https://parska.pl/standuper/lukasz-kowalski"), true);
  assert.equal(urls.includes("https://parska.pl/standuper/ukasz-kowalski"), false);
  assert.equal(urls.includes("https://parska.pl/format/michal-leja-show"), true);
  assert.equal(urls.includes("https://parska.pl/format/micha-leja-show"), false);

  const standuper = readFileSync(new URL("../app/standuper/[slug]/page.tsx", import.meta.url), "utf8");
  assert.match(standuper, /pathname: `\/standuper\/\$\{person\.slug\}`/);
  assert.match(standuper, /slugRedirectPath\("standuper"/);
  assert.match(standuper, /permanentRedirect\(path\)/);
  assert.match(standuper, /slug=\{person\.slug\}/);

  const format = readFileSync(new URL("../app/format/[slug]/page.tsx", import.meta.url), "utf8");
  assert.match(format, /pathname: `\/format\/\$\{show\.slug\}`/);
  assert.match(format, /slugRedirectPath\("format"/);
  assert.match(format, /permanentRedirect\(path\)/);
  assert.match(format, /permanentRedirect\(legacy\)/);
  assert.match(format, /redirect\(parsed\.redirectHref\)/);
  assert.match(format, /slug=\{show\.slug\}/);
  assert.match(format, /listingPageHref\(`\/format\/\$\{show\.slug\}`, page\)/);

  const komik = readFileSync(new URL("../app/komik/[slug]/page.tsx", import.meta.url), "utf8");
  assert.match(komik, /permanentRedirect\(`\/standuper\/\$\{person\.slug\}`\)/);
  assert.match(komik, /permanentRedirect\(path \?\? `\/standuper\/\$\{slug\}`\)/);
  assert.doesNotMatch(komik, /\bredirect\(/);

  for (const file of [
    "../app/admin/standuperzy/StanduperzyManager.tsx",
    "../app/admin/formaty/FormatyManager.tsx",
    "../app/admin/zrodla/SourcesManager.tsx",
    "../app/admin/components/ModerationCard.tsx",
  ]) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.match(source, /import \{[^}]*slugify[^}]*\} from "@\/lib\/slugify"/);
    assert.doesNotMatch(source, /function slugify/);
    assert.doesNotMatch(source, /\.normalize\("NFD"\)/);
  }
});
