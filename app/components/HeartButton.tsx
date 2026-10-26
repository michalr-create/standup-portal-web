"use client";

import { useState, useEffect } from "react";

type Props = {
  type: "person" | "show";
  slug: string;
  onToggle?: () => void;
  size?: number;
  inactiveColor?: string;
  /** Frosted disc for the corner of a thumbnail. Icon stays small; the button is the tap target. */
  overlay?: boolean;
  /**
   * Multi-author byline. Glyph stays on a 20px box in normal flow.
   * The 44px tap target is `.heart-btn-compact::before` and does not stretch the row.
   * Header and thumbnail hearts leave this off.
   */
  compact?: boolean;
  /** Used in the accessible name when the control sits away from the visible label. */
  name?: string;
};

const KEYS = { person: "parska_fav_persons", show: "parska_fav_shows" };

const buttonClass = [
  "heart-btn",
  "inline-flex items-center justify-center shrink-0",
  "rounded-full border-0 bg-transparent p-0",
  "cursor-pointer leading-none",
].join(" ");

/** Header, list, and thumbnail hearts: the border box itself is the 44px target. */
const tapClass = "min-h-11 min-w-11 h-11 w-11";

/** Byline glyph. Hit slop lives on ::before so this box can sit inside h-5. */
const compactClass = "heart-btn-compact relative h-5 w-5 min-h-5 min-w-5";

export default function HeartButton({
  type,
  slug,
  onToggle,
  size = 20,
  inactiveColor,
  overlay = false,
  compact = false,
  name,
}: Props) {
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

  const label = name
    ? active
      ? `Usu\u0144 ${name} z ulubionych`
      : `Dodaj ${name} do ulubionych`
    : active
      ? "Usu\u0144 z ulubionych"
      : "Dodaj do ulubionych";

  const color = active
    ? "var(--coral)"
    : (inactiveColor ?? (overlay ? "rgba(11,11,11,.72)" : "var(--paper-mute)"));

  const inline = compact && !overlay;

  return (
    <button
      type="button"
      onClick={toggle}
      onPointerDown={(e) => e.stopPropagation()}
      aria-pressed={active}
      aria-label={label}
      className={`${buttonClass} ${inline ? compactClass : tapClass}`}
      style={{ color }}
    >
      <span
        className={overlay ? "heart-btn-disc grid h-8 w-8 place-items-center rounded-full" : "grid place-items-center"}
        style={{ transform: pop ? "scale(1.35)" : "scale(1)" }}
      >
        {active ? (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        ) : (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        )}
      </span>
    </button>
  );
}
