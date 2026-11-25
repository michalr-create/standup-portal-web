import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { personPageGraph } from "./jsonld.ts";
import {
  emptyPersonImage,
  isMissingPeopleImageColumn,
  portraitJsonLd,
  profileSameAs,
  resolvePersonPortrait,
  youtubeAvatarFresh,
  youtubeThumbnailUrl,
  YOUTUBE_AVATAR_MAX_AGE_MS,
  type PersonImageRow,
} from "./person-portrait.ts";

const NOW = new Date("2026-11-25T12:00:00.000Z");
const FRESH = "2026-11-20T12:00:00.000Z";
const YT = "https://yt3.ggpht.com/ytc/AIdro_face=s800-c-k-c0x00ffffff-no-rj";
const CHANNEL = "https://www.youtube.com/@LukaszLotekLodkowski";

function row(patch: Partial<PersonImageRow>): PersonImageRow {
  return { ...emptyPersonImage(), ...patch };
}

test("a YouTube thumbnail URL is kept exactly and only from the avatar hosts", () => {
  assert.equal(youtubeThumbnailUrl(`  ${YT}  `), YT);
  assert.equal(youtubeThumbnailUrl(YT.replace("https://", "http://")), null);
  assert.equal(youtubeThumbnailUrl("https://i.ytimg.com/vi/abc/hqdefault.jpg"), null);
  assert.equal(youtubeThumbnailUrl("https://yt3.ggpht.com.evil.example/a"), null);
  assert.equal(youtubeThumbnailUrl("javascript:alert(1)"), null);
});

test("a stored YouTube avatar is fresh for 30 days and no longer", () => {
  assert.equal(YOUTUBE_AVATAR_MAX_AGE_MS, 30 * 24 * 60 * 60 * 1000);
  const fetched = NOW.getTime() - YOUTUBE_AVATAR_MAX_AGE_MS;
  assert.equal(youtubeAvatarFresh(new Date(fetched).toISOString(), NOW), true);
  assert.equal(youtubeAvatarFresh(new Date(fetched - 1).toISOString(), NOW), false);
  assert.equal(youtubeAvatarFresh(null, NOW), false);
  assert.equal(youtubeAvatarFresh("not-a-date", NOW), false);
  assert.equal(youtubeAvatarFresh(new Date(NOW.getTime() + 4 * 60 * 1000).toISOString(), NOW), true);
  assert.equal(youtubeAvatarFresh(new Date(NOW.getTime() + 6 * 60 * 1000).toISOString(), NOW), false);
});

test("image_disabled hides Commons, YouTube, and the backup", () => {
  const shown = resolvePersonPortrait(row({
    image_disabled: true,
    image_source: "commons",
    image_url: "/standuperzy/abelard-giza.jpg",
    image_width: 1280,
    image_height: 1920,
    image_credit: "Krzysztof Popławski",
    youtube_image_url: YT,
    image_fetched_at: FRESH,
    image_fallback_url: "/standuperzy/kacper-rucinski.jpg",
    image_fallback_width: 1280,
    image_fallback_height: 1920,
  }), NOW);
  assert.equal(shown, null);
});

test("Giza shows the Commons portrait and not the YouTube icon", () => {
  const shown = resolvePersonPortrait(row({
    image_source: "commons",
    image_url: "/standuperzy/abelard-giza.jpg",
    image_width: 1280,
    image_height: 1920,
    image_credit: "Krzysztof Popławski",
    image_license: "CC BY 4.0",
    image_license_url: "https://creativecommons.org/licenses/by/4.0/",
    image_source_url: "https://commons.wikimedia.org/wiki/File:Abelard_Giza,_28_Targi_Książki_w_Krakowie,_2025,_KsP_0991.jpg",
    youtube_channel_url: "https://www.youtube.com/@abelardgiza",
  }), NOW);
  assert.ok(shown);
  assert.equal(shown.kind, "commons");
  assert.equal(shown.channelUrl, null);
  assert.equal(shown.schemaUrl, "https://parska.pl/standuperzy/abelard-giza.jpg");
  assert.equal(shown.ogImage, shown.schemaUrl);
  assert.equal(shown.credit, "Krzysztof Popławski");
  const ld = portraitJsonLd(shown);
  assert.equal(ld.creditText, "Krzysztof Popławski");
  assert.equal(ld.license, "https://creativecommons.org/licenses/by/4.0/");
  assert.equal(ld.caption, undefined);
});

test("Lotek shows Commons and uses a fresh YouTube avatar only for og:image", () => {
  const base = row({
    image_source: "commons",
    image_url: "/standuperzy/lotek-lodkowski.jpg",
    image_width: 485,
    image_height: 648,
    image_credit: "Serecki",
    image_license: "CC BY 4.0",
    image_license_url: "https://creativecommons.org/licenses/by/4.0/",
    image_source_url: "https://commons.wikimedia.org/wiki/File:Lotek.jpg",
    youtube_channel_url: CHANNEL,
    youtube_image_url: YT,
    youtube_image_width: 800,
    youtube_image_height: 800,
  });
  const fresh = resolvePersonPortrait({ ...base, image_fetched_at: FRESH }, NOW);
  assert.ok(fresh);
  assert.equal(fresh.kind, "commons");
  assert.equal(fresh.src, "/standuperzy/lotek-lodkowski.jpg");
  assert.equal(fresh.schemaUrl, "https://parska.pl/standuperzy/lotek-lodkowski.jpg");
  assert.equal(fresh.ogImage, YT);
  assert.equal(fresh.channelUrl, null);

  const waiting = resolvePersonPortrait({ ...base, image_fetched_at: null, youtube_image_url: null }, NOW);
  assert.equal(waiting?.ogImage, "https://parska.pl/standuperzy/lotek-lodkowski.jpg");

  const stale = resolvePersonPortrait({
    ...base,
    image_fetched_at: new Date(NOW.getTime() - YOUTUBE_AVATAR_MAX_AGE_MS - 1).toISOString(),
  }, NOW);
  assert.equal(stale?.ogImage, "https://parska.pl/standuperzy/lotek-lodkowski.jpg");
});

