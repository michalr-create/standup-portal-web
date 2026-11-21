"use client";

import type { MouseEvent } from "react";
import Link from "next/link";

const TRAP_ID = "header-search-keyboard-trap";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]";

// iOS opens the keyboard only for focus() inside the tap. A temporary field
// keeps that gesture alive across the navigation; the search page then moves
// focus to #szukaj-q and removes the trap.
function primeMobileKeyboard() {
  document.getElementById(TRAP_ID)?.remove();
  const trap = document.createElement("input");
  trap.id = TRAP_ID;
  trap.type = "text";
  trap.setAttribute("aria-hidden", "true");
  trap.tabIndex = -1;
  trap.autocomplete = "off";
  trap.style.cssText =
    "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;border:0;padding:0;margin:0;font-size:16px;";
  document.body.appendChild(trap);
  trap.focus({ preventScroll: true });
}

function onSearchClick(event: MouseEvent<HTMLAnchorElement>) {
  primeMobileKeyboard();
  const onEmptySearch = window.location.pathname === "/szukaj" && window.location.search === "";
  if (!onEmptySearch) return;
  const input = document.getElementById("szukaj-q");
  if (!(input instanceof HTMLInputElement)) return;
  event.preventDefault();
  input.focus();
  document.getElementById(TRAP_ID)?.remove();
}

export default function HeaderSearchLink() {
  return (
    <Link
      href="/szukaj"
      aria-label="Szukaj"
      onClick={onSearchClick}
      className={`inline-flex h-11 w-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[var(--ink-3)] ${focusRing}`}
      style={{ color: "var(--paper)" }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    </Link>
  );
}
