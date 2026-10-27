"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import HeartButton from "@/app/components/HeartButton";
import VideoModal from "@/app/components/VideoModal";
import CardByline from "@/app/components/CardByline";
import { useWatchHistory } from "@/app/hooks/useWatchHistory";
import { resolveContentOpen } from "@/lib/youtube";
import type { Item } from "@/lib/data";
import ContentCardAction from "@/app/components/ContentCardAction";
import PaidBadge from "@/app/components/PaidBadge";
import ThumbDuration from "@/app/components/ThumbDuration";
import FavoriteTours from "./FavoriteTours";
import { eventsForFavoritePeople, type FavoriteUpcomingEvent } from "@/lib/events";

const PERSON_KEY = "parska_fav_persons";
const SHOW_KEY = "parska_fav_shows";

type FavDetail = { slug: string; name: string };
type ApiResponse = {
  items: Item[];
  people: FavDetail[];
  shows: FavDetail[];
  upcoming_events: FavoriteUpcomingEvent[];
};

function readSlugs(key: string): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((slug): slug is string => typeof slug === "string");
  } catch {
    return [];
  }
}

export default function UlubionePage() {
  const [data, setData] = useState<ApiResponse>({ items: [], people: [], shows: [], upcoming_events: [] });
  const [personSlugs, setPersonSlugs] = useState<string[]>([]);
  const [showSlugs, setShowSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [modal, setModal] = useState<{ item: Item; videoId: string } | null>(null);
  const { watched, markWatched } = useWatchHistory();

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const handleClick = (item: Item) => {
    const target = resolveContentOpen(item);
    if (target?.type === "modal") {
      markWatched(item.url);
      setModal({ item, videoId: target.videoId });
    } else if (target?.type === "external") {
      window.open(target.url, "_blank", "noopener,noreferrer");
    }
  };

  useEffect(() => {
    const ps = readSlugs(PERSON_KEY);
    const ss = readSlugs(SHOW_KEY);
    setPersonSlugs(ps);
    setShowSlugs(ss);

    if (ps.length === 0 && ss.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ person_slugs: ps, show_slugs: ss }),
    })
      .then((r) => r.json())
      .then((d: ApiResponse) => {
        setData({
          items: d?.items ?? [],
          people: d?.people ?? [],
          shows: d?.shows ?? [],
          upcoming_events: Array.isArray(d?.upcoming_events) ? d.upcoming_events : [],
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [refreshKey]);

  const hasAny = personSlugs.length > 0 || showSlugs.length > 0;
  const upcomingEvents = eventsForFavoritePeople(data.upcoming_events, personSlugs);

  return (
    <>
    <div className="band">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10">
          <div className="mono text-xs uppercase mb-3" style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}>
            Lokalnie w przeglądarce
          </div>
          <h1 className="font-black m-0 leading-none mb-2" style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-.025em" }}>
            Ulubione<span className="dot-accent">.</span>
          </h1>
          <p style={{ color: "var(--paper-dim)", fontSize: "15px" }}>
            Zapisane w przeglądarce · bez logowania
          </p>
        </header>

        {!hasAny && !loading && (
          <div className="text-center py-20" style={{ color: "var(--paper-mute)" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>{"♡"}</div>
            <p className="text-lg">Nie masz jeszcze żadnych ulubionych.</p>
            <p className="mt-2 text-sm">
              Dodaj ulubione klikając serduszko na profilu standupera lub formatu.
            </p>
            <div className="flex gap-4 justify-center mt-6">
              <Link href="/standuperzy" className="chip">Standuperzy</Link>
              <Link href="/formaty" className="chip">Formaty</Link>
            </div>
          </div>
        )}

        {hasAny && (
          <>
            {/* Obserwowane osoby */}
            {(personSlugs.length > 0 || data.people.length > 0) && (
              <section className="mb-10">
                <h2 className="font-black mb-4" style={{ fontSize: "18px", letterSpacing: "-.01em" }}>
                  Obserwowane osoby
                  <span className="mono text-xs font-normal ml-3" style={{ color: "var(--paper-mute)", letterSpacing: ".1em" }}>
                    {personSlugs.length}
                  </span>
                </h2>
                <div className="flex flex-wrap gap-2">
                  {data.people.map((p) => (
                    <div
                      key={p.slug}
                      className="flex items-center gap-1 pl-3 pr-1 py-1 rounded-full"
                      style={{ background: "var(--ink-3)", border: "1px solid var(--line-2)" }}
                    >
                      <Link
                        href={`/standuper/${p.slug}`}
                        className="text-sm font-semibold hover:text-white transition-colors"
                        style={{ color: "var(--paper-dim)" }}
                      >
                        {p.name}
                      </Link>
                      <HeartButton type="person" slug={p.slug} onToggle={refresh} />
                    </div>
                  ))}
                  {loading && personSlugs.map((s) => (
                    <div
                      key={s}
                      className="flex items-center px-3 py-1 rounded-full"
                      style={{ background: "var(--ink-3)", border: "1px solid var(--line-2)", color: "var(--paper-mute)", fontSize: "13px" }}
                    >
                      {s}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {personSlugs.length > 0 && (
              <FavoriteTours loading={loading} events={upcomingEvents} />
            )}

            {/* Obserwowane formaty */}
            {(showSlugs.length > 0 || data.shows.length > 0) && (
              <section className="mb-10">
                <h2 className="font-black mb-4" style={{ fontSize: "18px", letterSpacing: "-.01em" }}>
                  Obserwowane formaty
                  <span className="mono text-xs font-normal ml-3" style={{ color: "var(--paper-mute)", letterSpacing: ".1em" }}>
                    {showSlugs.length}
                  </span>
                </h2>
                <div className="flex flex-wrap gap-2">
                  {data.shows.map((s) => (
                    <div
                      key={s.slug}
                      className="flex items-center gap-1 pl-3 pr-1 py-1 rounded-full"
                      style={{ background: "var(--ink-3)", border: "1px solid var(--line-2)" }}
                    >
                      <Link
                        href={`/format/${s.slug}`}
                        className="text-sm font-semibold hover:text-white transition-colors"
                        style={{ color: "var(--paper-dim)" }}
                      >
                        {s.name}
                      </Link>
                      <HeartButton type="show" slug={s.slug} onToggle={refresh} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Najnowsze treści */}
            <section>
              <h2 className="font-black mb-6" style={{ fontSize: "18px", letterSpacing: "-.01em" }}>
                Najnowsze treści
              </h2>
              {loading ? (
                <div className="text-sm" style={{ color: "var(--paper-mute)" }}>
                  Ładowanie…
                </div>
              ) : data.items.length === 0 ? (
                <p style={{ color: "var(--paper-mute)", fontSize: "14px" }}>
                  Brak treści dla wybranych ulubionych.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {data.items.map((item) => {
                    const isWatched = watched.has(item.url);
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
                            {item.is_paid && <PaidBadge url={item.url} />}
                            {isWatched && (
                              <div
                                className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center"
                                style={{ background: "var(--coral)", fontSize: "12px", color: "#fff", fontWeight: 700 }}
                              >
                                {"✓"}
                              </div>
                            )}
                            {!item.is_paid && (
                              <div className="play-overlay"><div className="play-btn" /></div>
                            )}
                          </div>
                          <div className="pt-3 px-0.5">
                            <h4 className="font-extrabold leading-tight line-clamp-2" style={{ fontSize: "16px", letterSpacing: "-.01em" }}>
                              {item.title}
                            </h4>
                          </div>
                        </ContentCardAction>
                        <CardByline item={item} />
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
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
