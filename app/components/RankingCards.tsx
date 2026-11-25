"use client";

import { useState } from "react";
import type { Item } from "@/lib/data";
import { itemDisplayTitle } from "@/lib/display-title";
import { resolveContentOpen } from "@/lib/youtube";
import { DEFAULT_GRID_CLASS } from "./itemsBrowserLayout";
import VideoModal from "./VideoModal";
import HeartButton from "./HeartButton";
import CardByline from "./CardByline";
import ContentCardAction from "./ContentCardAction";
import SpecialProgramLink from "./SpecialProgramLink";
import PaidBadge from "./PaidBadge";
import ThumbDuration from "./ThumbDuration";
import WatchLaterButton from "./WatchLaterButton";

export type RankingCardModel = {
  item: Item;
  rank: number;
  viewsLabel: string | null;
  detail: string | null;
  year: number | null;
};

const rankBadgeClass = [
  "absolute top-2.5 left-2.5 z-20 grid h-8 min-w-8 place-items-center",
  "rounded-full px-2 font-black pointer-events-none",
].join(" ");

export default function RankingCards({
  entries,
  layout = "grid",
  showCategoryBadge = true,
}: {
  entries: RankingCardModel[];
  layout?: "grid" | "strip";
  showCategoryBadge?: boolean;
}) {
  const [modal, setModal] = useState<{ item: Item; videoId: string } | null>(null);

  const handleClick = (item: Item) => {
    const target = resolveContentOpen(item);
    if (target?.type === "modal") {
      setModal({ item, videoId: target.videoId });
    } else if (target?.type === "external") {
      window.open(target.url, "_blank", "noopener,noreferrer");
    }
  };

  if (entries.length === 0) return null;

  const cards = entries.map((entry) => {
    const item = entry.item;
    const solePerson = item.people.length === 1 ? item.people[0] : null;
    const title = itemDisplayTitle(item);
    const showRank = entry.rank > 0;
    const articleClass = layout === "strip"
      ? "group vcard relative text-left w-72 sm:w-80 shrink-0 snap-start min-w-0"
      : "group vcard relative text-left w-full min-w-0";

    return (
      <article key={item.id} className={articleClass}>
        <ContentCardAction isPaid={item.is_paid} url={item.url} slug={item.slug} onOpen={() => handleClick(item)}>
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
                alt={title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            )}
            <ThumbDuration seconds={item.duration_seconds} isPaid={item.is_paid} />
            {showRank && (
              <span
                className={rankBadgeClass}
                style={{ background: "var(--coral)", color: "var(--ink)", fontSize: "14px" }}
              >
                <span className="sr-only">{"Miejsce "}</span>
                {entry.rank}
              </span>
            )}
            {showCategoryBadge && (
              <div
                className={`absolute top-2.5 ${showRank ? "left-12" : "left-2.5"} flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold`}
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
            )}
            {entry.year != null && !item.is_paid && (
              <span
                className="absolute bottom-2.5 left-2.5 z-10 mono px-2 py-1 rounded-md pointer-events-none"
                style={{ background: "rgba(11,11,11,.8)", color: "var(--paper)", fontSize: "12px", fontWeight: 700 }}
              >
                {entry.year}
              </span>
            )}
            {item.is_paid && <PaidBadge url={item.url} />}
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
              {title}
            </h4>
          </div>
        </ContentCardAction>
        {solePerson && (
          <div className="absolute top-1 right-1 z-20">
            <HeartButton type="person" slug={solePerson.slug} name={solePerson.name} size={15} overlay />
          </div>
        )}
        {(entry.year != null || entry.viewsLabel || entry.detail) && (
          <p className="mono mt-1.5 px-0.5 text-[13px] leading-5" style={{ color: "var(--paper-dim)" }}>
            {entry.year != null && (
              <span className="font-bold" style={{ color: "var(--coral)" }}>{entry.year}</span>
            )}
            {entry.year != null && (entry.viewsLabel || entry.detail) && (
              <span style={{ color: "var(--paper-meta)" }}>{" \u00b7 "}</span>
            )}
            {entry.viewsLabel && <span>{entry.viewsLabel}</span>}
            {entry.detail && (
              <span>
                {entry.viewsLabel ? " \u00b7 " : ""}
                <span style={{ color: "var(--paper)" }}>{entry.detail}</span>
              </span>
            )}
          </p>
        )}
        <div className={item.is_paid && item.slug ? "mt-2 flex flex-wrap items-center gap-x-3 gap-y-1" : "mt-2"}>
          <WatchLaterButton itemId={item.id} title={title} />
          {item.is_paid && item.slug ? <SpecialProgramLink slug={item.slug} /> : null}
        </div>
        <CardByline item={item} />
      </article>
    );
  });

  return (
    <>
      {layout === "strip" ? (
        <div className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-[22px] lg:pb-6 scrollbar-hide">
          {cards}
        </div>
      ) : (
        <div className={DEFAULT_GRID_CLASS}>{cards}</div>
      )}
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
