import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { refreshYoutubeAvatars } from "./refresh-youtube-avatars.ts";
import {
  channelsListUrl,
  fetchChannelThumbnails,
  parseChannelItem,
  pickChannelThumbnail,
  planAvatarWrites,
  type AvatarWrite,
} from "./youtube-avatars.ts";

const CHANNEL = "UCG3mQRagegeLjQ6E2OBTZpQ";
const HIGH = "https://yt3.googleusercontent.com/ytc/LotekFace=s800-c-k-c0x00ffffff-no-rj";

test("channels.list prefers high and does not rewrite the URL", () => {
  const picked = pickChannelThumbnail({
    default: { url: "https://yt3.ggpht.com/small", width: 88, height: 88 },
    medium: { url: "https://yt3.ggpht.com/medium", width: 240, height: 240 },
    high: { url: HIGH, width: 800, height: 800 },
  });
  assert.deepEqual(picked, { url: HIGH, width: 800, height: 800 });
  const httpHigh = pickChannelThumbnail({
    high: { url: "http://yt3.ggpht.com/nope", width: 800, height: 800 },
    medium: { url: "https://yt3.ggpht.com/medium" },
  });
  assert.equal(httpHigh?.url, "https://yt3.ggpht.com/medium");
  assert.equal(httpHigh?.width, 240);
  assert.equal(pickChannelThumbnail({ default: { url: "https://example.com/a.jpg" } }), null);
});

test("a YouTube row copies the hotlink and a Commons row does not", () => {
  const now = new Date("2026-11-25T12:00:00.000Z");
  const found = new Map([
    [CHANNEL, { url: HIGH, width: 800, height: 800 }],
    ["UCEe12n7pL9Pl-i6qxBmpyeg", null],
  ]);
  const writes = planAvatarWrites([
    { id: 2, image_source: "commons", youtube_channel_id: CHANNEL },
    { id: 3, image_source: "commons", youtube_channel_id: "UCEe12n7pL9Pl-i6qxBmpyeg" },
    { id: 1, image_source: "youtube", youtube_channel_id: "UCIXAK3v6fgWHu0_jN8HmOUg" },
  ], found, now);
  const lotek = writes.find((row) => row.id === 2);
  const giza = writes.find((row) => row.id === 3);
  assert.ok(lotek);
  assert.equal(lotek.youtube_image_url, HIGH);
  assert.equal("image_url" in lotek, false);
  assert.equal(giza?.youtube_image_url, null);
  assert.equal(writes.some((row) => row.id === 1), false);
  assert.equal(parseChannelItem({ id: "not-a-channel", snippet: {} }), null);
});

test("a failed API call does not clear stored URLs", async () => {
  const writes: AvatarWrite[] = [];
  await assert.rejects(
    () => refreshYoutubeAvatars({
      apiKey: "secret-key",
      loadRows: async () => [{ id: 1, image_source: "youtube", youtube_channel_id: "UCIXAK3v6fgWHu0_jN8HmOUg" }],
      write: async (row) => { writes.push(row); },
      revalidate: () => {},
      fetchImpl: async () => new Response("no", { status: 403 }),
    }),
    /youtube_api_error/,
  );
  assert.equal(writes.length, 0);
});

test("a successful refresh stores the API url and does not log the key", async () => {
  const writes: AvatarWrite[] = [];
  let seenUrl = "";
  const result = await refreshYoutubeAvatars({
    apiKey: "secret-key",
    now: new Date("2026-11-25T12:00:00.000Z"),
    revalidate: () => {},
    loadRows: async () => [
      { id: 1, image_source: "youtube", youtube_channel_id: "UCIXAK3v6fgWHu0_jN8HmOUg" },
      { id: 2, image_source: "commons", youtube_channel_id: CHANNEL },
    ],
    write: async (row) => { writes.push(row); },
    fetchImpl: async (url) => {
      seenUrl = String(url);
      return new Response(JSON.stringify({
        items: [{
          id: "UCIXAK3v6fgWHu0_jN8HmOUg",
          snippet: { thumbnails: { high: { url: "https://yt3.ggpht.com/paczes=s800", width: 800, height: 800 } } },
        }],
      }), { status: 200, headers: { "content-type": "application/json" } });
    },
  });
  assert.equal(seenUrl.includes("key=secret-key"), true);
  assert.equal(seenUrl.includes(CHANNEL), true);
  assert.equal(result.updated, 1);
  assert.equal(result.cleared, 1);
  const paczes = writes.find((row) => row.id === 1);
  const lotek = writes.find((row) => row.id === 2);
  assert.equal(paczes?.image_url, "https://yt3.ggpht.com/paczes=s800");
  assert.equal(paczes?.youtube_image_url, paczes?.image_url);
  assert.equal(lotek?.youtube_image_url, null);
  assert.equal("image_url" in (lotek ?? {}), false);
  assert.equal(channelsListUrl(["UC1"], "secret-key").includes("part=snippet"), true);
  await assert.rejects(
    () => refreshYoutubeAvatars({ apiKey: "  ", loadRows: async () => [], write: async () => {}, revalidate: () => {} }),
    /missing_youtube_api_key/,
  );
});

test("avatar refresh batches channels and rejects a body without items", async () => {
  const found = await fetchChannelThumbnails(
    ["UCIXAK3v6fgWHu0_jN8HmOUg", CHANNEL],
    "secret-key",
    async () => new Response(JSON.stringify({
      items: [{
        id: "UCIXAK3v6fgWHu0_jN8HmOUg",
        snippet: { thumbnails: { high: { url: "https://yt3.ggpht.com/a", width: 800, height: 800 } } },
      }],
    }), { status: 200 }),
  );
  assert.equal(found.get("UCIXAK3v6fgWHu0_jN8HmOUg")?.url, "https://yt3.ggpht.com/a");
  assert.equal(found.get(CHANNEL), null);
  await assert.rejects(
    () => fetchChannelThumbnails([CHANNEL], "k", async () => new Response("{}", { status: 200 })),
    /youtube_api_error/,
  );
});

test("the cron route requires CRON_SECRET and does not print the API key", () => {
  const route = readFileSync(new URL("../app/api/cron/youtube-avatars/route.ts", import.meta.url), "utf8");
  const cron = readFileSync(new URL("../vercel.json", import.meta.url), "utf8");
  assert.match(route, /secretsMatch/);
  assert.match(route, /CRON_SECRET/);
  assert.match(route, /missing_youtube_api_key/);
  assert.doesNotMatch(route, /console\.(log|error)\([^)]*apiKey/);
  assert.match(cron, /\/api\/cron\/youtube-avatars/);
  assert.match(cron, /0 4 1,15 \* \*/);
});
