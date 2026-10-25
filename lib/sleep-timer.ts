export const SLEEP_OPTIONS = [
  { id: "off", label: "Wył." },
  { id: "5", label: "5 min", seconds: 5 * 60 },
  { id: "10", label: "10 min", seconds: 10 * 60 },
  { id: "15", label: "15 min", seconds: 15 * 60 },
  { id: "30", label: "30 min", seconds: 30 * 60 },
  { id: "45", label: "45 min", seconds: 45 * 60 },
  { id: "60", label: "60 min", seconds: 60 * 60 },
  { id: "end", label: "Koniec filmu" },
] as const;

export type SleepOption = (typeof SLEEP_OPTIONS)[number];
export type SleepOptionId = SleepOption["id"];

export type YtSnapshot = {
  playerState: number | null;
  currentTime: number | null;
  duration: number | null;
  videoId: string | null;
};

export const EMPTY_YT_SNAPSHOT: YtSnapshot = {
  playerState: null,
  currentTime: null,
  duration: null,
  videoId: null,
};

export function formatTimer(secs: number): string {
  const safe = Math.max(0, secs);
  const s = safe % 60;
  const m = Math.floor(safe / 60) % 60;
  const h = Math.floor(safe / 3600);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function sleepButtonLabel(choice: SleepOptionId, remaining: number | null): string {
  if (choice === "end") return "\u23f1 Do ko\u0144ca filmu";
  if (choice !== "off" && remaining !== null) {
    return `\u23f1 Wy\u0142\u0105czy si\u0119 za ${formatTimer(remaining)}`;
  }
  return "\u23f1 Wy\u0142\u0105cznik czasowy";
}

export function remainingSeconds(deadline: number | null, now: number): number | null {
  if (deadline === null) return null;
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

export function isTimerDue(deadline: number | null, now: number): boolean {
  return deadline !== null && now >= deadline;
}

export function isTimedOption(option: SleepOption): option is SleepOption & { seconds: number } {
  return "seconds" in option;
}

export function isYouTubeOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname;
    return host === "youtube.com" || host.endsWith(".youtube.com");
  } catch {
    return false;
  }
}

export function readYtPayload(data: unknown): unknown {
  if (typeof data !== "string") return data;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function parseYtMessage(data: unknown, prev: YtSnapshot): YtSnapshot {
  if (!data || typeof data !== "object") return prev;
  const message = data as { event?: string; info?: unknown };
  const next: YtSnapshot = { ...prev };
  if (message.event === "onStateChange" && typeof message.info === "number") {
    next.playerState = message.info;
  }
  if (!message.info || typeof message.info !== "object") return next;
  const info = message.info as {
    playerState?: unknown;
    currentTime?: unknown;
    duration?: unknown;
    videoData?: { video_id?: unknown };
  };
  if (typeof info.playerState === "number") next.playerState = info.playerState;
  if (typeof info.currentTime === "number") next.currentTime = info.currentTime;
  if (typeof info.duration === "number" && info.duration > 0) next.duration = info.duration;
  if (typeof info.videoData?.video_id === "string" && info.videoData.video_id) {
    next.videoId = info.videoData.video_id;
  }
  return next;
}

export function shouldStopAtEnd(snapshot: YtSnapshot, expectedVideoId: string, seenPlaying: boolean): boolean {
  if (snapshot.videoId && snapshot.videoId !== expectedVideoId) return true;
  if (!seenPlaying) return false;
  if (snapshot.playerState === 0) return true;
  return (
    snapshot.duration !== null &&
    snapshot.currentTime !== null &&
    snapshot.currentTime >= snapshot.duration - 0.5 &&
    snapshot.playerState === 1
  );
}

export function ytListening(id: string) {
  return { event: "listening" as const, id, channel: "widget" as const };
}

export function ytCommand(func: string, id: string, args: unknown[] = []) {
  return { event: "command" as const, func, args, id, channel: "widget" as const };
}
