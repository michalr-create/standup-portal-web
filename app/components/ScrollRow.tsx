"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import type { Item } from "@/lib/data";
import VideoModal from "./VideoModal";
import HeartButton from "./HeartButton";
import { useWatchHistory } from "../hooks/useWatchHistory";
import { getYouTubeId } from "@/lib/youtube";

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

function timeAgo(dateString: string | null): string {
  if (!dateString) return "";
  const diff = Date.now() - new Date(dateString).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "teraz";
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "wczoraj";
  if (days < 7) return `${days}d`;
  try {
    return new Date(dateString).toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

function ScrollCard({
  item,
  isWatched,
  onClick,
}: {
  item: Item;
  isWatched: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group block vcard text-left w-72 sm:w-80 shrink-0 snap-start"
    >
      <div
        className="overflow-hidden relative"
        style={{
          aspectRatio: "16/10",
          borderRadius: "14px",
          border: "1px solid var(--line)",
          background: "var(--ink-3)",
        }}
      >
        {item.thumbnail_url && (
          <img
            src={item.thumbnail_url}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            style={{ opacity: isWatched ? 0.7 : 1 }}
          />
        )}
        {item.duration_seconds != null && (
          <div
            className="absolute bottom-2.5 right-2.5 mono px-2 py-1 rounded-md"
            style={{ background: "rgba(11,11,11,.8)", color: "var(--paper)", fontSize: "11px" }}
          >
            {formatDuration(item.duration_seconds)}
          </div>
        )}
        {isWatched && (
          <div
            className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: "var(--coral)", fontSize: "12px", color: "#fff", fontWeight: 700 }}
          >
            {"✓"}
          </div>
        )}
        <div className="play-overlay">
          <div className="play-btn" />
        </div>
      </div>

      <div className="pt-3 px-0.5">
        <h4
          className="font-extrabold leading-tight mb-1 line-clamp-2"
          style={{ fontSize: "16px", letterSpacing: "-.01em" }}
        >
          {item.title}
        </h4>
        <div
          className="flex items-center gap-1 flex-wrap"
          style={{ color: "var(--paper-dim)", fontSize: "13px" }}
        >
          {item.people.length > 0 ? (
            item.people.map((p, i) => (
              <span key={p.slug} className="flex items-center gap-0.5">
                {i > 0 && <span style={{ color: "var(--paper-mute)" }}>{"\u00b7"}</span>}
                <Link
                  href={"/standuper/" + p.slug}
                  onClick={(e) => e.stopPropagation()}
                  className="hover:text-white transition-colors"
                >
                  {p.name}
                </Link>
                <HeartButton type="person" slug={p.slug} size={13} />
              </span>
            ))
          ) : (
            <span>{item.showName || ""}</span>
          )}
          {(item.people.length > 0 || item.showName) && (
            <span style={{ color: "var(--paper-mute)" }}>{"\u00b7"}</span>
          )}
          <span className="mono" style={{ color: "var(--paper-mute)", fontSize: "11px" }}>
            {timeAgo(item.published_at)}
          </span>
        </div>
      </div>
    </button>
  );
}

const arrowBtnLeft = [
  "absolute left-0 top-0 bottom-0 z-10 w-12",
  "flex items-center justify-center",
  "opacity-0 group-hover/scroll:opacity-100 transition-opacity",
].join(" ");

const arrowBtnRight = [
  "absolute right-0 top-0 bottom-0 z-10 w-12",
  "flex items-center justify-center",
  "opacity-0 group-hover/scroll:opacity-100 transition-opacity",
].join(" ");

export default function ScrollRow({ items }: { items: Item[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [modal, setModal] = useState<{ item: Item; videoId: string } | null>(null);
  const { watched, markWatched } = useWatchHistory();

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

  const handleClick = (item: Item) => {
    const videoId = getYouTubeId(item.url);
    if (videoId) {
      markWatched(item.url);
      setModal({ item, videoId });
    } else {
      window.open(item.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <>
      <div className="relative group/scroll">
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className={arrowBtnLeft}
            style={{ background: "linear-gradient(to right, var(--ink), transparent)" }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
              style={{ background: "rgba(239,232,220,.15)", backdropFilter: "blur(4px)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </div>
          </button>
        )}

        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className={arrowBtnRight}
            style={{ background: "linear-gradient(to left, var(--ink), transparent)" }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
              style={{ background: "rgba(239,232,220,.15)", backdropFilter: "blur(4px)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 6 15 12 9 18" />
              </svg>
            </div>
          </button>
        )}

        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide"
        >
          {items.map((item) => (
            <ScrollCard
              key={item.id}
              item={item}
              isWatched={watched.has(item.url)}
              onClick={() => handleClick(item)}
            />
          ))}
        </div>
      </div>
      {modal && (
        <VideoModal
          item={modal.item}
          videoId={modal.videoId}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
