"use client";

import { useRef, useState, useEffect } from "react";
import type { Item } from "@/lib/data";
import VideoModal from "./VideoModal";
import HeartButton from "./HeartButton";
import { useWatchHistory } from "../hooks/useWatchHistory";
import { resolveContentOpen } from "@/lib/youtube";
import { formatDuration } from "@/lib/format";
import CardByline from "./CardByline";
import ContentCardAction from "./ContentCardAction";
import PaidBadge from "./PaidBadge";

function ScrollCard({
  item,
  isWatched,
  onClick,
}: {
  item: Item;
  isWatched: boolean;
  onClick: () => void;
}) {
  const solePerson = item.people.length === 1 ? item.people[0] : null;

  return (
    <article className="group vcard relative text-left w-72 sm:w-80 shrink-0 snap-start min-w-0">
      <ContentCardAction isPaid={item.is_paid} url={item.url} onOpen={onClick}>
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
          {item.is_paid && <PaidBadge />}
          {isWatched && (
            <div
              className={`absolute top-2.5 w-6 h-6 rounded-full flex items-center justify-center ${solePerson ? "right-16" : "right-2.5"}`}
              style={{ background: "var(--coral)", fontSize: "12px", color: "#fff", fontWeight: 700 }}
            >
              {"✓"}
            </div>
          )}
          {!item.is_paid && (
            <div className="play-overlay">
              <div className="play-btn" />
            </div>
          )}
        </div>

        <div className="pt-3 px-0.5">
          <h4
            className="font-extrabold leading-tight line-clamp-2"
            style={{ fontSize: "16px", letterSpacing: "-.01em" }}
          >
            {item.title}
          </h4>
        </div>
      </ContentCardAction>
      {solePerson && (
        <div className="absolute top-1 right-1 z-20">
          <HeartButton type="person" slug={solePerson.slug} name={solePerson.name} size={15} overlay />
        </div>
      )}
      <CardByline item={item} className="mt-1" />
    </article>
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
    const target = resolveContentOpen(item);
    if (target?.type === "modal") {
      markWatched(item.url);
      setModal({ item, videoId: target.videoId });
    } else if (target?.type === "external") {
      window.open(target.url, "_blank", "noopener,noreferrer");
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

        {/* pb-6 holds the compact byline heart's 44px hit slop inside this
            overflow-x scroller (overflow-y computes to auto and would clip it). */}
        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-6 scrollbar-hide"
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
