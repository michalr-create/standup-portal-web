"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import HeartButton from "@/app/components/HeartButton";
import type { Item } from "@/lib/data";

const PERSON_KEY = "parska_fav_persons";
const SHOW_KEY = "parska_fav_shows";

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

function timeAgo(d: string | null): string {
  if (!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "dzi\u015b";
  if (days === 1) return "wczoraj";
  if (days < 7) return `${days} dni temu`;
  try { return new Date(d).toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return ""; }
}

type FavDetail = { slug: string; name: string };
type ApiResponse = { items: Item[]; people: FavDetail[]; shows: FavDetail[] };

export default function UlubionePage() {
  const [data, setData] = useState<ApiResponse>({ items: [], people: [], shows: [] });
  const [personSlugs, setPersonSlugs] = useState<string[]>([]);
  const [showSlugs, setShowSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    const ps: string[] = JSON.parse(localStorage.getItem(PERSON_KEY) || "[]");
    const ss: string[] = JSON.parse(localStorage.getItem(SHOW_KEY) || "[]");
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
      .then((d: ApiResponse) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [refreshKey]);

  const hasAny = personSlugs.length > 0 || showSlugs.length > 0;

  return (
    <div className="band">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10">
          <div className="mono text-xs uppercase mb-3" style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}>
            Twoje konto
          </div>
          <h1 className="font-black m-0 leading-none mb-2" style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-.025em" }}>
            Ulubione<span className="dot-accent">.</span>
          </h1>
          <p style={{ color: "var(--paper-dim)", fontSize: "15px" }}>
            Zapisane w przegl\u0105darce \u00b7 bez konta
          </p>
        </header>

        {!hasAny && !loading && (
          <div className="text-center py-20" style={{ color: "var(--paper-mute)" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>{"♡"}</div>
            <p className="text-lg">Nie masz jeszcze \u017cadnych ulubionych.</p>
            <p className="mt-2 text-sm">
              Dodaj ulubione klikaj\u0105c serduszko na profilu standupera lub formatu.
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
                Najnowsze tre\u015bci
              </h2>
              {loading ? (
                <div className="text-sm" style={{ color: "var(--paper-mute)" }}>
                  \u0141adowanie\u2026
                </div>
              ) : data.items.length === 0 ? (
                <p style={{ color: "var(--paper-mute)", fontSize: "14px" }}>
                  Brak tre\u015bci dla wybranych ulubionych.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {data.items.map((item) => {
                    const label = item.people.length > 0
                      ? item.people.map((p) => p.name).join(" \u00b7 ")
                      : item.showName || "";
                    return (
                      <a
                        key={item.id}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block vcard"
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
                          <div className="play-overlay"><div className="play-btn" /></div>
                        </div>
                        <div className="pt-3 px-0.5">
                          <h4 className="font-extrabold leading-tight mb-1.5 line-clamp-2" style={{ fontSize: "15px", letterSpacing: "-.01em" }}>
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-2" style={{ color: "var(--paper-dim)", fontSize: "13px" }}>
                            <span>{label}</span>
                            {label && <span style={{ color: "var(--paper-mute)" }}>{"\u00b7"}</span>}
                            <span className="mono" style={{ color: "var(--paper-mute)", fontSize: "11px" }}>
                              {timeAgo(item.published_at)}
                            </span>
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
