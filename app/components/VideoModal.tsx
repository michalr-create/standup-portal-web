"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { Item } from "@/lib/data";
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

const iconBtnStyle: CSSProperties = {
  background: "rgba(255,255,255,0.1)",
  color: "var(--paper)",
};

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
    ytRef.current = EMPTY_YT_SNAPSHOT;
    clearHaltTimers();
  }, [videoId]);

  useEffect(() => () => clearHaltTimers(), []);

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

  return createPortal(
    <div className={cover ? "video-modal is-cover" : "video-modal"} role="dialog" aria-modal="true" aria-label={item.title}>
      <div className="video-modal-backdrop" onClick={onClose} />
      <div className="video-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="video-modal-player" ref={playerRef}>
          <iframe
            ref={iframeRef}
            id={YT_FRAME_ID}
            className="video-modal-iframe"
            src={iframeSrc}
            title={item.title}
            allow={YT_ALLOW}
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
          <div className="video-modal-player-bar">
            <TimerControls {...timerProps} />
            <div className="video-modal-actions">
              <button
                type="button"
                className="video-modal-exit shrink-0 w-9 h-9 rounded-full items-center justify-center"
                style={barIconBtnStyle}
                onClick={exitCover}
                aria-label={"Wyjd\u017a z pe\u0142nego ekranu"}
              >
                <CollapseIcon />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
                style={{ ...barIconBtnStyle, fontSize: "20px", lineHeight: "1" }}
                aria-label="Zamknij"
              >
                {"\u00d7"}
              </button>
            </div>
          </div>
        </div>

        <div className="video-modal-meta">
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
            <TimerControls {...timerProps} />
          </div>

          <div className="video-modal-actions">
            {phoneEmbed && (
              <button
                type="button"
                onClick={() => { void enterCover(); }}
                className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
                style={iconBtnStyle}
                aria-label={"Pe\u0142ny ekran"}
              >
                <ExpandIcon />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ ...iconBtnStyle, fontSize: "20px", lineHeight: "1" }}
              aria-label="Zamknij"
            >
              {"\u00d7"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
