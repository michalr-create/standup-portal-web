"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Item } from "@/lib/data";

function formatDate(dateString: string | null): string {
  if (!dateString) return "";
  try {
    return new Date(dateString).toLocaleDateString("pl-PL", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function ItemCard({ item }: { item: Item }) {
  // Etykieta: nazwy person albo nazwa showa
  const label =
    item.people.length > 0
      ? item.people.map((p) => p.name).join(" · ")
      : item.showName || "";

  return (
    <Link
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-neutral-900 rounded-lg overflow-hidden hover:bg-neutral-800 transition-colors"
    >
      {item.thumbnail_url ? (
        <div className="aspect-video bg-neutral-800 overflow-hidden relative">
          <img
            src={item.thumbnail_url}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        </div>
      {item.duration_seconds != null && (
            <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
              {item.duration_seconds >= 3600
                ? `${Math.floor(item.duration_seconds / 3600)}:${String(Math.floor((item.duration_seconds % 3600) / 60)).padStart(2, "0")}:${String(item.duration_seconds % 60).padStart(2, "0")}`
                : `${Math.floor(item.duration_seconds / 60)}:${String(item.duration_seconds % 60).padStart(2, "0")}`}
            </div>
          )}
      ) : null}
      <div className="p-4">
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
          {item.categoryName && (
            <span className="px-2 py-0.5 bg-neutral-800 rounded-full">
              {item.categoryName}
            </span>
          )}
          {item.showName && (
            <span className="text-gray-500">{item.showName}</span>
          )}
        </div>
        <h2 className="font-semibold text-base lg:text-lg leading-tight mb-2 line-clamp-2">
          {item.title}
        </h2>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="truncate">{label}</span>
          <span className="shrink-0 ml-2">{formatDate(item.published_at)}</span>
        </div>
      </div>
    </Link>
  );
}

type Props = {
  items: Item[];
  showFilters?: boolean;
};

export default function ItemsBrowser({ items, showFilters = true }: Props) {
  const [search, setSearch] = useState("");

  // Lista unikalnych standuperów obecnych we wpisach (do filtrów)
  const uniquePeople = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      for (const p of item.people) {
        map.set(p.slug, p.name);
      }
    }
    return Array.from(map.entries()).map(([slug, name]) => ({ slug, name }));
  }, [items]);

  const [activePersonSlug, setActivePersonSlug] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    const searchLower = search.trim().toLowerCase();
    return items.filter((item) => {
      if (activePersonSlug) {
        const has = item.people.some((p) => p.slug === activePersonSlug);
        if (!has) return false;
      }
      if (searchLower) {
        const haystack = [
          item.title,
          item.showName || "",
          ...item.people.map((p) => p.name),
        ].join(" ").toLowerCase();
        if (!haystack.includes(searchLower)) return false;
      }
      return true;
    });
  }, [items, search, activePersonSlug]);

  return (
    <div>
      {showFilters && (
        <div className="mb-8 space-y-4">
          <input
            type="text"
            placeholder="Szukaj po tytule, standuperze, formacie..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-neutral-500"
          />
          {uniquePeople.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActivePersonSlug(null)}
                className={
                  activePersonSlug === null
                    ? "px-3 py-1 rounded-full text-sm bg-white text-black"
                    : "px-3 py-1 rounded-full text-sm bg-neutral-800 text-gray-300 hover:bg-neutral-700"
                }
              >
                Wszyscy
              </button>
              {uniquePeople.map((p) => (
                <button
                  key={p.slug}
                  onClick={() => setActivePersonSlug(p.slug)}
                  className={
                    activePersonSlug === p.slug
                      ? "px-3 py-1 rounded-full text-sm bg-white text-black"
                      : "px-3 py-1 rounded-full text-sm bg-neutral-800 text-gray-300 hover:bg-neutral-700"
                  }
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {filteredItems.length === 0 ? (
        <div className="text-gray-400 text-center py-20">
          Nic nie znaleziono.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
