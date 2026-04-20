"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { Item } from "@/lib/data";

type Props = {
  item: Item;
  videoId: string;
  onClose: () => void;
};

export default function VideoModal({ item, videoId, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const label = item.people.length > 0
    ? item.people.map((p) => p.name).join(" \u00b7 ")
    : item.showName || "";

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
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
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
