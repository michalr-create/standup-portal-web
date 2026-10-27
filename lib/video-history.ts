/**
 * In-app history entry for the video player.
 * Android Chrome (including the installed PWA) fires `popstate` for the system
 * Back button. iOS standalone has no system Back; browser Back still pops.
 *
 * `__NA` is Next.js App Router's marker. Setting it makes the patched
 * `history.pushState` keep this entry as a same-page player state instead of
 * starting a route transition. The hash changes the URL so Back is a real
 * history step in standalone PWAs that ignore same-URL pushes.
 */
export const VIDEO_HISTORY_HASH = "odtwarzacz";
export const VIDEO_HISTORY_KEY = "parskaVideo";

export function videoHistoryState(current: unknown, videoId: string): Record<string, unknown> {
  const base =
    current !== null && typeof current === "object"
      ? { ...(current as Record<string, unknown>) }
      : {};
  return {
    ...base,
    __NA: true,
    [VIDEO_HISTORY_KEY]: videoId,
  };
}

/** Same path and query, with the player hash. Relative, so the origin stays. */
export function videoHistoryUrl(href: string): string {
  const url = new URL(href, "http://localhost");
  return `${url.pathname}${url.search}#${VIDEO_HISTORY_HASH}`;
}

export function shouldRewindVideoHistory(input: { pushed: boolean; popped: boolean }): boolean {
  return input.pushed && !input.popped;
}

export function isVideoHistoryEntry(state: unknown, videoId: string): boolean {
  if (state === null || typeof state !== "object") return false;
  return (state as Record<string, unknown>)[VIDEO_HISTORY_KEY] === videoId;
}

export type VideoHistorySession = {
  history: {
    state: unknown;
    pushState: (data: unknown, unused: string, url?: string | null) => void;
    back: () => void;
  };
  href: string;
  listen: (listener: () => void) => () => void;
};

let openBindings = 0;

/**
 * Push one history entry while the player is open.
 * System Back runs `onBack` and leaves the entry consumed.
 * Closing from the UI rewinds that entry so the next Back leaves the page.
 * `schedule` defaults to a microtask so a strict-mode remount can cancel the rewind.
 */
export function bindVideoHistory(
  session: VideoHistorySession,
  videoId: string,
  onBack: () => void,
  schedule: (fn: () => void) => void = queueMicrotask,
): () => void {
  openBindings += 1;
  let popped = false;
  // Strict mode remounts while the entry from the first setup is still current.
  // A second push would leave a leftover #odtwarzacz after Back.
  if (!isVideoHistoryEntry(session.history.state, videoId)) {
    session.history.pushState(
      videoHistoryState(session.history.state, videoId),
      "",
      videoHistoryUrl(session.href),
    );
  }
  const stop = session.listen(() => {
    if (popped) return;
    popped = true;
    onBack();
  });
  return () => {
    stop();
    openBindings -= 1;
    if (!shouldRewindVideoHistory({ pushed: true, popped })) return;
    // React strict mode runs effect setup, cleanup, setup again before
    // microtasks. Rewinding immediately would pop the remounted entry and
    // close the player. Wait, and skip the rewind if a player is open again.
    schedule(() => {
      if (openBindings > 0 || popped) return;
      if (!isVideoHistoryEntry(session.history.state, videoId)) return;
      popped = true;
      session.history.back();
    });
  };
}
