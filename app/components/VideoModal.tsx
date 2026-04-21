"use client";

import { useEffect, useRef, useState } from "react";
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

function formatTimer(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function VideoModal({ item, videoId, onClose }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    setRemaining(null);
    setShowOptions(false);
  }, [videoId]);

  // Countdown tick — uses setTimeout so each tick re-schedules itself
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

  const timerBtnStyle: React.CSSProperties = {
    fontSize: "11px",
    color: "var(--paper-mute)",
    background: "rgba(255,255,255,0.07)",
    padding: "3px 10px",
    borderRadius: "999px",
    border: "1px solid rgba(255,255,255,0.1)",
    cursor: "pointer",
    lineHeight: "1.6",
  };

  const timerOptStyle: React.CSSProperties = {
    fontSize: "11px",
    color: "var(--paper-dim)",
    background: "rgba(255,255,255,0.08)",
    padding: "3px 10px",
    borderRadius: "999px",
    border: "1px solid rgba(255,255,255,0.12)",
    cursor: "pointer",
    lineHeight: "1.6",
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(10px)" }}
      onClick={onClose}
    >
      <div
        className="w-full"
        style={{ maxWidth: "900px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="overflow-hidden"
          style={{ aspectRatio: "16/9", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <iframe
            ref={iframeRef}
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`}
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
            style={{ width: "100%", height: "100%", border: "none", display: "block" }}
          />
        </div>

        <div className="mt-4 flex items-start justify-between gap-4">
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

            {/* Sleep timer */}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {remaining !== null ? (
                <>
                  <span className="mono" style={{ fontSize: "12px", color: "var(--paper-dim)" }}>
                    {"⏱ Wy\u0142\u0105czy si\u0119 za "}{formatTimer(remaining)}
                  </span>
                  <button onClick={() => setRemaining(null)} style={timerBtnStyle}>
                    Anuluj
                  </button>
                </>
              ) : showOptions ? (
                <>
                  {TIMER_OPTIONS.map((opt) => (
                    <button
                      key={opt.secs}
                      onClick={() => { setRemaining(opt.secs); setShowOptions(false); }}
                      style={timerOptStyle}
                    >
                      {opt.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowOptions(false)}
                    style={{ fontSize: "13px", color: "var(--paper-mute)", padding: "2px 4px", cursor: "pointer" }}
                  >
                    {"✕"}
                  </button>
                </>
              ) : (
                <button onClick={() => setShowOptions(true)} style={timerBtnStyle}>
                  {"⏱ Wy\u0142\u0105cznik czasowy"}
                </button>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "rgba(255,255,255,0.1)", color: "var(--paper)", fontSize: "20px", lineHeight: "1" }}
            aria-label="Zamknij"
          >
            {"×"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