test("YouTube is the default and Commons is only the backup after a refresh", () => {
  const backup = {
    image_fallback_url: "/standuperzy/rafal-sumowski.jpg",
    image_fallback_credit: "Gintek",
    image_fallback_license: "CC BY-SA 4.0",
    image_fallback_license_url: "https://creativecommons.org/licenses/by-sa/4.0/",
    image_fallback_source_url: "https://commons.wikimedia.org/wiki/File:Sumowski.jpg",
    image_fallback_width: 1181,
    image_fallback_height: 1181,
    image_fallback_cropped: true,
    youtube_channel_url: "https://www.youtube.com/@Rafa%C5%82Sumowski",
  };
  const before = resolvePersonPortrait(row({
    image_source: "youtube",
    ...backup,
  }), NOW);
  assert.equal(before, null);

  const live = resolvePersonPortrait(row({
    image_source: "youtube",
    image_url: YT,
    image_width: 800,
    image_height: 800,
    image_fetched_at: FRESH,
    youtube_image_url: YT,
    ...backup,
  }), NOW);
  assert.equal(live?.kind, "youtube");
  assert.equal(live?.src, YT);
  assert.equal(live?.channelUrl, "https://www.youtube.com/@Rafa%C5%82Sumowski");
  assert.equal(live?.ogImage, YT);
  assert.equal(portraitJsonLd(live!).creditText, undefined);
  assert.equal(portraitJsonLd(live!).license, undefined);

  const stale = resolvePersonPortrait(row({
    image_source: "youtube",
    image_url: YT,
    youtube_image_url: YT,
    image_fetched_at: new Date(NOW.getTime() - YOUTUBE_AVATAR_MAX_AGE_MS - 1).toISOString(),
    ...backup,
  }), NOW);
  assert.equal(stale?.kind, "commons");
  assert.equal(stale?.cropped, true);
  assert.equal(stale?.credit, "Gintek");
  assert.equal(stale?.channelUrl, null);
  assert.equal(stale?.ogImage, "https://parska.pl/standuperzy/rafal-sumowski.jpg");
  assert.equal(portraitJsonLd(stale!).caption, "przycięte");
});

test("a confirmed channel is added to sameAs and a bad URL is not", () => {
  assert.deepEqual(
    profileSameAs(["https://www.youtube.com/@abelardgiza"], "https://www.youtube.com/@abelardgiza"),
    ["https://www.youtube.com/@abelardgiza", "https://www.youtube.com/@abelardgiza"],
  );
  assert.deepEqual(profileSameAs([], "javascript:alert(1)"), []);
  const graph = personPageGraph({
    name: "Abelard Giza",
    slug: "abelard-giza",
    image: null,
    photoUrl: "https://cdn.example/should-not-leak.jpg",
    sameAs: profileSameAs(["https://www.youtube.com/@abelardgiza"], "https://www.youtube.com/@abelardgiza"),
  });
  const person = (graph["@graph"] as Record<string, unknown>[])[0] ?? {};
  assert.equal("image" in person, false);
  assert.deepEqual(person.sameAs, ["https://www.youtube.com/@abelardgiza"]);
});

test("the profile page wires the portrait into the header, og:image, and JSON-LD", () => {
  const page = readFileSync(new URL("../app/standuper/[slug]/page.tsx", import.meta.url), "utf8");
  const portrait = readFileSync(new URL("../app/standuper/[slug]/ProfilePortrait.tsx", import.meta.url), "utf8");
  const config = readFileSync(new URL("../next.config.js", import.meta.url), "utf8");
  assert.match(page, /resolvePersonPortrait\(person\)/);
  assert.match(page, /image: portrait\?\.ogImage/);
  assert.match(page, /portraitJsonLd\(portrait\)/);
  assert.match(page, /profileSameAs\(youtubeUrls, person\.youtube_channel_url\)/);
  assert.match(page, /<ProfilePortrait /);
  assert.doesNotMatch(page, /photoUrl: person\.photo_url/);
  assert.match(portrait, /alt=\{name\}/);
  assert.match(portrait, /width=\{portrait\.width\}/);
  assert.match(portrait, /height=\{portrait\.height\}/);
  assert.match(portrait, /priority/);
  assert.match(portrait, /unoptimized=\{youtube\}/);
  assert.match(portrait, /Kanał YouTube/);
  assert.match(portrait, /Wikimedia Commons/);
  assert.match(config, /yt3\.ggpht\.com/);
  assert.match(config, /yt3\.googleusercontent\.com/);
  assert.equal(isMissingPeopleImageColumn({ code: "42703", message: "column people.image_url does not exist" }), true);
  assert.equal(isMissingPeopleImageColumn({ code: "PGRST204", message: "schema cache" }), true);
  assert.equal(isMissingPeopleImageColumn({ code: "XX000", message: "timeout" }), false);
});
