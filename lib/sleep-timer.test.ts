import assert from "node:assert/strict";
import { test } from "node:test";
import {
  EMPTY_YT_SNAPSHOT,
  SLEEP_OPTIONS,
  formatTimer,
  isTimerDue,
  isYouTubeOrigin,
  parseYtMessage,
  readYtPayload,
  remainingSeconds,
  shouldStopAtEnd,
  sleepButtonLabel,
  ytCommand,
} from "./sleep-timer.ts";

test("sleep options match the YouTube-style set", () => {
  assert.deepEqual(
    SLEEP_OPTIONS.map((option) => option.label),
    ["Wył.", "5 min", "10 min", "15 min", "30 min", "45 min", "60 min", "Koniec filmu"],
  );
  assert.equal(SLEEP_OPTIONS.find((option) => option.id === "15")?.seconds, 900);
  assert.equal(SLEEP_OPTIONS.find((option) => option.id === "60")?.seconds, 3600);
});

test("formats a countdown and the button label", () => {
  assert.equal(formatTimer(65), "1:05");
  assert.equal(formatTimer(3600), "1:00:00");
  assert.equal(sleepButtonLabel("off", null), "\u23f1 Wy\u0142\u0105cznik czasowy");
  assert.equal(sleepButtonLabel("15", 90), "\u23f1 Wy\u0142\u0105czy si\u0119 za 1:30");
  assert.equal(sleepButtonLabel("end", null), "\u23f1 Do ko\u0144ca filmu");
});

test("deadline math uses wall clock time", () => {
  assert.equal(remainingSeconds(10_500, 10_000), 1);
  assert.equal(remainingSeconds(10_000, 10_000), 0);
  assert.equal(remainingSeconds(null, 10_000), null);
  assert.equal(isTimerDue(10_000, 10_000), true);
  assert.equal(isTimerDue(10_001, 10_000), false);
});

test("parses YouTube widget messages", () => {
  const raw = JSON.stringify({
    event: "infoDelivery",
    info: { playerState: 1, currentTime: 12.2, duration: 90, videoData: { video_id: "abc" } },
  });
  const parsed = parseYtMessage(readYtPayload(raw), EMPTY_YT_SNAPSHOT);
  assert.deepEqual(parsed, { playerState: 1, currentTime: 12.2, duration: 90, videoId: "abc" });

  const ended = parseYtMessage({ event: "onStateChange", info: 0 }, parsed);
  assert.equal(ended.playerState, 0);
  assert.equal(ended.videoId, "abc");
});

test("end of video waits until this film finishes or another one starts", () => {
  const playing = { ...EMPTY_YT_SNAPSHOT, playerState: 1, currentTime: 10, duration: 90, videoId: "abc" };
  assert.equal(shouldStopAtEnd(playing, "abc", true), false);
  assert.equal(shouldStopAtEnd({ ...playing, playerState: 0 }, "abc", false), false);
  assert.equal(shouldStopAtEnd({ ...playing, playerState: 0 }, "abc", true), true);
  assert.equal(shouldStopAtEnd({ ...playing, currentTime: 89.8 }, "abc", true), true);
  assert.equal(shouldStopAtEnd({ ...playing, videoId: "next" }, "abc", false), true);
});

test("accepts only youtube.com widget origins and addresses the player", () => {
  assert.equal(isYouTubeOrigin("https://www.youtube.com"), true);
  assert.equal(isYouTubeOrigin("https://youtube.com"), true);
  assert.equal(isYouTubeOrigin("https://notyoutube.com"), false);
  assert.equal(isYouTubeOrigin("https://www.youtube.com.evil.com"), false);
  assert.deepEqual(ytCommand("pauseVideo", "parska-yt"), {
    event: "command",
    func: "pauseVideo",
    args: [],
    id: "parska-yt",
    channel: "widget",
  });
});
