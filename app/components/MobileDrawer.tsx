"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { containTab } from "@/lib/focus-trap";

type NavLink = { href: string; label: string };

type Props = {
  navLinks: NavLink[];
  tourLink: NavLink;
  shows: { id: number; name: string; slug: string }[];
};

function withTourLink(navLinks: NavLink[], tourLink: NavLink): NavLink[] {
  if (navLinks.some((link) => link.href === tourLink.href)) return navLinks;
  const favoritesIndex = navLinks.findIndex((link) => link.href === "/ulubione");
  if (favoritesIndex === -1) return [...navLinks, tourLink];
  return [
    ...navLinks.slice(0, favoritesIndex),
    tourLink,
    ...navLinks.slice(favoritesIndex),
  ];
}

const MAX_VISIBLE_SHOWS = 8;

function HeartIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

export default function MobileDrawer({ navLinks, tourLink, shows }: Props) {
  const [open, setOpen] = useState(false);
  const [showsOpen, setShowsOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const showsPanelId = useId();
  const links = withTourLink(navLinks, tourLink);
  const visibleShows = shows.slice(0, MAX_VISIBLE_SHOWS);

  const close = useCallback(() => {
    setOpen(false);
    setShowsOpen(false);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQ.trim();
    if (trimmed) {
      router.push(`/szukaj?q=${encodeURIComponent(trimmed)}`);
      close();
      setSearchQ("");
    }
  };

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    panel.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      }
      containTab(event, panel);
    };

    document.addEventListener("keydown", onKeyDown, true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      (previouslyFocused ?? triggerRef.current)?.focus();
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="lg:hidden min-h-11 min-w-11 w-11 h-11 flex flex-col items-center justify-center gap-1.5"
        aria-label="Menu"
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className="w-5 h-0.5 rounded-full" style={{ background: "var(--paper)" }} />
        <span className="w-5 h-0.5 rounded-full" style={{ background: "var(--paper)" }} />
        <span className="w-3.5 h-0.5 rounded-full" style={{ background: "var(--paper-dim)" }} />
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,.6)" }}
            onClick={close}
            aria-hidden="true"
          />
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            tabIndex={-1}
            className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] overflow-y-auto px-5 pt-4 pb-8 outline-none"
            style={{ background: "var(--ink-2)", borderLeft: "1px solid var(--line)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-black text-xl" style={{ letterSpacing: "-.03em" }}>
                parska<span className="dot-accent">.</span>
              </span>
              <button
                type="button"
                onClick={close}
                className="min-h-11 min-w-11 w-11 h-11 flex items-center justify-center rounded-full"
                style={{ background: "var(--ink-3)" }}
                aria-label="Zamknij"
              >
                <span style={{ color: "var(--paper)" }}>{"\u2715"}</span>
              </button>
            </div>

            <form
              onSubmit={handleSearch}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-6"
              style={{ background: "var(--ink-3)", border: "1px solid var(--line)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: "var(--paper-mute)", flexShrink: 0 }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="search"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Szukaj standuperów, filmów..."
                className="bg-transparent outline-none w-full text-sm placeholder:opacity-40"
                style={{ color: "var(--paper)" }}
              />
            </form>

            <nav aria-label="G\u0142\u00f3wne">
              <ul className="list-none p-0 m-0">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={close}
                      className="flex items-center gap-2 min-h-11 px-3 py-3 rounded-lg text-sm font-semibold transition-colors hover:bg-[var(--ink-3)]"
                      style={{ color: "var(--paper)" }}
                    >
                      {link.href === "/ulubione" && <HeartIcon />}
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div
              className="mt-4 pt-4 space-y-4"
              style={{ borderTop: "1px solid var(--line)" }}
            >
              <div>
                <button
                  type="button"
                  aria-expanded={showsOpen}
                  aria-controls={showsPanelId}
                  onClick={() => setShowsOpen((value) => !value)}
                  className="flex w-full min-h-11 items-center justify-between gap-3 rounded-lg px-3 py-3 text-sm font-semibold hover:bg-[var(--ink-3)]"
                  style={{ color: "var(--paper-dim)" }}
                >
                  <span>Formaty</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className={"shrink-0 transition-transform" + (showsOpen ? " rotate-180" : "")}
                    style={{ color: "var(--paper-mute)" }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {showsOpen && (
                  <ul id={showsPanelId} className="list-none p-0 m-0 pb-1">
                    {visibleShows.map((show) => (
                      <li key={show.id}>
                        <Link
                          href={"/format/" + show.slug}
                          onClick={close}
                          className="flex items-center min-h-11 px-3 py-3 rounded-lg text-sm transition-colors hover:bg-[var(--ink-3)]"
                          style={{ color: "var(--paper-dim)" }}
                        >
                          {show.name}
                        </Link>
                      </li>
                    ))}
                    <li>
                      <Link
                        href="/formaty"
                        onClick={close}
                        className="flex items-center min-h-11 px-3 py-3 rounded-lg text-sm font-semibold transition-colors hover:bg-[var(--ink-3)]"
                        style={{ color: "var(--paper)" }}
                      >
                        {"Wszystkie formaty \u2192"}
                      </Link>
                    </li>
                  </ul>
                )}
              </div>

              <div>
                <h4
                  className="mono text-xs uppercase mb-1 px-3"
                  style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}
                >
                  Osoby
                </h4>
                <Link
                  href="/standuperzy"
                  onClick={close}
                  className="flex items-center min-h-11 px-3 py-3 rounded-lg text-sm font-semibold transition-colors hover:bg-[var(--ink-3)]"
                  style={{ color: "var(--paper)" }}
                >
                  {"Wszyscy standuperzy \u2192"}
                </Link>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
