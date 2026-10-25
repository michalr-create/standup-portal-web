import assert from "node:assert/strict";
import { test } from "node:test";
import {
  OPEN_YOUTUBE_LABEL,
  WAKE_LOCK_FAILED,
  WAKE_LOCK_OFF_LABEL,
  createWakeLockSession,
  nextPlaybackEnded,
  openYoutubeWatch,
  openYoutubeWatchInDocument,
  playerHint,
  screenWakeLockSupported,
  shouldHoldWakeLock,
  wakeLockButtonLabel,
  youtubeWatchUrl,
  type WakeLockHandle,
} from "./player-session.ts";

test("wake lock is held only while a supported, visible playback is opted in", () => {
  const base = { enabled: true, supported: true, visible: true, ended: false };
  assert.equal(shouldHoldWakeLock(base), true);
  assert.equal(shouldHoldWakeLock({ ...base, enabled: false }), false);
  assert.equal(shouldHoldWakeLock({ ...base, supported: false }), false);
  assert.equal(shouldHoldWakeLock({ ...base, visible: false }), false);
  assert.equal(shouldHoldWakeLock({ ...base, ended: true }), false);
});

test("support requires a secure context and wakeLock.request", () => {
  const nav = { wakeLock: { request: () => Promise.resolve({} as WakeLockHandle) } };
  assert.equal(screenWakeLockSupported(nav, true), true);
  assert.equal(screenWakeLockSupported(nav, false), false);
  assert.equal(screenWakeLockSupported({}, true), false);
  assert.equal(screenWakeLockSupported(undefined, true), false);
});

test("playback end follows the real ended state, not pause", () => {
  assert.equal(nextPlaybackEnded(false, 0, false), false);
  assert.equal(nextPlaybackEnded(false, 0, true), true);
  assert.equal(nextPlaybackEnded(true, 2, true), true);
  assert.equal(nextPlaybackEnded(true, 1, true), false);
  assert.equal(nextPlaybackEnded(false, null, false), false);
});

test("labels stay honest about what the controls do", () => {
  assert.equal(wakeLockButtonLabel(false), WAKE_LOCK_OFF_LABEL);
  assert.equal(wakeLockButtonLabel(true), "Ekran włączony");
  assert.match(playerHint(true), /nie jest|film staje|Premium/i);
  assert.match(playerHint(false), /nie trzyma ekranu/);
  assert.match(playerHint(true), /Premium/);
  assert.equal(OPEN_YOUTUBE_LABEL, "Otwórz w YouTube");
  assert.match(WAKE_LOCK_FAILED, /Nie udało się/);
});

test("youtube link is the https watch page for this video", () => {
  assert.equal(youtubeWatchUrl("dQw4w9WgXcQ"), "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  assert.equal(youtubeWatchUrl("a b"), "https://www.youtube.com/watch?v=a%20b");
});

test("open uses a new-tab anchor so the modal stays put", () => {
  let opened = "";
  const href = openYoutubeWatch("abc123", (url) => {
    opened = url;
  });
  assert.equal(href, "https://www.youtube.com/watch?v=abc123");
  assert.equal(opened, href);

  let clicked = false;
  let removed = false;
  const el = {
    href: "",
    target: "",
    rel: "",
    click: () => {
      clicked = true;
    },
    remove: () => {
      removed = true;
    },
  };
  openYoutubeWatchInDocument("abc123", {
    createElement: () => el,
    body: { appendChild: () => {} },
  } as unknown as Document);
  assert.equal(el.href, "https://www.youtube.com/watch?v=abc123");
  assert.equal(el.target, "_blank");
  assert.equal(el.rel, "noopener noreferrer");
  assert.equal(clicked, true);
  assert.equal(removed, true);
});

test("session holds one sentinel and releases it", async () => {
  let releaseCount = 0;
  const sentinel: WakeLockHandle = {
    released: false,
    release: async () => {
      sentinel.released = true;
      releaseCount += 1;
    },
  };
  let requests = 0;
  const session = createWakeLockSession({
    request: async () => {
      requests += 1;
      sentinel.released = false;
      return sentinel;
    },
  });
  assert.equal(await session.request(), "held");
  assert.equal(await session.request(), "held");
  assert.equal(requests, 1);
  await session.release();
  assert.equal(releaseCount, 1);
  assert.equal(await session.sync(false), "released");
});

test("request failure stays inside the session", async () => {
  const session = createWakeLockSession({
    request: async () => {
      throw new DOMException("denied", "NotAllowedError");
    },
  });
  assert.equal(await session.request(), "failed");
  assert.equal(await session.sync(true), "failed");
});

test("a hidden page drops an in-flight request", async () => {
  let resolveRequest: (sentinel: WakeLockHandle) => void = () => {};
  const session = createWakeLockSession({
    request: () =>
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
  });
  const pending = session.request();
  await session.release();
  let released = false;
  resolveRequest({
    released: false,
    release: async () => {
      released = true;
    },
  });
  assert.equal(await pending, "released");
  assert.equal(released, true);
});

test("browser release lets the next sync acquire again", async () => {
  let onRelease: (() => void) | undefined;
  let requests = 0;
  const session = createWakeLockSession({
    request: async () => {
      requests += 1;
      return {
        released: false,
        release: async () => {},
        addEventListener: (_type, listener) => {
          onRelease = listener;
        },
      };
    },
  });
  assert.equal(await session.sync(true), "held");
  onRelease?.();
  assert.equal(await session.sync(true), "held");
  assert.equal(requests, 2);
});
