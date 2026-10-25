"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { Item } from "@/lib/data";

type Props = {
  item: Item;
  videoId: string;
  onClose: () => void;
};

const TIMER_OPTIONS = [
  { label: "15 min", secs: 900 },
  { label: "30 min", secs: 1800 },
  { label: "45 min", secs: 2700 },
  { label: "1 godz", secs: 3600 },
  { label: "2 godz", secs: 7200 },
];

const YT_ALLOW = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen";

const PHONE_LANDSCAPE_QUERY = "(orientation: landscape) and (max-height: 560px) and (pointer: coarse)";

function formatTimer(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
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

const timerBtnStyle: CSSProperties = {
  fontSize: "11px",
  color: "var(--paper-mute)",
  background: "rgba(255,255,255,0.07)",
  padding: "3px 10px",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.1)",
  cursor: "pointer",
  lineHeight: "1.6",
};

const timerOptStyle: CSSProperties = {
  fontSize: "11px",
  color: "var(--paper-dim)",
  background: "rgba(255,255,255,0.08)",
  padding: "3px 10px",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.12)",
  cursor: "pointer",
  lineHeight: "1.6",
};

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
  remaining,
  showOptions,
  onCancel,
  onPick,
  onOpen,
  onCloseOptions,
}: {
  remaining: number | null;
  showOptions: boolean;
  onCancel: () => void;
  onPick: (secs: number) => void;
  onOpen: () => void;
  onCloseOptions: () => void;
}) {
  return (
    <div className="video-modal-timer mt-3 flex items-center gap-2 flex-wrap">
      {remaining !== null ? (
        <>
          <span className="mono" style={{ fontSize: "12px", color: "var(--paper-dim)" }}>
            {"\u23f1 Wy\u0142\u0105czy si\u0119 za "}{formatTimer(remaining)}
          </span>
          <button type="button" onClick={onCancel} style={timerBtnStyle}>
            Anuluj
          </button>
        </>
      ) : showOptions ? (
        <>
          {TIMER_OPTIONS.map((opt) => (
            <button key={opt.secs} type="button" onClick={() => onPick(opt.secs)} style={timerOptStyle}>
              {opt.label}
            </button>
          ))}
          <button
            type="button"
            onClick={onCloseOptions}
            style={{ fontSize: "13px", color: "var(--paper-mute)", padding: "2px 4px", cursor: "pointer" }}
          >
            {"\u2715"}
          </button>
        </>
      ) : (
        <button type="button" onClick={onOpen} style={timerBtnStyle}>
          {"\u23f1 Wy\u0142\u0105cznik czasowy"}
        </button>
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
  const [remaining, setRemaining] = useState<number | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [cover, setCover] = useState(false);
  const [phoneEmbed] = useState(isPhoneEmbed);
  phoneEmbedRef.current = phoneEmbed;

  const params = new URLSearchParams({
    autoplay: "1",
    playsinline: "1",
    enablejsapi: "1",
  });
  if (phoneEmbed) params.set("fs", "0");
  const iframeSrc = `https://www.youtube.com/embed/${videoId}?${params.toString()}`;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
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
  }, [onClose, cover]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    setRemaining(null);
    setShowOptions(false);
    setCover(false);
  }, [videoId]);

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

  useEffect(() => {
    if (remaining === null) return;
    if (remaining <= 0) {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
        "*"
      );
      setRemaining(null);
      return;
    }
    const id = setTimeout(() => setRemaining((r) => (r !== null ? r - 1 : null)), 1000);
    return () => clearTimeout(id);
  }, [remaining]);

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

  const timerProps = {
    remaining,
    showOptions,
    onCancel: () => setRemaining(null),
    onPick: (secs: number) => { setRemaining(secs); setShowOptions(false); },
    onOpen: () => setShowOptions(true),
    onCloseOptions: () => setShowOptions(false),
  };

  return createPortal(
    <div className={cover ? "video-modal is-cover" : "video-modal"} role="dialog" aria-modal="true" aria-label={item.title}>
      <div className="video-modal-backdrop" onClick={onClose} />
      <div className="video-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="video-modal-player" ref={playerRef}>
          <iframe
            ref={iframeRef}
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
