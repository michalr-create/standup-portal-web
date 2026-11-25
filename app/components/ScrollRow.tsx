"use client";

import { useRef, useState, useEffect } from "react";
import type { Item } from "@/lib/data";
import VideoModal from "./VideoModal";
import HeartButton from "./HeartButton";
import { itemDisplayTitle } from "@/lib/display-title";
import { IMAGE_SIZE, contentThumbnailAlt } from "@/lib/image-alt";
import { resolveContentOpen } from "@/lib/youtube";
import {
  isCenterSnap,
  nextScrollCardIndex,
  scrollLeftByPage,
  scrollLeftToCenter,
} from "@/lib/scroll-row";
import CardByline from "./CardByline";
import ContentCardAction from "./ContentCardAction";
import SpecialProgramLink from "./SpecialProgramLink";
import PaidBadge from "./PaidBadge";
import ThumbDuration from "./ThumbDuration";
import SizedImage from "./SizedImage";
import WatchLaterButton from "./WatchLaterButton";
import AdminMaterialActions from "./AdminMaterialActions";

function ScrollCard({
  item,
  onClick,
  showCategoryBadge,
}: {
  item: Item;
  onClick: () => void;
  showCategoryBadge: boolean;
}) {
  const solePerson = item.people.length === 1 ? item.people[0] : null;
  const title = itemDisplayTitle(item);
  const alt = contentThumbnailAlt({ title, people: item.people, showName: item.showName });

  return (
    <article
      data-scroll-card
      className="scroll-row-card group vcard relative text-left w-72 sm:w-80 shrink-0 snap-center md:snap-start min-w-0"
    >
      <ContentCardAction isPaid={item.is_paid} url={item.url} slug={item.slug} onOpen={onClick}>
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
            <SizedImage
              src={item.thumbnail_url}
              alt={alt}
              width={IMAGE_SIZE.thumbLandscape.width}
              height={IMAGE_SIZE.thumbLandscape.height}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          )}
          <ThumbDuration seconds={item.duration_seconds} isPaid={item.is_paid} />
          {showCategoryBadge && (
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
      <div className={item.is_paid && item.slug ? "mt-2 flex flex-wrap items-center gap-x-3 gap-y-1" : "mt-2"}>
        <WatchLaterButton itemId={item.id} title={title} />
        {item.is_paid && item.slug ? <SpecialProgramLink slug={item.slug} /> : null}
      </div>
      <AdminMaterialActions itemId={item.id} />
      <CardByline item={item} className="mt-1" />
    </article>
  );
}

function ScrollArrow({
  direction,
  label,
  onClick,
}: {
  direction: "left" | "right";
  label: string;
  onClick: () => void;
}) {
  return (
    <div className={`scroll-arrow scroll-arrow-${direction}`}>
      <button type="button" aria-label={label} className="scroll-arrow-btn" onClick={onClick}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          {direction === "left" ? (
            <polyline points="15 18 9 12 15 6" />
          ) : (
            <polyline points="9 6 15 12 9 18" />
          )}
        </svg>
      </button>
    </div>
  );
}

export default function ScrollRow({
  items,
  showCategoryBadge = false,
}: {
  items: Item[];
  /** Mixed rows (home Nowe) show the category chip. Other rows leave it off. */
  showCategoryBadge?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [modal, setModal] = useState<{ item: Item; videoId: string } | null>(null);

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
    const cards = [...el.querySelectorAll<HTMLElement>("[data-scroll-card]")];
    const snapAlign = cards[0] ? getComputedStyle(cards[0]).scrollSnapAlign : "start";
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (!isCenterSnap(snapAlign) || cards.length === 0) {
      const left = scrollLeftByPage({
        scrollLeft: el.scrollLeft,
        clientWidth: el.clientWidth,
        maxScroll,
        direction,
      });
      el.scrollTo({ left, behavior: "smooth" });
      return;
    }
    const port = el.getBoundingClientRect();
    const portCenter = port.left + port.width / 2;
    const centers = cards.map((card) => {
      const box = card.getBoundingClientRect();
      return box.left + box.width / 2;
    });
    const index = nextScrollCardIndex(centers, portCenter, direction);
    const cardCenter = centers[index] ?? portCenter;
    const left = scrollLeftToCenter({
      scrollLeft: el.scrollLeft,
      cardCenter,
      portCenter,
      maxScroll,
    });
    el.scrollTo({ left, behavior: "smooth" });
  };

  const handleClick = (item: Item) => {
    const target = resolveContentOpen(item);
    if (target?.type === "modal") {
      setModal({ item, videoId: target.videoId });
    } else if (target?.type === "external") {
      window.open(target.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <>
      <div className="relative group/scroll">
        {canScrollLeft && (
          <ScrollArrow direction="left" label="Poprzednie" onClick={() => scroll("left")} />
        )}

        {canScrollRight && (
          <ScrollArrow direction="right" label={"Nast\u0119pne"} onClick={() => scroll("right")} />
        )}

        {/* 22px holds the compact byline heart's 44px hit slop inside this
            overflow-x scroller (overflow-y computes to auto and would clip it).
            The ::before hangs 1.25rem below the glyph, which sits a fraction
            below the meta row, so pb-4 would crop the target. lg keeps pb-6.
            Phone centering (82vw card, snap center, side gutters) is in
            globals.css on .scroll-row. md+ keeps w-72/w-80 and snap-start. */}
        <div
          ref={scrollRef}
          className="scroll-row flex gap-5 overflow-x-auto snap-x snap-mandatory pb-[22px] lg:pb-6 scrollbar-hide"
        >
          {items.map((item) => (
            <ScrollCard
              key={item.id}
              item={item}
              onClick={() => handleClick(item)}
              showCategoryBadge={showCategoryBadge}
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
