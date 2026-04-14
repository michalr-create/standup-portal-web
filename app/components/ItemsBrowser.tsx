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
  return (
    <Link
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-neutral-900 rounded-lg overflow-hidden hover:bg-neutral-800 transition-colors"
    >
      {item.thumbnail_url ? (
        <div className="aspect-video bg-neutral-800 overflow-hidden">
          <img
            src={item.thumbnail_url}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        </div>
      ) : null}
      <div className="p-4">
        <div className="text-xs text-gray-500 mb-1">{item.comedianName}</div>
        <h2 className="font-semibold text-lg leading-tight mb-2 line-clamp-2">
          {item.title}
        </h2>
        <div className="text-xs text-gray-500">
          {formatDate(item.published_at)}
        </div>
      </div>
    </Link>
  );
}

type Props = {
  items: Item[];
  comedians: { name: string; slug: string }[];
  showFilters?: boolean;
};

export default function ItemsBrowser({ items, comedians, showFilters = true }: Props) {
  const [search, setSearch] = useState("");
  const [activeComedian, setActiveComedian] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    const searchLower = search.trim().toLowerCase();
    return items.filter((item) => {
      if (activeComedian && item.comedianSlug !== activeComedian) return false;
      if (searchLower && !item.title.toLowerCase().includes(searchLower)) return false;
      return true;
    });
  }, [items, search, activeComedian]);

  return (
    <div>
      {showFilters && (
        <div className="mb-8 space-y-4">
          <input
            type="text"
            placeholder="Szukaj po tytule..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-neutral-500"
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveComedian(null)}
              className={
                activeComedian === null
                  ? "px-3 py-1 rounded-full text-sm bg-white text-black"
                  : "px-3 py-1 rounded-full text-sm bg-neutral-800 text-gray-300 hover:bg-neutral-700"
              }
            >
              Wszyscy
            </button>
            {comedians.map((c) => (
              <button
                key={c.slug}
                onClick={() => setActiveComedian(c.slug)}
                className={
                  activeComedian === c.slug
                    ? "px-3 py-1 rounded-full text-sm bg-white text-black"
                    : "px-3 py-1 rounded-full text-sm bg-neutral-800 text-gray-300 hover:bg-neutral-700"
                }
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {filteredItems.length === 0 ? (
        <div className="text-gray-400 text-center py-20">
          Nic nie znaleziono.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
