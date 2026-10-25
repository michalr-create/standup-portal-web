"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { Item } from "@/lib/data";
import {
  OPEN_YOUTUBE_LABEL,
  OPEN_YOUTUBE_TITLE,
  PLAYER_HINT_LINE,
  WAKE_LOCK_FAILED,
  WAKE_LOCK_TITLE,
  WAKE_LOCK_UNSUPPORTED_TITLE,
  createWakeLockSession,
  nextPlaybackEnded,
  openYoutubeWatchInDocument,
  playerHint,
  screenWakeLockSupported,
  shouldHoldWakeLock,
  wakeLockButtonLabel,
} from "@/lib/player-session";
import {
  EMPTY_YT_SNAPSHOT,
  SLEEP_OPTIONS,
  isTimedOption,
  isTimerDue,
  isYouTubeOrigin,
  parseYtMessage,
  readYtPayload,
  remainingSeconds,
  shouldStopAtEnd,
  sleepButtonLabel,
  ytCommand,
  ytListening,
  type SleepOptionId,
  type YtSnapshot,
} from "@/lib/sleep-timer";

type Props = {
  item: Item;
  videoId: string;
  onClose: () => void;
};

const YT_FRAME_ID = "parska-yt";
const YT_TARGET = "https://www.youtube.com";
const YT_ALLOW = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen";

const PHONE_LANDSCAPE_QUERY = "(orientation: landscape) and (max-height: 560px) and (pointer: coarse)";

