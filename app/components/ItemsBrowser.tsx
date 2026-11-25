"use client";

import { useState } from "react";
import type { Item } from "@/lib/data";
import VideoModal from "./VideoModal";
import HeartButton from "./HeartButton";
import { itemDisplayTitle } from "@/lib/display-title";
import { resolveContentOpen } from "@/lib/youtube";
import CardByline from "./CardByline";
import HighlightedText from "./HighlightedText";
import ContentCardAction from "./ContentCardAction";
import SpecialProgramLink from "./SpecialProgramLink";
import PaidBadge from "./PaidBadge";
import ThumbDuration from "./ThumbDuration";
import WatchLaterButton from "./WatchLaterButton";
import AdminMaterialActions from "./AdminMaterialActions";
import {
  DEFAULT_GRID_CLASS,
  DEFAULT_THUMB_ASPECT,
  SHORTS_GRID_CLASS,
  SHORTS_THUMB_ASPECT,
  resolveItemsBrowserVariant,
  type ItemsBrowserVariant,
} from "./itemsBrowserLayout";

export default function ItemsBrowser({
  items,
  variant,
  highlight,
  showCategoryBadge = true,
}: {
  items: Item[];
  variant?: ItemsBrowserVariant;
  highlight?: string;
  /** Mixed grids keep the chip. Single-category listings pass false. */
  showCategoryBadge?: boolean;
}) {
  const layout = resolveItemsBrowserVariant(items, variant);
  const [modal, setModal] = useState<{ item: Item; videoId: string } | null>(null);

  const handleClick = (item: Item) => {
    const target = resolveContentOpen(item);
    if (target?.type === "modal") {
      setModal({ item, videoId: target.videoId });
    } else if (target?.type === "external") {
      window.open(target.url, "_blank", "noopener,noreferrer");
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4">{"\uD83C\uDFA4"}</div>
        <p style={{ color: "var(--paper-mute)" }}>Brak tre{"\u015b"}ci w tej kategorii.</p>
      </div>
    );
  }

  return (
    <>
      <div className={layout === "shorts" ? SHORTS_GRID_CLASS : DEFAULT_GRID_CLASS}>
        {items.map((item) => {
          const solePerson = item.people.length === 1 ? item.people[0] : null;
          const title = itemDisplayTitle(item);

          return (
            <article key={item.id} className="group vcard relative text-left w-full min-w-0">
              <ContentCardAction
                isPaid={item.is_paid}
                url={item.url}
                slug={item.slug}
                onOpen={() => handleClick(item)}
              >
                <div
                  className="overflow-hidden relative"
                  style={{
                    aspectRatio: layout === "shorts" ? SHORTS_THUMB_ASPECT : DEFAULT_THUMB_ASPECT,
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
                    {highlight ? <HighlightedText text={title} query={highlight} /> : title}
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
