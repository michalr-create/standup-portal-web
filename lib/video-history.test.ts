import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  VIDEO_HISTORY_HASH,
  VIDEO_HISTORY_KEY,
  bindVideoHistory,
  shouldRewindVideoHistory,
  videoHistoryState,
  videoHistoryUrl,
} from "./video-history.ts";

test("player history keeps the Next marker and the video id", () => {
  const state = videoHistoryState(
    { __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: ["page"] },
    "abc123",
  );
  assert.equal(state.__NA, true);
  assert.equal(state[VIDEO_HISTORY_KEY], "abc123");
  assert.deepEqual(state.__PRIVATE_NEXTJS_INTERNALS_TREE, ["page"]);
});

test("player url changes the hash and keeps path and query", () => {
  assert.equal(
    videoHistoryUrl("https://parska.pl/standup?osoba=lotek&page=2"),
    `/standup?osoba=lotek&page=2#${VIDEO_HISTORY_HASH}`,
  );
  assert.equal(videoHistoryUrl("https://parska.pl/"), `/#${VIDEO_HISTORY_HASH}`);
  assert.equal(
    videoHistoryUrl(`https://parska.pl/format/dzin#inne`),
    `/format/dzin#${VIDEO_HISTORY_HASH}`,
  );
});

test("UI close rewinds the entry; system Back already consumed it", () => {
  assert.equal(shouldRewindVideoHistory({ pushed: true, popped: false }), true);
  assert.equal(shouldRewindVideoHistory({ pushed: true, popped: true }), false);
  assert.equal(shouldRewindVideoHistory({ pushed: false, popped: false }), false);
});

test("system Back closes the player and does not rewind again", () => {
  const pushes: { data: unknown; url: string | null | undefined }[] = [];
  let backs = 0;
  let listener: (() => void) | null = null;
  let closed = 0;
  const session = {
    href: "https://parska.pl/specjale?page=2",
    history: {
      state: { __NA: true, tree: 1 },
      pushState(data: unknown, _unused: string, url?: string | null) {
        pushes.push({ data, url });
      },
      back() {
        backs += 1;
      },
    },
    listen(next: () => void) {
      listener = next;
      return () => {
        listener = null;
      };
    },
  };

  const cleanup = bindVideoHistory(session, "vid", () => {
    closed += 1;
  });

  assert.equal(pushes.length, 1);
  assert.equal(pushes[0]?.url, `/specjale?page=2#${VIDEO_HISTORY_HASH}`);
  assert.equal((pushes[0]?.data as { parskaVideo?: string }).parskaVideo, "vid");
  assert.equal((pushes[0]?.data as { __NA?: boolean }).__NA, true);
  assert.equal((pushes[0]?.data as { tree?: number }).tree, 1);

  listener?.();
  listener?.();
  cleanup();

  assert.equal(closed, 1);
  assert.equal(backs, 0);
  assert.equal(listener, null);
});

function fakeHistory(initial: unknown = null) {
  let backs = 0;
  let pushes = 0;
  const history: {
    state: unknown;
    pushState: (data: unknown, unused: string, url?: string | null) => void;
    back: () => void;
  } = {
    state: initial,
    pushState(data: unknown) {
      pushes += 1;
      history.state = data;
    },
    back() {
      backs += 1;
      history.state = initial;
    },
  };
  return {
    history,
    get backs() {
      return backs;
    },
    get pushes() {
      return pushes;
    },
  };
}

test("closing from the UI rewinds exactly once", async () => {
  const fake = fakeHistory(null);
  const cleanup = bindVideoHistory(
    {
      href: "https://parska.pl/",
      history: fake.history,
      listen() {
        return () => {};
      },
    },
    "vid",
    () => {},
  );

  cleanup();
  assert.equal(fake.backs, 0);
  await new Promise((resolve) => queueMicrotask(resolve));
  assert.equal(fake.pushes, 1);
  assert.equal(fake.backs, 1);
});

test("strict-mode remount pushes one entry and rewinds once on close", () => {
  let closed = 0;
  const queued: (() => void)[] = [];
  const fake = fakeHistory({ __NA: true });
  const session = {
    href: "https://parska.pl/",
    history: fake.history,
    listen() {
      return () => {};
    },
  };
  const schedule = (fn: () => void) => {
    queued.push(fn);
  };

  const first = bindVideoHistory(session, "vid", () => {
    closed += 1;
  }, schedule);
  first();
  const second = bindVideoHistory(session, "vid", () => {
    closed += 1;
  }, schedule);
  queued.splice(0).forEach((fn) => fn());

  assert.equal(fake.pushes, 1);
  assert.equal(fake.backs, 0);
  assert.equal(closed, 0);

  second();
  queued.splice(0).forEach((fn) => fn());
  assert.equal(fake.backs, 1);
  assert.equal(closed, 0);
});

test("VideoModal binds the player history entry", () => {
  const modal = readFileSync(new URL("../app/components/VideoModal.tsx", import.meta.url), "utf8");
  assert.match(modal, /bindVideoHistory/);
  assert.match(modal, /popstate/);
});
