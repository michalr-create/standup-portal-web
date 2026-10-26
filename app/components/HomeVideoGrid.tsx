"use client";

import { useState } from "react";
import type { Item } from "@/lib/data";
import VideoModal from "./VideoModal";
import HeartButton from "./HeartButton";
import { useWatchHistory } from "../hooks/useWatchHistory";
import { resolveContentOpen } from "@/lib/youtube";
import CardByline from "./CardByline";
import ContentCardAction from "./ContentCardAction";
import PaidBadge from "./PaidBadge";
import ThumbDuration from "./ThumbDuration";

export default function HomeVideoGrid({ items }: { items: Item[] }) {
  const { watched, markWatched } = useWatchHistory();
  const [modal, setModal] = useState<{ item: Item; videoId: string } | null>(null);

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {items.map((item) => {
          const isWatched = watched.has(item.url);

          const solePerson = item.people.length === 1 ? item.people[0] : null;

          return (
            <article key={item.id} className="group vcard relative text-left w-full min-w-0">
              <ContentCardAction
                isPaid={item.is_paid}
                url={item.url}
                onOpen={() => handleClick(item)}
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
                  <ThumbDuration seconds={item.duration_seconds} isPaid={item.is_paid} />
                  <div
                    className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold"
                    style={{
                      background: "rgba(11,11,11,.75)",
                      backdropFilter: "blur(6px)",
                      color: "var(--paper)",
                      fontSize: "11px",
                    }}
                  >
                    <span className="inline-block w-2 h-2 rounded-sm" style={{ background: "var(--coral)" }} />
                    {item.categoryName || "YouTube"}
                  </div>
                  {item.is_paid && <PaidBadge url={item.url} />}
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
              <CardByline item={item} />
            </article>
          );
        })}
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
