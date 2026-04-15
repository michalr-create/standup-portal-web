"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
  categories: { id: number; name: string; slug: string }[];
  people: { id: number; name: string; slug: string }[];
  shows: { id: number; name: string; slug: string; category_id: number | null }[];
};

export default function MobileMenu({ categories, people, shows }: Props) {
  const [open, setOpen] = useState(false);

  const showsByCategory = new Map<number, typeof shows>();
  for (const show of shows) {
    if (!show.category_id) continue;
    if (!showsByCategory.has(show.category_id)) {
      showsByCategory.set(show.category_id, []);
    }
    showsByCategory.get(show.category_id)!.push(show);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden p-2 text-white"
        aria-label="Otworz menu"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-neutral-950 border-r border-neutral-800 overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-8">
              <Link href="/" onClick={() => setOpen(false)}>
                <h1 className="text-2xl font-bold">parska</h1>
              </Link>
              <button
                onClick={() => setOpen(false)}
                className="text-white p-1"
                aria-label="Zamknij menu"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <nav className="space-y-6">
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-gray-300 hover:text-white block"
              >
                Wszystko
              </Link>

              {categories.map((cat) => {
                const categoryShows = showsByCategory.get(cat.id) || [];
                return (
                  <div key={cat.id}>
                    <Link
                      href={`/${cat.slug}`}
                      onClick={() => setOpen(false)}
                      className="text-sm font-semibold text-white hover:text-gray-300 block mb-2"
                    >
                      {cat.name}
                    </Link>
                    {cat.slug === "standup" && people.length > 0 && (
                      <ul className="ml-2 space-y-1 max-h-64 overflow-y-auto">
                        {people.map((p) => (
                          <li key={p.id}>
                            <Link
                              href={`/standuper/${p.slug}`}
                              onClick={() => setOpen(false)}
                              className="text-xs text-gray-400 hover:text-white block py-0.5"
                            >
                              {p.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                    {cat.slug !== "standup" && categoryShows.length > 0 && (
                      <ul className="ml-2 space-y-1">
                        {categoryShows.map((s) => (
                          <li key={s.id}>
                            <Link
                              href={`/format/${s.slug}`}
                              onClick={() => setOpen(false)}
                              className="text-xs text-gray-400 hover:text-white block py-0.5"
                            >
                              {s.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
