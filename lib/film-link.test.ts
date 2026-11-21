import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  contentPlayerPath,
  filmDeepLink,
  parseFilmId,
  parseShareVideoId,
  readFilmItem,
  readFilmPayload,
  withoutFilmQuery,
} from "./film-link.ts";

test("a free YouTube video deep-links into the homepage player", () => {
  assert.equal(
    contentPlayerPath({ id: 4, url: "https://www.youtube.com/watch?v=abcdefghijk", isPaid: false }),
    "/?film=4&v=abcdefghijk&zrodlo=push",
  );
  assert.equal(
    contentPlayerPath({ id: 8, url: "https://youtu.be/abcdefghijk", isPaid: false }),
    "/?film=8&v=abcdefghijk&zrodlo=push",
  );
  assert.equal(filmDeepLink(4, "abcdefghijk"), "/?film=4&v=abcdefghijk&zrodlo=push");
});

test("paid videos and non-YouTube links stay on their own url", () => {
  const youtube = "https://www.youtube.com/watch?v=abcdefghijk";
  assert.equal(contentPlayerPath({ id: 4, url: youtube, isPaid: true }), null);
  assert.equal(contentPlayerPath({ id: 4, url: "https://open.spotify.com/episode/abc", isPaid: false }), null);
  assert.equal(contentPlayerPath({ id: 4, url: "javascript:alert(1)", isPaid: false }), null);
  assert.equal(contentPlayerPath({ id: 0, url: youtube, isPaid: false }), null);
  assert.equal(contentPlayerPath({ id: 4, url: "https://www.youtube.com/watch?v=a/b", isPaid: false }), null);
});

test("film ids are positive integers and share ids cannot escape the embed path", () => {
  assert.equal(parseFilmId("42"), 42);
  assert.equal(parseFilmId("0"), null);
  assert.equal(parseFilmId("-3"), null);
  assert.equal(parseFilmId("1.5"), null);
  assert.equal(parseFilmId("abc"), null);
  assert.equal(parseFilmId(""), null);
  assert.equal(parseFilmId(null), null);
  assert.equal(parseShareVideoId("abc_12-XYZ"), "abc_12-XYZ");
  assert.equal(parseShareVideoId("a/b"), null);
  assert.equal(parseShareVideoId("a b"), null);
  assert.equal(parseShareVideoId("../etc"), null);
  assert.equal(parseShareVideoId(""), null);
});

test("closing the player drops the deep link and keeps the page and other params", () => {
  assert.equal(
    withoutFilmQuery("https://parska.pl/?film=4&v=abcdefghijk&zrodlo=push#odtwarzacz"),
    "/#odtwarzacz",
  );
  assert.equal(
    withoutFilmQuery("https://parska.pl/?film=4&v=abcdefghijk&zrodlo=push&inne=1"),
    "/?inne=1",
  );
  assert.equal(withoutFilmQuery("https://parska.pl/standuper/ada"), "/standuper/ada");
});

test("a catalog payload needs an id, title, and url", () => {
  const item = readFilmItem({
    id: 4,
    title: "Parkowanie",
    url: "https://www.youtube.com/watch?v=abcdefghijk",
    is_paid: false,
    people: [{ name: "Ada", slug: "ada" }, { name: "" }, "nope"],
    showName: "Wahanie",
    showSlug: "wahanie",
  });
  assert.equal(item?.title, "Parkowanie");
  assert.equal(item?.is_paid, false);
  assert.deepEqual(item?.people, [{ name: "Ada", slug: "ada" }]);
  assert.equal(item?.showSlug, "wahanie");
  assert.equal(readFilmItem({ id: 4, title: "Parkowanie" }), null);
  assert.equal(readFilmItem(null), null);
  assert.equal(readFilmPayload({ item: { id: 4, title: "Parkowanie", url: "https://example.com/a" } })?.id, 4);
  assert.equal(readFilmPayload({}), null);
  assert.equal(readFilmPayload(null), null);
});

test("the homepage opens the shared player and a missing item is a 404", () => {
  const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const opener = readFileSync(new URL("../app/components/FilmDeepLink.tsx", import.meta.url), "utf8");
  const route = readFileSync(new URL("../app/api/film/[id]/route.ts", import.meta.url), "utf8");
  const modal = readFileSync(new URL("../app/components/VideoModal.tsx", import.meta.url), "utf8");
  assert.match(home, /<FilmDeepLink \/>/);
  assert.doesNotMatch(home, /cookies\(/);
  assert.doesNotMatch(home, /headers\(/);
  assert.match(opener, /\/api\/film\//);
  assert.match(opener, /VideoModal/);
  assert.match(opener, /resolveContentOpen/);
  assert.match(opener, /res\.status === 404/);
  assert.match(opener, /forgetFilmParam/);
  assert.doesNotMatch(opener, /useSearchParams/);
  assert.match(route, /getApprovedItemsByIds/);
  assert.match(route, /parseFilmId/);
  assert.match(route, /status: 404/);
  assert.doesNotMatch(route, /SUPABASE_SERVICE_KEY/);
  assert.match(modal, /OPEN_YOUTUBE_LABEL/);
  assert.match(modal, /openYoutubeWatchInDocument/);
  assert.match(modal, /aria-label="Odtwórz"/);
  assert.match(modal, /playVideo/);
  assert.match(modal, /showPlayFallback/);
});
