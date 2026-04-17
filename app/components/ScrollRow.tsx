"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import type { Item } from "@/lib/data";

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "";
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "";
  try {
    return new Date(dateString).toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

function ScrollCard({ item }: { item: Item }) {
  const label = item.people.length > 0
    ? item.people.map((p) => p.name).join(" \u00b7 ")
    : item.showName || "";

  return (
    <Link
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-neutral-900 rounded-lg overflow-hidden hover:bg-neutral-800 transition-colors w-72 sm:w-80 shrink-0 snap-start"
    >
      {item.thumbnail_url ? (
        <div className="aspect-video bg-neutral-800 overflow-hidden relative">
          <img
            src={item.thumbnail_url}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
          {item.duration_seconds != null && (
            <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
              {formatDuration(item.duration_seconds)}
            </div>
          )}
        </div>
      ) : null}
      <div className="p-3">
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
          {item.categoryName && (
            <span className="px-1.5 py-0.5 bg-neutral-800 rounded text-gray-400">
              {item.categoryName}
            </span>
          )}
          <span>{formatDate(item.published_at)}</span>
        </div>
        <h3 className="font-semibold text-sm leading-tight line-clamp-2">
          {item.title}
        </h3>
        <p className="text-xs text-gray-500 mt-1 truncate">{label}</p>
      </div>
    </Link>
  );
}

export default function ScrollRow({ items }: { items: Item[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, []);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <div className="relative group/scroll">
      {/* Strzalka lewa */}
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-0 bottom-0 z-10 w-10 bg-gradient-to-r from-neutral-950 to-transparent flex items-center justify-center opacity-0 group-hover/scroll:opacity-100 transition-opacity"
        >
          <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white hover:bg-white/40">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </div>
        </button>
      )}

      {/* Strzalka prawa */}
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-0 bottom-0 z-10 w-10 bg-gradient-to-l from-neutral-950 t
