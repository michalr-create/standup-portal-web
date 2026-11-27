import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  shouldFallbackToYoutubeHost,
  shouldMountYoutubePlayer,
  youtubeEmbedSrc,
} from "./youtube-embed.ts";

test("the player stays on the poster until consent or an explicit play click", () => {
  assert.equal(shouldMountYoutubePlayer({ embedsConsent: false, explicitPlay: false }), false);
  assert.equal(shouldMountYoutubePlayer({ embedsConsent: true, explicitPlay: false }), true);
  assert.equal(shouldMountYoutubePlayer({ embedsConsent: false, explicitPlay: true }), true);
});

test("the default embed host is youtube-nocookie and fallback needs an explicit click", () => {
  const src = youtubeEmbedSrc("abcdefghijk", { phoneEmbed: false, origin: "https://parska.pl" });
  assert.match(src, /^https:\/\/www\.youtube-nocookie\.com\/embed\/abcdefghijk\?/);
  assert.match(src, /enablejsapi=1/);
  assert.match(src, /autoplay=1/);
  assert.doesNotMatch(src, /youtube\.com\/embed/);
  assert.equal(shouldFallbackToYoutubeHost({ explicitPlay: false, host: "nocookie", heardApi: false }), false);
  assert.equal(shouldFallbackToYoutubeHost({ explicitPlay: true, host: "nocookie", heardApi: false }), true);
  assert.equal(shouldFallbackToYoutubeHost({ explicitPlay: true, host: "nocookie", heardApi: true }), false);
});

test("VideoModal does not put an iframe in the tree until the player is mounted", () => {
  const modal = readFileSync(new URL("../app/components/VideoModal.tsx", import.meta.url), "utf8");
  assert.match(modal, /playerMounted \? \([\s\S]*<iframe/);
  assert.match(modal, /video-modal-gate/);
  assert.match(modal, /Zapamiętaj wybór \(zgoda na osadzenia YouTube\)/);
  assert.match(modal, /youtubeEmbedSrc|embedSrc\(videoId, phoneEmbed, embedHost\)/);
  assert.doesNotMatch(modal, /https:\/\/www\.youtube\.com\/embed\//);
  assert.match(modal, /trackParska\("video_play"/);
  const special = readFileSync(new URL("../app/specjale/[slug]/page.tsx", import.meta.url), "utf8");
  assert.match(special, /YoutubeClickToLoad/);
  assert.doesNotMatch(special, /youtube\.com\/embed/);
});