function embedSrc(videoId: string, phoneEmbed: boolean): string {
  const params = new URLSearchParams({
    autoplay: "1",
    playsinline: "1",
    enablejsapi: "1",
  });
  if (phoneEmbed) params.set("fs", "0");
  // The widget API drops commands unless the embed was opened for this origin.
  if (typeof window !== "undefined") params.set("origin", window.location.origin);
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

function isPhoneEmbed(): boolean {
  if (typeof window === "undefined") return false;
  if (!window.matchMedia("(pointer: coarse)").matches) return false;
  const screenShort = Math.min(window.screen.width, window.screen.height);
  const viewportShort = Math.min(window.innerWidth, window.innerHeight);
  // Viewport covers DevTools and browsers that report a desktop screen size.
  // The shorter side is stable across rotation, so the embed URL does not reload.
  return Math.min(screenShort, viewportShort) <= 600;
}

function isIosDevice(): boolean {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

function currentFullscreenElement(): Element | null {
  const doc = document as FullscreenDocument;
  return doc.fullscreenElement || doc.webkitFullscreenElement || null;
}

function syncVisualViewport() {
  const vv = window.visualViewport;
  const root = document.documentElement;
  root.style.setProperty("--video-vvw", `${Math.round(vv?.width ?? window.innerWidth)}px`);
  root.style.setProperty("--video-vvh", `${Math.round(vv?.height ?? window.innerHeight)}px`);
  root.style.setProperty("--video-vv-top", `${Math.round(vv?.offsetTop ?? 0)}px`);
  root.style.setProperty("--video-vv-left", `${Math.round(vv?.offsetLeft ?? 0)}px`);
}

const iconBtnClass = "video-modal-icon-btn shrink-0 inline-flex items-center justify-center min-h-11 min-w-11 h-11 w-11 rounded-full p-0";

const iconBtnStyle: CSSProperties = {
  background: "rgba(255,255,255,0.1)",
  color: "var(--paper)",
};

function youtubePosterUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
}

const barIconBtnStyle: CSSProperties = {
  background: "rgba(11,11,11,0.72)",
  color: "var(--paper)",
  border: "1px solid rgba(255,255,255,0.22)",
};

function ExpandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M6 2v4H2M10 2v4h4M14 10h-4v4M2 10h4v4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TimerControls({
  choice,
  remaining,
  stopped,
  menuOpen,
  onToggleMenu,
  onSelect,
  onCancel,
}: {
  choice: SleepOptionId;
  remaining: number | null;
  stopped: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onSelect: (id: SleepOptionId) => void;
  onCancel: () => void;
}) {
  const running = choice !== "off";
  return (
    <div className="video-modal-timer" data-sleep={stopped ? "stopped" : choice}>
      <div className="video-modal-timer-row">
        <button
          type="button"
          className="video-modal-timer-btn"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={onToggleMenu}
        >
          {sleepButtonLabel(choice, remaining)}
        </button>
        {running && (
          <button type="button" className="video-modal-timer-btn" onClick={onCancel}>
            Anuluj
          </button>
        )}
        {stopped && (
          <span className="video-modal-timer-status" role="status">
            Zatrzymano
          </span>
        )}
      </div>
      {menuOpen && (
        <div className="video-modal-timer-menu" role="menu" aria-label="Wy\u0142\u0105cznik czasowy">
          {SLEEP_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="menuitemradio"
              aria-checked={choice === option.id}
              className="video-modal-timer-option"
              onClick={() => onSelect(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PlayerHint({ supported }: { supported: boolean }) {
  const [open, setOpen] = useState(false);
  const detail = playerHint(supported);
  const detailId = useId();
  const hintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (!hintRef.current || hintRef.current.getClientRects().length === 0) return;
      event.stopPropagation();
      setOpen(false);
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open]);

  return (
    <div className="video-modal-hint-wrap" ref={hintRef}>
      <p className="video-modal-hint-line">
        <span>{PLAYER_HINT_LINE}</span>
        <button
          type="button"
          className="video-modal-why"
          aria-expanded={open}
          aria-controls={detailId}
          title={detail}
          onClick={() => setOpen((value) => !value)}
        >
          {"Dlaczego?"}
        </button>
      </p>
      <p className="video-modal-hint" id={detailId} hidden={!open}>
        {detail}
      </p>
    </div>
  );
}

function PlayerTools({
  timer,
  wakeSupported,
  keepAwake,
  wakeError,
  showHint,
  onToggleWake,
  onOpenYoutube,
}: {
  timer: {
    choice: SleepOptionId;
    remaining: number | null;
    stopped: boolean;
    menuOpen: boolean;
    onToggleMenu: () => void;
    onSelect: (id: SleepOptionId) => void;
    onCancel: () => void;
  };
  wakeSupported: boolean;
  keepAwake: boolean;
  wakeError: string | null;
  showHint: boolean;
  onToggleWake: () => void;
  onOpenYoutube: () => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const moreId = useId();
  const wakeTitle = wakeSupported ? WAKE_LOCK_TITLE : WAKE_LOCK_UNSUPPORTED_TITLE;
  const wakeLabel = wakeLockButtonLabel(wakeSupported && keepAwake);
  const toolsActive = timer.choice !== "off" || timer.stopped || keepAwake || Boolean(wakeError);

  useEffect(() => {
    if (!moreOpen) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".video-modal-secondary") || target.closest(".video-modal-aux")) return;
      setMoreOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [moreOpen]);

  useEffect(() => {
    if (!moreOpen || timer.menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (!toolsRef.current || toolsRef.current.getClientRects().length === 0) return;
      event.stopPropagation();
      setMoreOpen(false);
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [moreOpen, timer.menuOpen]);

  return (
    <div className="video-modal-tools" ref={toolsRef}>
      <button
        type="button"
        className="video-modal-youtube"
        aria-label={`${OPEN_YOUTUBE_LABEL}. ${OPEN_YOUTUBE_TITLE}`}
        title={OPEN_YOUTUBE_TITLE}
        onClick={onOpenYoutube}
      >
        {OPEN_YOUTUBE_LABEL}
      </button>
      <div className="video-modal-aux">
        <button
          type="button"
          className="video-modal-timer-btn video-modal-more-btn"
          aria-expanded={moreOpen}
          aria-controls={moreId}
          aria-label={toolsActive ? "Wi\u0119cej ustawie\u0144 odtwarzania, w\u0142\u0105czone" : "Wi\u0119cej ustawie\u0144 odtwarzania"}
          onClick={() => setMoreOpen((open) => !open)}
        >
          {"\u22ef Wi\u0119cej"}
          {toolsActive && <span className="video-modal-more-dot" aria-hidden="true" />}
        </button>
        {showHint && <PlayerHint supported={wakeSupported} />}
      </div>
      <div className={moreOpen ? "video-modal-secondary is-open" : "video-modal-secondary"} id={moreId}>
        <TimerControls {...timer} />
        <button
          type="button"
          className="video-modal-timer-btn"
          aria-pressed={wakeSupported ? keepAwake : undefined}
          aria-label={`${wakeLabel}. ${wakeTitle}`}
          title={wakeTitle}
          disabled={!wakeSupported}
          onClick={onToggleWake}
        >
          {wakeLabel}
        </button>
        {wakeError && (
          <span className="video-modal-timer-status" role="status">
            {wakeError}
          </span>
        )}
      </div>
    </div>
  );
}

export default function VideoModal({ item, videoId, onClose }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const phoneEmbedRef = useRef(false);
  const shellRequestedRef = useRef(false);
  const redirectingRef = useRef(false);
  const [choice, setChoice] = useState<SleepOptionId>("off");
  const [deadline, setDeadline] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [cover, setCover] = useState(false);
  const [phoneEmbed] = useState(isPhoneEmbed);
  phoneEmbedRef.current = phoneEmbed;
  const ytRef = useRef<YtSnapshot>(EMPTY_YT_SNAPSHOT);
  const seenPlayingRef = useRef(false);
  const finishedRef = useRef(false);
  const haltTimersRef = useRef<number[]>([]);
  const finishRef = useRef<(kind: "pause" | "stop") => void>(() => {});
  const wakeSessionRef = useRef<ReturnType<typeof createWakeLockSession> | null>(null);
  const endedRef = useRef(false);
  const [wakeSupported] = useState(() =>
    typeof navigator !== "undefined" && screenWakeLockSupported(navigator, window.isSecureContext),
  );
  const [keepAwake, setKeepAwake] = useState(false);
  const [wakeError, setWakeError] = useState<string | null>(null);
  const [readyFor, setReadyFor] = useState<string | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const frameReady = readyFor === videoId;

  const iframeSrc = embedSrc(videoId, phoneEmbed);
  const remaining = remainingSeconds(deadline, now);

  const postToPlayer = (message: unknown) => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify(message), YT_TARGET);
  };

  const sendPlayerCommand = (func: string) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    postToPlayer(ytListening(iframe.id));
    postToPlayer(ytCommand(func, iframe.id));
    // Bare command covers players that ignore the widget envelope.
    iframe.contentWindow.postMessage(
      JSON.stringify({ event: "command", func, args: [] }),
      YT_TARGET,
    );
  };

  const clearHaltTimers = () => {
    haltTimersRef.current.forEach((id) => window.clearTimeout(id));
    haltTimersRef.current = [];
  };

  const sendHalt = (kind: "pause" | "stop") => {
    sendPlayerCommand("pauseVideo");
    const retry = window.setTimeout(() => sendPlayerCommand("pauseVideo"), 200);
    const followUp = window.setTimeout(() => {
      const state = ytRef.current.playerState;
      if (kind === "stop" || state !== 2) sendPlayerCommand("stopVideo");
    }, 900);
    haltTimersRef.current.push(retry, followUp);
  };

  finishRef.current = (kind) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    clearHaltTimers();
    setChoice("off");
    setDeadline(null);
    setMenuOpen(false);
    setStopped(true);
    sendHalt(kind);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (menuOpen) {
        setMenuOpen(false);
        return;
      }
      if (cover) {
        setCover(false);
        const doc = document as FullscreenDocument;
        if (currentFullscreenElement()) {
          void (doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
        }
        return;
      }
      onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, cover, menuOpen]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    setChoice("off");
    setDeadline(null);
    setMenuOpen(false);
    setStopped(false);
    setCover(false);
    finishedRef.current = false;
    seenPlayingRef.current = false;
    endedRef.current = false;
    setKeepAwake(false);
    setWakeError(null);
    ytRef.current = EMPTY_YT_SNAPSHOT;
    clearHaltTimers();
  }, [videoId]);

  useEffect(() => () => clearHaltTimers(), []);

  useEffect(() => {
    if (!wakeSupported) return;
    const session = createWakeLockSession(navigator.wakeLock);
    wakeSessionRef.current = session;
    return () => {
      void session.release();
      if (wakeSessionRef.current === session) wakeSessionRef.current = null;
    };
  }, [wakeSupported]);

  useEffect(() => {
    const session = wakeSessionRef.current;
    if (!session) return;
    let cancelled = false;
    const apply = () => {
      const want = shouldHoldWakeLock({
        enabled: keepAwake,
        supported: wakeSupported,
        visible: document.visibilityState === "visible",
        ended: false,
      });
      void session.sync(want).then((result) => {
        if (cancelled) return;
        if (result === "failed") {
          setKeepAwake(false);
          setWakeError(WAKE_LOCK_FAILED);
        }
      });
    };
    apply();
    document.addEventListener("visibilitychange", apply);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", apply);
    };
  }, [keepAwake, wakeSupported]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    let ready = false;
    let tries = 0;
    const listen = () => {
      postToPlayer(ytListening(iframe.id));
      postToPlayer(ytCommand("addEventListener", iframe.id, ["onStateChange"]));
    };
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) return;
      if (!isYouTubeOrigin(event.origin)) return;
      const payload = readYtPayload(event.data);
      ytRef.current = parseYtMessage(payload, ytRef.current);
      if (ytRef.current.playerState === 1) seenPlayingRef.current = true;
      const endedNow = nextPlaybackEnded(endedRef.current, ytRef.current.playerState, seenPlayingRef.current);
      if (endedNow !== endedRef.current) {
        endedRef.current = endedNow;
        if (endedNow) setKeepAwake(false);
      }
      if (payload && typeof payload === "object" && (payload as { event?: string }).event === "onReady") {
        ready = true;
      }
    };
    const retry = window.setInterval(() => {
      if (ready || tries >= 15) {
        window.clearInterval(retry);
        return;
      }
      tries += 1;
      listen();
    }, 500);
    listen();
    iframe.addEventListener("load", listen);
    window.addEventListener("message", onMessage);
    return () => {
      window.clearInterval(retry);
      iframe.removeEventListener("load", listen);
      window.removeEventListener("message", onMessage);
    };
  }, [iframeSrc]);

  useEffect(() => {
    if (deadline === null) return;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (isTimerDue(deadline, current)) finishRef.current("pause");
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    const timeout = window.setTimeout(tick, Math.max(0, deadline - Date.now()));
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [deadline]);

  useEffect(() => {
    if (choice !== "end") return;
    const interval = window.setInterval(() => {
      if (shouldStopAtEnd(ytRef.current, videoId, seenPlayingRef.current)) {
        finishRef.current("stop");
      }
    }, 400);
    return () => window.clearInterval(interval);
  }, [choice, videoId]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest(".video-modal-timer")) return;
      setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [menuOpen]);

  useEffect(() => {
    let timers: number[] = [];
    const schedule = () => {
      const root = document.documentElement;
      root.style.removeProperty("--video-vvw");
      root.style.removeProperty("--video-vvh");
      root.style.removeProperty("--video-vv-top");
      root.style.removeProperty("--video-vv-left");
      timers.forEach((id) => window.clearTimeout(id));
      requestAnimationFrame(syncVisualViewport);
      timers = [window.setTimeout(syncVisualViewport, 60), window.setTimeout(syncVisualViewport, 320)];
    };
    schedule();
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("scroll", schedule);
    screen.orientation?.addEventListener("change", schedule);
    return () => {
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
      screen.orientation?.removeEventListener("change", schedule);
      timers.forEach((id) => window.clearTimeout(id));
      const root = document.documentElement;
      root.style.removeProperty("--video-vvw");
      root.style.removeProperty("--video-vvh");
      root.style.removeProperty("--video-vv-top");
      root.style.removeProperty("--video-vv-left");
    };
  }, []);

  useEffect(() => {
    const onFullscreen = () => {
      syncVisualViewport();
      const fs = currentFullscreenElement();
      const iframe = iframeRef.current;
      if (phoneEmbedRef.current && iframe && fs === iframe && !redirectingRef.current) {
        redirectingRef.current = true;
        setCover(true);
        const doc = document as FullscreenDocument;
        const done = doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.();
        void Promise.resolve(done).finally(() => {
          redirectingRef.current = false;
        });
        return;
      }
      if (!fs && shellRequestedRef.current && !redirectingRef.current) {
        shellRequestedRef.current = false;
        setCover(false);
      }
    };
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("webkitfullscreenchange", onFullscreen);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("webkitfullscreenchange", onFullscreen);
    };
  }, []);

  const label = item.people.length > 0
    ? item.people.map((p) => p.name).join(" \u00b7 ")
    : item.showName || "";

  const enterCover = async () => {
    setCover(true);
    syncVisualViewport();
    if (isIosDevice()) return;
    const player = playerRef.current;
    if (!player) return;
    const node = player as FullscreenElement;
    try {
      shellRequestedRef.current = true;
      if (node.requestFullscreen) await node.requestFullscreen();
      else await node.webkitRequestFullscreen?.();
      try {
        const orientation = screen.orientation as ScreenOrientation & {
          lock?: (next: "any") => Promise<void>;
        };
        await orientation.lock?.("any");
      } catch {
        // Lock is unavailable on iOS and desktop. Android may still rotate once the manifest allows it.
      }
    } catch {
      shellRequestedRef.current = false;
    }
  };

  const exitCover = () => {
    setCover(false);
    shellRequestedRef.current = false;
    const doc = document as FullscreenDocument;
    if (currentFullscreenElement()) {
      void (doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
    }
  };

  const selectSleep = (id: SleepOptionId) => {
    setMenuOpen(false);
    setStopped(false);
    finishedRef.current = false;
    clearHaltTimers();
    if (id === "off") {
      setChoice("off");
      setDeadline(null);
      return;
    }
    if (id === "end") {
      setChoice("end");
      setDeadline(null);
      return;
    }
    const option = SLEEP_OPTIONS.find((itemOption) => itemOption.id === id);
    if (!option || !isTimedOption(option)) return;
    const start = Date.now();
    setNow(start);
    setChoice(id);
    setDeadline(start + option.seconds * 1000);
  };

  const timerProps = {
    choice,
    remaining,
    stopped,
    menuOpen,
    onToggleMenu: () => setMenuOpen((open) => !open),
    onSelect: selectSleep,
    onCancel: () => selectSleep("off"),
  };

  const toggleWake = () => {
    setWakeError(null);
    const session = wakeSessionRef.current;
    if (!wakeSupported || !session) return;
    if (keepAwake) {
      setKeepAwake(false);
      void session.release();
      return;
    }
    void session.request().then((result) => {
      if (result === "held") {
        setKeepAwake(true);
        return;
      }
      if (result === "failed") {
        setKeepAwake(false);
        setWakeError(WAKE_LOCK_FAILED);
      }
    });
  };

  const openOnYoutube = () => {
    openYoutubeWatchInDocument(videoId, document);
  };

  const onHeadingTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!phoneEmbed || cover || event.touches.length !== 1) return;
    const target = event.target;
    if (target instanceof Element && target.closest("button, a, input, textarea")) return;
    const touch = event.touches[0];
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const onHeadingTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start) return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    const dy = touch.clientY - start.y;
    const dx = touch.clientX - start.x;
    if (dy >= 72 && dy > Math.abs(dx) * 1.5) onClose();
  };

  const toolProps = {
    timer: timerProps,
    wakeSupported,
    keepAwake,
    wakeError,
    onToggleWake: toggleWake,
    onOpenYoutube: openOnYoutube,
  };

  return createPortal(
    <div className={cover ? "video-modal is-cover" : "video-modal"} role="dialog" aria-modal="true" aria-label={item.title}>
      <div className="video-modal-backdrop" onClick={onClose} />
      <div className="video-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="video-modal-player" ref={playerRef} aria-busy={!frameReady}>
          <div className={frameReady ? "video-modal-poster is-gone" : "video-modal-poster"} aria-hidden="true">
            <img
              src={youtubePosterUrl(videoId)}
              alt=""
              decoding="async"
              onError={(event) => {
                event.currentTarget.hidden = true;
              }}
            />
            <span className="video-modal-spinner" />
          </div>
          <iframe
            ref={iframeRef}
            id={YT_FRAME_ID}
            className="video-modal-iframe"
            src={iframeSrc}
            title={item.title}
            allow={YT_ALLOW}
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={(event) => {
              if (!event.currentTarget.src.includes(`/embed/${videoId}`)) return;
              setReadyFor(videoId);
            }}
          />
          <div className="video-modal-player-bar">
            <PlayerTools key={`bar-${videoId}`} {...toolProps} showHint={false} />
            <div className="video-modal-actions">
              <button
                type="button"
                className={`${iconBtnClass} video-modal-exit`}
                style={barIconBtnStyle}
                onClick={exitCover}
                aria-label={"Wyjd\u017a z pe\u0142nego ekranu"}
              >
                <CollapseIcon />
              </button>
              <button
                type="button"
                onClick={onClose}
                className={iconBtnClass}
                style={barIconBtnStyle}
                aria-label="Zamknij"
              >
                {"\u00d7"}
              </button>
            </div>
          </div>
        </div>

        <div className="video-modal-meta">
          <div
            className="video-modal-heading"
            onTouchStart={onHeadingTouchStart}
            onTouchEnd={onHeadingTouchEnd}
            onTouchCancel={() => { swipeStartRef.current = null; }}
          >
            <div className="min-w-0">
              <h3
                className="font-extrabold leading-tight line-clamp-2"
                style={{ fontSize: "17px", color: "var(--paper)", letterSpacing: "-.01em" }}
              >
                {item.title}
              </h3>
              {label && (
                <p className="mt-1" style={{ fontSize: "13px", color: "var(--paper-dim)" }}>
                  {label}
                </p>
              )}
            </div>

            <div className="video-modal-actions">
              {phoneEmbed && (
                <button
                  type="button"
                  onClick={() => { void enterCover(); }}
                  className={iconBtnClass}
                  style={iconBtnStyle}
                  aria-label={"Pe\u0142ny ekran"}
                >
                  <ExpandIcon />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className={iconBtnClass}
                style={iconBtnStyle}
                aria-label="Zamknij"
              >
                {"\u00d7"}
              </button>
            </div>
          </div>
          <PlayerTools key={`meta-${videoId}`} {...toolProps} showHint />
        </div>
      </div>
    </div>,
    document.body
  );
}
