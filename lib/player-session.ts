export const WAKE_LOCK_OFF_LABEL = "Nie wygaszaj ekranu";
export const WAKE_LOCK_ON_LABEL = "Ekran włączony";
export const WAKE_LOCK_TITLE =
  "Trzyma ekran włączony, gdy telefon leży na stole. Po ręcznym zgaszeniu ekranu film i tak stanie. To nie jest odtwarzanie w tle.";
export const WAKE_LOCK_UNSUPPORTED_TITLE =
  "Ta przeglądarka nie obsługuje blokady wygaszania ekranu. Na iPhonie działa od Safari 16.4.";
export const WAKE_LOCK_FAILED = "Nie udało się zatrzymać wygaszania ekranu.";
export const OPEN_YOUTUBE_LABEL = "Otwórz w YouTube";
export const OPEN_YOUTUBE_TITLE =
  "Otwiera ten sam film na YouTube. Odtwarzanie w tle przy zgaszonym ekranie w aplikacji wymaga YouTube Premium. Obraz w obrazie po przełączeniu aplikacji to osobna sprawa.";

export function wakeLockButtonLabel(enabled: boolean): string {
  return enabled ? WAKE_LOCK_ON_LABEL : WAKE_LOCK_OFF_LABEL;
}

export function playerHint(wakeSupported: boolean): string {
  if (!wakeSupported) {
    return "Ta przeglądarka nie trzyma ekranu włączonego. Tło przy zgaszonym ekranie jest w aplikacji YouTube i wymaga Premium.";
  }
  return "Ekran zostaje włączony tylko podczas oglądania. Po zgaszeniu telefonu film staje. Tło w aplikacji YouTube wymaga Premium.";
}

/** One visible line. Screen-off playback stays in the YouTube app and is not promised here. */
export const PLAYER_HINT_LINE = "Po zgaszeniu ekranu film staje.";

export function screenWakeLockSupported(
  nav: { wakeLock?: { request?: unknown } } | null | undefined,
  secureContext: boolean,
): boolean {
  return secureContext && typeof nav?.wakeLock?.request === "function";
}

export function shouldHoldWakeLock(input: {
  enabled: boolean;
  supported: boolean;
  visible: boolean;
  ended: boolean;
}): boolean {
  return input.enabled && input.supported && input.visible && !input.ended;
}

export function nextPlaybackEnded(prevEnded: boolean, playerState: number | null, seenPlaying: boolean): boolean {
  if (playerState === 1) return false;
  if (seenPlaying && playerState === 0) return true;
  return prevEnded;
}

// https watch URL, not youtube://. The custom scheme errors when the app is
// missing and can navigate the portal away. A normal watch link keeps the
// modal open; Android App Links and iOS hand it to the YouTube app when the OS allows it.
export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}

export function openYoutubeWatch(videoId: string, open: (url: string) => void): string {
  const href = youtubeWatchUrl(videoId);
  open(href);
  return href;
}

export function openYoutubeWatchInDocument(videoId: string, doc: Document): string {
  return openYoutubeWatch(videoId, (url) => {
    const link = doc.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    doc.body.appendChild(link);
    link.click();
    link.remove();
  });
}

export type WakeLockHandle = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener?: (type: "release", listener: () => void) => void;
};

export type ScreenWakeLockApi = {
  request: (type: "screen") => Promise<WakeLockHandle>;
};

export type WakeLockResult = "held" | "released" | "failed";

export function createWakeLockSession(wakeLock: ScreenWakeLockApi) {
  let sentinel: WakeLockHandle | null = null;
  let generation = 0;

  const release = async (): Promise<void> => {
    generation += 1;
    const current = sentinel;
    sentinel = null;
    if (!current || current.released) return;
    try {
      await current.release();
    } catch {
      // The browser may already have released the lock.
    }
  };

  const request = async (): Promise<WakeLockResult> => {
    if (sentinel && !sentinel.released) return "held";
    const ticket = generation + 1;
    generation = ticket;
    try {
      const next = await wakeLock.request("screen");
      if (ticket !== generation) {
        try {
          await next.release();
        } catch {
          // Ignore a sentinel the browser already dropped.
        }
        return "released";
      }
      sentinel = next;
      next.addEventListener?.("release", () => {
        if (sentinel !== next) return;
        sentinel = null;
      });
      return "held";
    } catch {
      if (ticket === generation) sentinel = null;
      return "failed";
    }
  };

  const sync = async (want: boolean): Promise<WakeLockResult> => {
    if (!want) {
      await release();
      return "released";
    }
    return request();
  };

  return { request, release, sync };
}
