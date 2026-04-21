"use client";

import { useState, useEffect } from "react";

type Props = {
  type: "person" | "show";
  slug: string;
  onToggle?: () => void;
};

const KEYS = { person: "parska_fav_persons", show: "parska_fav_shows" };

export default function HeartButton({ type, slug, onToggle }: Props) {
  const [active, setActive] = useState(false);
  const [pop, setPop] = useState(false);

  useEffect(() => {
    try {
      const arr: string[] = JSON.parse(localStorage.getItem(KEYS[type]) || "[]");
      setActive(arr.includes(slug));
    } catch {}
  }, [type, slug]);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const arr: string[] = JSON.parse(localStorage.getItem(KEYS[type]) || "[]");
      const next = arr.includes(slug) ? arr.filter((s) => s !== slug) : [...arr, slug];
      localStorage.setItem(KEYS[type], JSON.stringify(next));
      setActive((prev) => !prev);
      setPop(true);
      setTimeout(() => setPop(false), 300);
      onToggle?.();
    } catch {}
  };

  return (
    <button
      onClick={toggle}
      aria-label={active ? "Usu\u0144 z ulubionych" : "Dodaj do ulubionych"}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "6px",
        color: active ? "var(--coral)" : "var(--paper-mute)",
        transform: pop ? "scale(1.4)" : "scale(1)",
        transition: "transform 0.2s ease, color 0.15s ease",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 0,
        flexShrink: 0,
      }}
    >
      {active ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      )}
    </button>
  );
}
