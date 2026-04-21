"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

type Props = {
  categories: { id: number; name: string; slug: string }[];
  shows: { id: number; name: string; slug: string }[];
  people: { id: number; name: string; slug: string }[];
};

export default function MobileDrawer({ categories, shows, people }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden w-9 h-9 flex flex-col items-center justify-center gap-1.5"
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
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] overflow-y-auto p-6"
            style={{ background: "var(--ink-2)", borderLeft: "1px solid var(--line)" }}
          >
            <div className="flex items-center justify-between mb-8">
              <span className="font-black text-xl" style={{ letterSpacing: "-.03em" }}>
                parska<span className="dot-accent">.</span>
              </span>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full"
                style={{ background: "var(--ink-3)" }}
              >
                <span style={{ color: "var(--paper)" }}>{"✕"}</span>
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h4
                  className="mono text-xs uppercase mb-3"
                  style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}
                >
                  Kategorie
                </h4>
                <ul className="space-y-1">
                  {categories.map((cat) => (
                    <li key={cat.slug}>
                      <Link
                        href={`/${cat.slug}`}
                        onClick={() => setOpen(false)}
                        className="block px-3 py-2 rounded-lg text-sm font-semibold transition-colors hover:bg-[var(--ink-3)]"
                        style={{ color: "var(--paper-dim)" }}
                      >
                        {cat.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4
                  className="mono text-xs uppercase mb-3"
                  style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}
                >
                  Formaty
                </h4>
                <ul className="space-y-1">
                  {shows.map((show) => (
                    <li key={show.slug}>
                      <Link
                        href={`/format/${show.slug}`}
                        onClick={() => setOpen(false)}
                        className="block px-3 py-2 rounded-lg text-sm transition-colors hover:bg-[var(--ink-3)]"
                        style={{ color: "var(--paper-dim)" }}
                      >
                        {show.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4
                  className="mono text-xs uppercase mb-3"
                  style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}
                >
                  Standuperzy
                </h4>
                <ul className="space-y-1">
                  {people.map((p) => (
                    <li key={p.slug}>
                      <Link
                        href={`/standuper/${p.slug}`}
                        onClick={() => setOpen(false)}
                        className="block px-3 py-2 rounded-lg text-sm transition-colors hover:bg-[var(--ink-3)]"
                        style={{ color: "var(--paper-dim)" }}
                      >
                        {p.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
